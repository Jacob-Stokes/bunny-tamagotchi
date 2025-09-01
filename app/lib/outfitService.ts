import { supabase } from './supabase';

export interface Outfit {
  id: string;
  bunny_id: string;
  user_id: string;
  name: string;
  equipped_items: Array<{
    item_id: string;
    slot: string;
    image_url: string;
    name: string;
  }>;
  equipment_signature: string;
  base_bunny: string;
  scene: string;
  image_urls: {
    normal?: string;
    blink?: string;
    smile?: string;
    wave?: string;
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OutfitGenerationLimit {
  id: string;
  user_id: string;
  date: string;
  generations_used: number;
  daily_limit: number;
  created_at: string;
  updated_at: string;
}

export interface CreateOutfitData {
  bunny_id: string;
  name: string;
  equipped_items: Array<{
    item_id: string;
    slot: string;
    image_url: string;
    name: string;
  }>;
  base_bunny: string;
  scene: string;
  image_urls: {
    normal?: string;
    blink?: string;
    smile?: string;
    wave?: string;
  };
}

export class OutfitService {
  static async createOutfit(data: CreateOutfitData): Promise<Outfit> {
    // For now, skip database operations since tables don't exist yet
    // TODO: Implement after running migrations
    console.log('📝 Outfit would be saved to database:', {
      bunny_id: data.bunny_id,
      name: data.name,
      items: data.equipped_items.length
    });

    // Return a mock outfit object with fake user ID
    return {
      id: 'temp-' + Date.now(),
      bunny_id: data.bunny_id,
      user_id: 'temp-user',
      name: data.name,
      equipped_items: data.equipped_items,
      equipment_signature: this.createEquipmentSignature(data.equipped_items, data.base_bunny, data.scene),
      base_bunny: data.base_bunny,
      scene: data.scene,
      image_urls: data.image_urls,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  static async getUserOutfits(bunnyId: string): Promise<Outfit[]> {
    // For now, return empty array since tables don't exist yet
    // TODO: Implement after running migrations
    console.log('📝 Would fetch outfits for bunny:', bunnyId);
    return [];
  }

  static async getActiveOutfit(bunnyId: string): Promise<Outfit | null> {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    const { data: outfit, error } = await supabase
      .from('outfits')
      .select('*')
      .eq('bunny_id', bunnyId)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch active outfit: ${error.message}`);
    }

    return outfit || null;
  }

  static async setActiveOutfit(outfitId: string, bunnyId: string): Promise<void> {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    // Set all outfits for this bunny as inactive
    await supabase
      .from('outfits')
      .update({ is_active: false })
      .eq('bunny_id', bunnyId);

    // Set the selected outfit as active
    const { error } = await supabase
      .from('outfits')
      .update({ is_active: true })
      .eq('id', outfitId);

    if (error) {
      throw new Error(`Failed to set active outfit: ${error.message}`);
    }
  }

  static async deleteOutfit(outfitId: string): Promise<void> {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    const { error } = await supabase
      .from('outfits')
      .delete()
      .eq('id', outfitId);

    if (error) {
      throw new Error(`Failed to delete outfit: ${error.message}`);
    }
  }

  static async checkDailyLimit(userId: string): Promise<boolean> {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    const today = new Date().toISOString().split('T')[0];

    const { data: limit, error } = await supabase
      .from('outfit_generation_limits')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to check daily limit: ${error.message}`);
    }

    if (!limit) {
      // No record exists, user can generate
      return true;
    }

    return limit.generations_used < limit.daily_limit;
  }

  static async getDailyUsage(userId: string): Promise<{ used: number; limit: number }> {
    // For now, return default values since tables don't exist yet
    // TODO: Implement after running migrations
    console.log('📝 Would get daily usage for user:', userId);
    return {
      used: 0,
      limit: 10
    };
  }

  private static async incrementDailyUsage(userId: string): Promise<void> {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    const today = new Date().toISOString().split('T')[0];

    const { error } = await supabase
      .from('outfit_generation_limits')
      .upsert({
        user_id: userId,
        date: today,
        generations_used: 1,
      }, {
        onConflict: 'user_id,date',
        ignoreDuplicates: false
      });

    if (error) {
      // Try to increment existing record
      const { error: updateError } = await supabase
        .rpc('increment_daily_usage', {
          user_id: userId,
          target_date: today
        });

      if (updateError) {
        console.error('Failed to increment daily usage:', updateError);
      }
    }
  }

  private static createEquipmentSignature(
    equippedItems: Array<{ item_id: string; slot: string; image_url: string; name: string }>,
    baseBunny: string,
    scene: string
  ): string {
    const sortedItems = equippedItems
      .sort((a, b) => a.item_id.localeCompare(b.item_id))
      .map(item => item.item_id)
      .join(',');
    
    return `${baseBunny}|${scene}|${sortedItems}`;
  }

  // Favourite methods
  static async getFavouriteOutfits(userId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('outfit_favourites')
        .select('outfit_key')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching favourite outfits:', error);
        return [];
      }

      return data.map(row => row.outfit_key);
    } catch (error) {
      console.error('Error in getFavouriteOutfits:', error);
      return [];
    }
  }

  static async addToFavourites(userId: string, outfitKey: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('outfit_favourites')
        .insert({
          user_id: userId,
          outfit_key: outfitKey
        });

      if (error) {
        console.error('Error adding to favourites:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in addToFavourites:', error);
      return false;
    }
  }

  static async removeFromFavourites(userId: string, outfitKey: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('outfit_favourites')
        .delete()
        .eq('user_id', userId)
        .eq('outfit_key', outfitKey);

      if (error) {
        console.error('Error removing from favourites:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in removeFromFavourites:', error);
      return false;
    }
  }
}