import { supabase } from './supabase';

export interface Scene {
  id: string;
  name: string;
  description: string;
  background_image_url: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateSceneData {
  id: string;
  name: string;
  description: string;
  background_image_url: string;
}

export interface UpdateSceneData {
  name?: string;
  description?: string;
  background_image_url?: string;
  is_active?: boolean;
}

export class SceneService {
  // Get all active scenes
  static async getAllScenes(): Promise<Scene[]> {
    const { data, error } = await supabase
      .from('scenes')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching scenes:', error);
      throw error;
    }

    return data || [];
  }

  // Get scene by ID
  static async getScene(id: string): Promise<Scene | null> {
    const { data, error } = await supabase
      .from('scenes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Scene not found
      }
      console.error('Error fetching scene:', error);
      throw error;
    }

    return data;
  }

  // Create new scene
  static async createScene(sceneData: CreateSceneData): Promise<Scene> {
    const { data, error } = await supabase
      .from('scenes')
      .insert([sceneData])
      .select()
      .single();

    if (error) {
      console.error('Error creating scene:', error);
      throw error;
    }

    return data;
  }

  // Update scene
  static async updateScene(id: string, updates: UpdateSceneData): Promise<Scene> {
    const { data, error } = await supabase
      .from('scenes')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating scene:', error);
      throw error;
    }

    return data;
  }

  // Delete scene (soft delete by setting is_active to false)
  static async deleteScene(id: string): Promise<void> {
    const { error } = await supabase
      .from('scenes')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Error deleting scene:', error);
      throw error;
    }
  }

  // Hard delete scene (permanent)
  static async hardDeleteScene(id: string): Promise<void> {
    const { error } = await supabase
      .from('scenes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error hard deleting scene:', error);
      throw error;
    }
  }
}