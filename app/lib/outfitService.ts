import { supabase } from './supabase';
import { SlotType } from '../types/inventory';

export interface Outfit {
  id: string;
  bunny_id: string;
  user_id: string;
  name: string;
  equipped_items: Array<{
    item_id: string;
    slot: SlotType;
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
  status: 'pending' | 'generating' | 'completed' | 'failed';
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
    slot: SlotType;
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
  status?: 'pending' | 'generating' | 'completed' | 'failed';
}

export class OutfitService {
  static async createOutfit(data: CreateOutfitData, userId: string): Promise<Outfit> {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    try {
      const equipmentSignature = this.createEquipmentSignature(data.equipped_items, data.base_bunny, data.scene);
      
      const { data: outfit, error } = await supabase
        .from('outfits')
        .insert({
          bunny_id: data.bunny_id,
          user_id: userId,
          name: data.name,
          equipped_items: data.equipped_items,
          equipment_signature: equipmentSignature,
          base_bunny: data.base_bunny,
          scene: data.scene,
          image_urls: data.image_urls,
          is_active: false, // Don't auto-activate, let user choose
          status: data.status || 'completed' // Default to completed for backward compatibility
        })
        .select()
        .single();

      if (error) throw error;
      return outfit;
    } catch (error) {
      console.error('Error creating outfit:', error);
      throw error;
    }
  }

  static async getUserOutfits(bunnyId: string): Promise<Outfit[]> {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    try {
      const { data: outfits, error } = await supabase
        .from('outfits')
        .select('*')
        .eq('bunny_id', bunnyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return outfits || [];
    } catch (error) {
      console.error('Error fetching user outfits:', error);
      throw error;
    }
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

    try {
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

      if (error) throw error;
    } catch (error) {
      console.error('Error setting active outfit:', error);
      throw error;
    }
  }

  static async deleteOutfit(outfitId: string, userId: string): Promise<void> {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    try {
      const { error } = await supabase
        .from('outfits')
        .delete()
        .eq('id', outfitId)
        .eq('user_id', userId); // Ensure user can only delete their own outfits

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting outfit:', error);
      throw error;
    }
  }

  static async updateOutfitStatus(outfitId: string, status: 'pending' | 'generating' | 'completed' | 'failed', imageUrls?: any): Promise<void> {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    try {
      const updateData: any = { status };
      if (imageUrls) {
        updateData.image_urls = imageUrls;
      }

      const { error } = await supabase
        .from('outfits')
        .update(updateData)
        .eq('id', outfitId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating outfit status:', error);
      throw error;
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
      throw new Error(`Failed to get daily usage: ${error.message}`);
    }

    if (!limit) {
      // No record exists yet, user hasn't generated any outfits today
      return {
        used: 0,
        limit: 10
      };
    }

    return {
      used: limit.generations_used,
      limit: limit.daily_limit
    };
  }

  static async incrementDailyUsage(userId: string): Promise<void> {
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

  // Favourite methods (outfit_key is used for generated outfits, outfit_id for saved outfits)
  static async getFavouriteOutfitKeys(userId: string): Promise<string[]> {
    if (!supabase) return [];
    
    try {
      const { data, error } = await supabase
        .from('outfit_favourites')
        .select('outfit_key')
        .eq('user_id', userId)
        .not('outfit_key', 'is', null);

      if (error) {
        console.error('Error fetching favourite outfit keys:', error);
        return [];
      }

      return data?.map(row => row.outfit_key) || [];
    } catch (error) {
      console.error('Error in getFavouriteOutfitKeys:', error);
      return [];
    }
  }

  static async getFavouriteOutfitIds(userId: string): Promise<string[]> {
    if (!supabase) return [];
    
    try {
      const { data, error } = await supabase
        .from('outfit_favourites')
        .select('outfit_id')
        .eq('user_id', userId)
        .not('outfit_id', 'is', null);

      if (error) {
        console.error('Error fetching favourite outfit IDs:', error);
        return [];
      }

      return data?.map(row => row.outfit_id) || [];
    } catch (error) {
      console.error('Error in getFavouriteOutfitIds:', error);
      return [];
    }
  }

  static async addOutfitKeyToFavourites(userId: string, outfitKey: string): Promise<boolean> {
    if (!supabase) return false;
    
    try {
      const { error } = await supabase
        .from('outfit_favourites')
        .insert({
          user_id: userId,
          outfit_key: outfitKey
        });

      if (error && error.code !== '23505') { // Ignore duplicate key errors
        console.error('Error adding outfit key to favourites:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in addOutfitKeyToFavourites:', error);
      return false;
    }
  }

  static async addOutfitIdToFavourites(userId: string, outfitId: string): Promise<boolean> {
    if (!supabase) return false;
    
    try {
      const { error } = await supabase
        .from('outfit_favourites')
        .insert({
          user_id: userId,
          outfit_id: outfitId
        });

      if (error && error.code !== '23505') { // Ignore duplicate key errors
        console.error('Error adding outfit ID to favourites:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in addOutfitIdToFavourites:', error);
      return false;
    }
  }

  static async removeOutfitKeyFromFavourites(userId: string, outfitKey: string): Promise<boolean> {
    if (!supabase) return false;
    
    try {
      const { error } = await supabase
        .from('outfit_favourites')
        .delete()
        .eq('user_id', userId)
        .eq('outfit_key', outfitKey);

      if (error) {
        console.error('Error removing outfit key from favourites:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in removeOutfitKeyFromFavourites:', error);
      return false;
    }
  }

  static async removeOutfitIdFromFavourites(userId: string, outfitId: string): Promise<boolean> {
    if (!supabase) return false;
    
    try {
      const { error } = await supabase
        .from('outfit_favourites')
        .delete()
        .eq('user_id', userId)
        .eq('outfit_id', outfitId);

      if (error) {
        console.error('Error removing outfit ID from favourites:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in removeOutfitIdFromFavourites:', error);
      return false;
    }
  }
}