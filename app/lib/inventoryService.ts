import { supabase, isSupabaseConfigured } from './supabase';
import { 
  Item, 
  BunnyInventoryItem, 
  BunnyEquipment, 
  BunnyEquipmentState, 
  BunnyFullInventory, 
  StatEffects,
  SlotType,
  ItemFilter,
  InventoryInsert,
  EquipmentInsert 
} from '../types/inventory';

export class InventoryService {
  // Get all available items (with optional filtering)
  static async getItems(filter?: ItemFilter): Promise<Item[]> {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase is not configured');
    }

    try {
      let query = supabase.from('items').select('*');

      if (filter?.slot) query = query.eq('slot', filter.slot);
      if (filter?.category) query = query.eq('category', filter.category);
      if (filter?.rarity) query = query.eq('rarity', filter.rarity);
      if (filter?.is_purchaseable !== undefined) query = query.eq('is_purchaseable', filter.is_purchaseable);

      const { data, error } = await query.order('name');

      if (error) throw error;
      
      // Parse JSON stat_effects for each item
      const items = (data || []).map(item => ({
        ...item,
        stat_effects: typeof item.stat_effects === 'string' ? 
          JSON.parse(item.stat_effects) : 
          item.stat_effects || {}
      }));
      
      return items;
    } catch (error) {
      console.error('Error fetching items:', error);
      throw error;
    }
  }

  // Get a specific item by ID
  static async getItem(itemId: string): Promise<Item | null> {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase is not configured');
    }

    try {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('id', itemId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('Error fetching item:', error);
      throw error;
    }
  }

  // Get bunny's full inventory (owned items + equipped items + calculated stat effects)
  static async getBunnyFullInventory(bunnyId: string): Promise<BunnyFullInventory> {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase is not configured');
    }

    try {
      // Get inventory with item details
      const { data: inventoryData, error: invError } = await supabase
        .from('bunny_inventory')
        .select(`
          *,
          item:items(*)
        `)
        .eq('bunny_id', bunnyId);

      if (invError) throw invError;

      // Get equipment with item details
      const { data: equipmentData, error: equipError } = await supabase
        .from('bunny_equipment')
        .select(`
          *,
          item:items(*)
        `)
        .eq('bunny_id', bunnyId);

      if (equipError) throw equipError;
      
      console.log('Raw equipment data from database:', JSON.stringify(equipmentData, null, 2));

      // Process inventory
      const inventory: BunnyInventoryItem[] = inventoryData?.map(item => ({
        id: item.id,
        bunny_id: item.bunny_id,
        item_id: item.item_id,
        quantity: item.quantity,
        acquired_at: item.acquired_at,
        item: item.item ? {
          ...item.item,
          stat_effects: typeof item.item.stat_effects === 'string' ? 
            JSON.parse(item.item.stat_effects) : 
            item.item.stat_effects || {}
        } : null
      })) || [];

      // Process equipment into slot-based structure
      const equipment: BunnyEquipmentState = {};
      const equipmentArray: BunnyEquipment[] = equipmentData?.map(eq => {
        try {
          return {
            id: eq.id,
            bunny_id: eq.bunny_id,
            item_id: eq.item_id,
            slot: eq.slot,
            equipped_at: eq.equipped_at,
            item: eq.item ? {
              ...eq.item,
              stat_effects: typeof eq.item.stat_effects === 'string' ? 
                JSON.parse(eq.item.stat_effects) : 
                eq.item.stat_effects || {}
            } : null
          };
        } catch (parseError) {
          console.error('🔴 Error parsing equipment item:', eq, parseError);
          // Return item without stat_effects if parsing fails
          return {
            id: eq.id,
            bunny_id: eq.bunny_id,
            item_id: eq.item_id,
            slot: eq.slot,
            equipped_at: eq.equipped_at,
            item: eq.item ? {
              ...eq.item,
              stat_effects: {}
            } : null
          };
        }
      }) || [];

      // Organize equipment by slot
      equipmentArray.forEach(eq => {
        equipment[eq.slot] = eq;
      });

      // Calculate total stat effects from equipped items
      const totalStatEffects: StatEffects = {};
      equipmentArray.forEach(eq => {
        if (eq.item?.stat_effects) {
          Object.entries(eq.item.stat_effects).forEach(([stat, value]) => {
            const currentValue = totalStatEffects[stat as keyof StatEffects] || 0;
            totalStatEffects[stat as keyof StatEffects] = currentValue + (value as number);
          });
        }
      });

      return {
        inventory,
        equipment,
        totalStatEffects
      };
    } catch (error) {
      console.error('Error fetching bunny inventory:', error);
      throw error;
    }
  }

  // Add item to bunny's inventory
  static async addItemToInventory(bunnyId: string, itemId: string, quantity: number = 1): Promise<BunnyInventoryItem> {
    console.log('🟢 InventoryService.addItemToInventory called:', { bunnyId, itemId, quantity });
    
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase is not configured');
    }

    try {
      // Check if item already exists in inventory
      const { data: existing } = await supabase
        .from('bunny_inventory')
        .select('*')
        .eq('bunny_id', bunnyId)
        .eq('item_id', itemId)
        .maybeSingle();

      if (existing) {
        // Update existing quantity
        const { data, error } = await supabase
          .from('bunny_inventory')
          .update({ quantity: existing.quantity + quantity })
          .eq('id', existing.id)
          .select('*, item:items(*)')
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insert new inventory item
        const insertData: InventoryInsert = { bunny_id: bunnyId, item_id: itemId, quantity };
        const { data, error } = await supabase
          .from('bunny_inventory')
          .insert(insertData)
          .select('*, item:items(*)')
          .single();

        if (error) throw error;
        return data;
      }
    } catch (error) {
      console.error('Error adding item to inventory:', error);
      throw error;
    }
  }

  // Equip an item (must be in inventory)
  static async equipItem(bunnyId: string, itemId: string): Promise<BunnyEquipment> {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase is not configured');
    }

    try {
      console.log('Equipping item:', itemId, 'for bunny:', bunnyId);
      
      // First, verify the item exists and get its slot
      const item = await this.getItem(itemId);
      if (!item) throw new Error('Item not found');
      
      console.log('Item found:', item.name, 'slot:', item.slot);

      // Verify bunny owns this item
      const { data: inventoryItem } = await supabase
        .from('bunny_inventory')
        .select('*')
        .eq('bunny_id', bunnyId)
        .eq('item_id', itemId)
        .maybeSingle();

      console.log('Inventory check result:', inventoryItem);

      if (!inventoryItem) {
        console.log('Bunny does not own this item - need to add to inventory first');
        throw new Error('Bunny does not own this item');
      }

      // Unequip any existing item in this slot
      await supabase
        .from('bunny_equipment')
        .delete()
        .eq('bunny_id', bunnyId)
        .eq('slot', item.slot);

      // Equip the new item
      const equipData: EquipmentInsert = {
        bunny_id: bunnyId,
        item_id: itemId,
        slot: item.slot
      };

      const { data, error } = await supabase
        .from('bunny_equipment')
        .insert(equipData)
        .select('*, item:items(*)')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error equipping item:', error);
      throw error;
    }
  }

  // Unequip an item from a slot
  static async unequipSlot(bunnyId: string, slot: SlotType): Promise<void> {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase is not configured');
    }

    try {
      const { error } = await supabase
        .from('bunny_equipment')
        .delete()
        .eq('bunny_id', bunnyId)
        .eq('slot', slot);

      if (error) throw error;
    } catch (error) {
      console.error('Error unequipping slot:', error);
      throw error;
    }
  }

  // Remove item from inventory (e.g., when sold or consumed)
  static async removeItemFromInventory(bunnyId: string, itemId: string, quantity: number = 1): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase is not configured');
    }

    try {
      const { data: existing } = await supabase
        .from('bunny_inventory')
        .select('*')
        .eq('bunny_id', bunnyId)
        .eq('item_id', itemId)
        .single();

      if (!existing) return false;

      if (existing.quantity <= quantity) {
        // Remove completely
        const { error } = await supabase
          .from('bunny_inventory')
          .delete()
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Reduce quantity
        const { error } = await supabase
          .from('bunny_inventory')
          .update({ quantity: existing.quantity - quantity })
          .eq('id', existing.id);

        if (error) throw error;
      }

      return true;
    } catch (error) {
      console.error('Error removing item from inventory:', error);
      throw error;
    }
  }
}