import { supabase, isSupabaseConfigured } from './supabase';
import { BunnyStats, StatModification } from '../types/bunny';

export interface DatabaseBunny {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
  connection: number;
  stimulation: number;
  comfort: number;
  energy: number;
  curiosity: number;
  whimsy: number;
  melancholy: number;
  wisdom: number;
}

export class BunnyService {
  // Get user's bunny (creates one if doesn't exist)
  static async getUserBunny(userId: string): Promise<DatabaseBunny> {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase is not configured');
    }
    
    try {
      // First, try to get existing bunny
      const { data: existing, error: fetchError } = await supabase
        .from('bunnies')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle(); // Use maybeSingle instead of single - returns null if no row, doesn't throw error

      if (existing) {
        console.log('Found existing bunny for user:', userId);
        return existing;
      }

      console.log('No existing bunny found for user:', userId, 'creating new one');

      // If no bunny exists, create a new one
      const { data: newBunny, error: createError } = await supabase
        .from('bunnies')
        .insert({
          user_id: userId,
          name: 'Bunny',
          connection: 50,
          stimulation: 60,
          comfort: 70,
          energy: 80,
          curiosity: 40,
          whimsy: 50,
          melancholy: 30,
          wisdom: 20,
        })
        .select()
        .single();

      if (createError) {
        throw new Error(`Failed to create bunny: ${createError.message}`);
      }

      return newBunny;
    } catch (error) {
      console.error('Error getting user bunny:', error);
      throw error;
    }
  }

  // Update bunny stats
  static async updateBunnyStats(bunnyId: string, modifications: StatModification): Promise<DatabaseBunny> {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase is not configured');
    }
    
    try {
      // First get current stats
      const { data: current, error: fetchError } = await supabase
        .from('bunnies')
        .select('*')
        .eq('id', bunnyId)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch current stats: ${fetchError.message}`);
      }

      // Calculate new stats (clamped between 0-100)
      const newStats: Partial<DatabaseBunny> = {};
      
      Object.entries(modifications).forEach(([key, value]) => {
        if (value !== undefined) {
          const statKey = key as keyof BunnyStats;
          const currentValue = current[statKey];
          const newValue = Math.max(0, Math.min(100, currentValue + value));
          newStats[statKey] = newValue;
        }
      });

      // Update in database
      const { data: updated, error: updateError } = await supabase
        .from('bunnies')
        .update(newStats)
        .eq('id', bunnyId)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Failed to update bunny stats: ${updateError.message}`);
      }

      return updated;
    } catch (error) {
      console.error('Error updating bunny stats:', error);
      throw error;
    }
  }

  // Convert database bunny to BunnyStats format
  static toBunnyStats(dbBunny: DatabaseBunny): BunnyStats {
    return {
      connection: dbBunny.connection,
      stimulation: dbBunny.stimulation,
      comfort: dbBunny.comfort,
      energy: dbBunny.energy,
      curiosity: dbBunny.curiosity,
      whimsy: dbBunny.whimsy,
      melancholy: dbBunny.melancholy,
      wisdom: dbBunny.wisdom,
    };
  }

  // Convert database bunny to BunnyState format
  static toBunnyState(dbBunny: DatabaseBunny) {
    return {
      stats: this.toBunnyStats(dbBunny),
      lastUpdated: new Date(dbBunny.updated_at).getTime(),
      name: dbBunny.name,
      id: dbBunny.id,
    };
  }
}

// Helper function to get current user
export async function getCurrentUser() {
  if (!isSupabaseConfigured || !supabase) {
    return null;
  }
  
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    console.error('Error getting user:', error);
    return null;
  }
  return user;
}