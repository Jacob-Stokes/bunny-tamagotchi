// Inventory and equipment type definitions

export type SlotType = 'head' | 'face' | 'upper_body' | 'lower_body' | 'feet' | 'accessory';

export type RarityType = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface StatEffects {
  connection?: number;
  stimulation?: number;
  comfort?: number;
  energy?: number;
  curiosity?: number;
  whimsy?: number;
  melancholy?: number;
  wisdom?: number;
}

export interface Item {
  id: string; // e.g., "red_beanie"
  name: string; // e.g., "Cozy Red Beanie"
  slot: SlotType;
  category: string; // e.g., "hat", "glasses", "shirt"
  item_type: string; // e.g., "beanie", "sunglasses", "tshirt"
  rarity: RarityType;
  description?: string;
  image_url?: string;
  stat_effects: StatEffects;
  cost: number;
  is_purchaseable: boolean;
  is_starter_item: boolean;
  created_at: string;
}

export interface BunnyInventoryItem {
  id: string;
  bunny_id: string;
  item_id: string;
  quantity: number;
  acquired_at: string;
  // Joined item data
  item?: Item;
}

export interface BunnyEquipment {
  id: string;
  bunny_id: string;
  item_id: string;
  slot: SlotType;
  equipped_at: string;
  // Joined item data
  item?: Item;
}

// Full equipment state for a bunny
export interface BunnyEquipmentState {
  head?: BunnyEquipment;
  face?: BunnyEquipment;
  upper_body?: BunnyEquipment;
  lower_body?: BunnyEquipment;
  feet?: BunnyEquipment;
  accessory?: BunnyEquipment;
}

// Inventory with equipment state
export interface BunnyFullInventory {
  inventory: BunnyInventoryItem[];
  equipment: BunnyEquipmentState;
  totalStatEffects: StatEffects;
}

// For item management
export interface ItemFilter {
  slot?: SlotType;
  category?: string;
  rarity?: RarityType;
  is_purchaseable?: boolean;
}

// Database insert/update types
export interface ItemInsert {
  id: string;
  name: string;
  slot: SlotType;
  category: string;
  item_type: string;
  rarity?: RarityType;
  description?: string;
  image_url?: string;
  stat_effects?: StatEffects;
  cost?: number;
  is_purchaseable?: boolean;
  is_starter_item?: boolean;
}

export interface InventoryInsert {
  bunny_id: string;
  item_id: string;
  quantity?: number;
}

export interface EquipmentInsert {
  bunny_id: string;
  item_id: string;
  slot: SlotType;
}