import { supabase, isSupabaseConfigured } from './supabase';
import { createClient } from '@supabase/supabase-js';
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
  // Get client with service key for equipment queries (bypasses RLS issues)
  private static getServiceClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_KEY;
    
    if (supabaseUrl && serviceKey) {
      return createClient(supabaseUrl, serviceKey);
    }
    
    return supabase;
  }
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
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured');
    }

    try {
      const serviceClient = this.getServiceClient();
      if (!serviceClient) {
        throw new Error('Unable to create Supabase client');
      }
      
      // Get inventory with item details (use regular client for inventory)
      const { data: inventoryData, error: invError } = await supabase!
        .from('bunny_inventory')
        .select(`
          *,
          item:items(*)
        `)
        .eq('bunny_id', bunnyId);

      if (invError) throw invError;

      // Get equipment with item details using service client (bypasses RLS)
      const { data: equipmentData, error: equipError } = await serviceClient
        .from('bunny_equipment')
        .select(`
          *,
          item:items(*)
        `)
        .eq('bunny_id', bunnyId);

      if (equipError) throw equipError;
      

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
      
      // First, verify the item exists and get its slot
      const item = await this.getItem(itemId);
      if (!item) throw new Error('Item not found');
      

      // Verify bunny owns this item
      const { data: inventoryItem } = await supabase
        .from('bunny_inventory')
        .select('*')
        .eq('bunny_id', bunnyId)
        .eq('item_id', itemId)
        .maybeSingle();


      if (!inventoryItem) {
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

  // Shop methods - integrate catalogue functionality
  static async getShopItems(filter?: { category?: string; rarity?: string; maxPrice?: number }): Promise<Item[]> {
    const baseFilter: ItemFilter = { is_purchaseable: true };
    
    if (filter?.category) baseFilter.category = filter.category;
    if (filter?.rarity) baseFilter.rarity = filter.rarity as any;
    
    try {
      const items = await this.getItems(baseFilter);
      
      // Filter by price if specified
      if (filter?.maxPrice !== undefined) {
        return items.filter(item => item.cost <= filter.maxPrice!);
      }
      
      return items;
    } catch (error) {
      console.error('Error fetching shop items:', error);
      throw error;
    }
  }

  static async getShopCategories(): Promise<Array<{ category: string; count: number; icon: string; description: string }>> {
    if (!isSupabaseConfigured || !supabase) {
      // Return placeholder categories for development
      return [
        { category: 'hat', count: 5, icon: '🎩', description: 'Stylish headwear for every occasion' },
        { category: 'shirt', count: 8, icon: '👕', description: 'Comfortable and fashionable tops' },
        { category: 'accessory', count: 6, icon: '✨', description: 'Special items to complete your look' },
        { category: 'shoes', count: 4, icon: '👟', description: 'Step out in style with these shoes' }
      ];
    }

    try {
      const { data, error } = await supabase
        .from('items')
        .select('category')
        .eq('is_purchaseable', true);

      if (error) throw error;

      // Count items by category and add metadata
      const categoryMap = new Map<string, number>();
      data?.forEach(item => {
        categoryMap.set(item.category, (categoryMap.get(item.category) || 0) + 1);
      });

      // Add icons and descriptions for categories
      const categoryInfo: Record<string, { icon: string; description: string }> = {
        hat: { icon: '🎩', description: 'Stylish headwear for every occasion' },
        shirt: { icon: '👕', description: 'Comfortable and fashionable tops' },
        dress: { icon: '👗', description: 'Beautiful dresses for special moments' },
        accessory: { icon: '✨', description: 'Special items to complete your look' },
        shoes: { icon: '👟', description: 'Step out in style with these shoes' },
        glasses: { icon: '🕶️', description: 'See the world with style' },
        scarf: { icon: '🧣', description: 'Cozy accessories for any weather' },
      };

      return Array.from(categoryMap.entries()).map(([category, count]) => ({
        category,
        count,
        icon: categoryInfo[category]?.icon || '📦',
        description: categoryInfo[category]?.description || 'Amazing items await'
      }));
    } catch (error) {
      console.error('Error fetching shop categories:', error);
      throw error;
    }
  }

  static async purchaseItem(bunnyId: string, itemId: string, userId: string): Promise<{ success: boolean; message: string; item?: Item }> {
    if (!isSupabaseConfigured || !supabase) {
      // Mock purchase for development
      return {
        success: true,
        message: 'Item purchased successfully! (Development mode)',
      };
    }

    try {
      // Get item details and verify it's purchaseable
      const item = await this.getItem(itemId);
      if (!item) {
        return { success: false, message: 'Item not found' };
      }

      if (!item.is_purchaseable) {
        return { success: false, message: 'This item is not available for purchase' };
      }

      // TODO: Check if user has enough currency (implement currency system)
      // For now, assume purchase is always successful

      // Add item to bunny's inventory
      await this.addItemToInventory(bunnyId, itemId, 1);

      return {
        success: true,
        message: `Successfully purchased ${item.name}!`,
        item: item
      };
    } catch (error) {
      console.error('Error purchasing item:', error);
      return {
        success: false,
        message: 'Purchase failed. Please try again.'
      };
    }
  }

  // Helper method to check if bunny already owns an item
  static async bunnyOwnsItem(bunnyId: string, itemId: string): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase) {
      return false;
    }

    try {
      const { data, error } = await supabase
        .from('bunny_inventory')
        .select('id')
        .eq('bunny_id', bunnyId)
        .eq('item_id', itemId)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    } catch (error) {
      console.error('Error checking item ownership:', error);
      return false;
    }
  }

  // Transaction support methods for data consistency
  static async applyOutfitWithTransaction(
    bunnyId: string, 
    outfitItems: Array<{item_id: string; slot: SlotType}>
  ): Promise<void> {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase is not configured');
    }

    try {
      // Use PostgreSQL transaction for atomicity
      const { error } = await supabase.rpc('apply_outfit_atomic', {
        p_bunny_id: bunnyId,
        p_outfit_items: JSON.stringify(outfitItems)
      });

      if (error) {
        // Fall back to manual approach if RPC doesn't exist
        console.warn('Transaction RPC not available, using sequential approach');
        await this.applyOutfitSequentially(bunnyId, outfitItems);
      }
    } catch (error) {
      console.error('Error in outfit transaction:', error);
      throw error;
    }
  }

  static async applyOutfitSequentially(
    bunnyId: string, 
    outfitItems: Array<{item_id: string; slot: SlotType}>
  ): Promise<void> {
    // Manual transaction simulation - unequip all first, then equip new items
    const currentEquipment = await this.getBunnyFullInventory(bunnyId);
    const currentSlots = Object.keys(currentEquipment.equipment);

    try {
      // Step 1: Unequip all current items
      for (const slot of currentSlots) {
        await this.unequipSlot(bunnyId, slot as SlotType);
      }

      // Step 2: Equip all new items
      for (const outfitItem of outfitItems) {
        await this.equipItem(bunnyId, outfitItem.item_id);
      }
    } catch (error) {
      // If anything fails, we could try to restore the previous state
      // but for now, we'll just throw the error
      console.error('Error in sequential outfit application:', error);
      throw error;
    }
  }

  // Batch operations for better performance
  static async equipMultipleItems(
    bunnyId: string,
    items: Array<{item_id: string; slot: SlotType}>
  ): Promise<void> {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase is not configured');
    }

    try {
      // Batch insert equipment records
      const equipmentRecords = items.map(item => ({
        bunny_id: bunnyId,
        item_id: item.item_id,
        slot: item.slot
      }));

      const { error } = await supabase
        .from('bunny_equipment')
        .upsert(equipmentRecords, {
          onConflict: 'bunny_id,slot'
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error batch equipping items:', error);
      throw error;
    }
  }
}