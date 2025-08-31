import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Check if Supabase credentials are configured
const isSupabaseConfigured = 
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'your-project-url' && 
  supabaseAnonKey !== 'your-anon-key';

// Create a mock client if not configured, real client if configured
export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;

export { isSupabaseConfigured };

// Database Types
export interface Database {
  public: {
    Tables: {
      bunnies: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          created_at: string;
          updated_at: string;
          // Visible stats
          connection: number;
          stimulation: number;
          comfort: number;
          energy: number;
          // Hidden stats
          curiosity: number;
          whimsy: number;
          melancholy: number;
          wisdom: number;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          created_at?: string;
          updated_at?: string;
          connection?: number;
          stimulation?: number;
          comfort?: number;
          energy?: number;
          curiosity?: number;
          whimsy?: number;
          melancholy?: number;
          wisdom?: number;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          created_at?: string;
          updated_at?: string;
          connection?: number;
          stimulation?: number;
          comfort?: number;
          energy?: number;
          curiosity?: number;
          whimsy?: number;
          melancholy?: number;
          wisdom?: number;
        };
      };
    };
  };
}