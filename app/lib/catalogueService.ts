// Placeholder service for shop catalogues
// TODO: Replace with actual Supabase integration

export interface Catalogue {
  id: string;
  name: string;
  description: string;
  icon: string;
  sortOrder: number;
  isActive: boolean;
}

export interface CatalogueItem {
  id: string;
  catalogueId: string;
  name: string;
  description: string;
  price: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  imageUrl: string;
  category: string;
  slot: string;
}

export class CatalogueService {
  
  // Placeholder catalogues data
  private static catalogues: Catalogue[] = [
    {
      id: 'spring-collection',
      name: 'Spring Collection',
      description: 'Fresh, flowery fashion for the new season',
      icon: '🌸',
      sortOrder: 1,
      isActive: true
    },
    {
      id: 'cozy-collection',
      name: 'Cozy Collection', 
      description: 'Warm and comfortable items for relaxing',
      icon: '☕',
      sortOrder: 2,
      isActive: true
    },
    {
      id: 'adventure-gear',
      name: 'Adventure Gear',
      description: 'Ready for exploration and outdoor fun',
      icon: '🎒',
      sortOrder: 3,
      isActive: true
    },
    {
      id: 'premium-luxe',
      name: 'Premium Luxe',
      description: 'Exclusive high-end items for discerning bunnies',
      icon: '✨',
      sortOrder: 4,
      isActive: true
    }
  ];

  // Placeholder items data
  private static items: CatalogueItem[] = [
    // Spring Collection
    {
      id: 'spring-hat-1',
      catalogueId: 'spring-collection',
      name: 'Daisy Chain Crown',
      description: 'A delicate crown woven with fresh daisies',
      price: 150,
      rarity: 'rare',
      imageUrl: '/items/placeholder-hat.png',
      category: 'hat',
      slot: 'head'
    },
    {
      id: 'spring-dress-1',
      catalogueId: 'spring-collection',
      name: 'Petal Pink Dress',
      description: 'Soft pink dress with embroidered flowers',
      price: 200,
      rarity: 'epic',
      imageUrl: '/items/placeholder-dress.png',
      category: 'dress',
      slot: 'upper_body'
    },
    {
      id: 'spring-shoes-1',
      catalogueId: 'spring-collection',
      name: 'Garden Slippers',
      description: 'Comfortable slippers with tiny flower details',
      price: 75,
      rarity: 'common',
      imageUrl: '/items/placeholder-shoes.png',
      category: 'shoes',
      slot: 'feet'
    },

    // Cozy Collection
    {
      id: 'cozy-sweater-1',
      catalogueId: 'cozy-collection',
      name: 'Chunky Knit Sweater',
      description: 'Ultra-soft oversized sweater in cream',
      price: 180,
      rarity: 'rare',
      imageUrl: '/items/placeholder-sweater.png',
      category: 'sweater',
      slot: 'upper_body'
    },
    {
      id: 'cozy-scarf-1',
      catalogueId: 'cozy-collection',
      name: 'Woolly Scarf',
      description: 'Warm striped scarf in autumn colors',
      price: 90,
      rarity: 'common',
      imageUrl: '/items/placeholder-scarf.png',
      category: 'scarf',
      slot: 'accessory'
    },
    {
      id: 'cozy-slippers-1',
      catalogueId: 'cozy-collection',
      name: 'Fuzzy House Slippers',
      description: 'The comfiest slippers for lounging',
      price: 65,
      rarity: 'common',
      imageUrl: '/items/placeholder-slippers.png',
      category: 'slippers',
      slot: 'feet'
    },

    // Adventure Gear
    {
      id: 'adventure-backpack-1',
      catalogueId: 'adventure-gear',
      name: 'Explorer\'s Backpack',
      description: 'Sturdy pack for all your adventures',
      price: 250,
      rarity: 'epic',
      imageUrl: '/items/placeholder-backpack.png',
      category: 'backpack',
      slot: 'accessory'
    },
    {
      id: 'adventure-boots-1',
      catalogueId: 'adventure-gear',
      name: 'Hiking Boots',
      description: 'Durable boots for rough terrain',
      price: 140,
      rarity: 'rare',
      imageUrl: '/items/placeholder-boots.png',
      category: 'boots',
      slot: 'feet'
    },

    // Premium Luxe
    {
      id: 'luxe-crown-1',
      catalogueId: 'premium-luxe',
      name: 'Royal Crystal Crown',
      description: 'A magnificent crown fit for bunny royalty',
      price: 500,
      rarity: 'legendary',
      imageUrl: '/items/placeholder-crown.png',
      category: 'crown',
      slot: 'head'
    },
    {
      id: 'luxe-cape-1',
      catalogueId: 'premium-luxe',
      name: 'Velvet Royal Cape',
      description: 'Luxurious cape with golden trim',
      price: 400,
      rarity: 'legendary',
      imageUrl: '/items/placeholder-cape.png',
      category: 'cape',
      slot: 'upper_body'
    }
  ];

  /**
   * Get all active catalogues
   */
  static async getCatalogues(): Promise<Catalogue[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    return this.catalogues.filter(cat => cat.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
  }

  /**
   * Get items for a specific catalogue
   */
  static async getCatalogueItems(catalogueId: string): Promise<CatalogueItem[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200));
    return this.items.filter(item => item.catalogueId === catalogueId);
  }

  /**
   * Get a specific item by ID
   */
  static async getItem(itemId: string): Promise<CatalogueItem | null> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return this.items.find(item => item.id === itemId) || null;
  }

  /**
   * Search items across all catalogues
   */
  static async searchItems(query: string): Promise<CatalogueItem[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    const lowercaseQuery = query.toLowerCase();
    return this.items.filter(item => 
      item.name.toLowerCase().includes(lowercaseQuery) ||
      item.description.toLowerCase().includes(lowercaseQuery) ||
      item.category.toLowerCase().includes(lowercaseQuery)
    );
  }

  /**
   * Get items by rarity
   */
  static async getItemsByRarity(rarity: CatalogueItem['rarity']): Promise<CatalogueItem[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return this.items.filter(item => item.rarity === rarity);
  }

  /**
   * Mock purchase function - TODO: integrate with currency system
   */
  static async purchaseItem(itemId: string, bunnyId: string): Promise<{success: boolean, message: string}> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const item = this.items.find(i => i.id === itemId);
    if (!item) {
      return {success: false, message: 'Item not found'};
    }

    // TODO: Check if user has enough currency
    // TODO: Add item to user's inventory
    // TODO: Deduct currency from user
    
    return {success: true, message: `Successfully purchased ${item.name}!`};
  }
}

/**
 * Utility function to get rarity color
 */
export function getRarityColor(rarity: CatalogueItem['rarity']): string {
  switch (rarity) {
    case 'common': return 'text-gray-600';
    case 'rare': return 'text-blue-600';
    case 'epic': return 'text-purple-600';
    case 'legendary': return 'text-yellow-600';
    default: return 'text-gray-600';
  }
}

/**
 * Utility function to get rarity background
 */
export function getRarityBackground(rarity: CatalogueItem['rarity']): string {
  switch (rarity) {
    case 'common': return 'bg-gray-100 border-gray-300';
    case 'rare': return 'bg-blue-50 border-blue-300';
    case 'epic': return 'bg-purple-50 border-purple-300';
    case 'legendary': return 'bg-yellow-50 border-yellow-300';
    default: return 'bg-gray-100 border-gray-300';
  }
}