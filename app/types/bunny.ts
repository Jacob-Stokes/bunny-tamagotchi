export interface BunnyStats {
  // Visible Stats (Player Sees)
  connection: number;    // 💕 Need for bonding and interaction with owner (0-100)
  stimulation: number;   // ✨ Mental and creative engagement needs (0-100)
  comfort: number;       // 🌙 Physical and emotional wellbeing (0-100)
  energy: number;        // ⚡ Rest and activity balance (0-100)
  
  // Hidden Stats (Affect Personality)
  curiosity: number;     // How inquisitive and questioning the bunny is (0-100)
  whimsy: number;        // Playfulness and imaginative thinking (0-100)
  melancholy: number;    // Depth of feeling and poetic sadness (0-100)
  wisdom: number;        // Accumulated knowledge and philosophical depth (0-100)
}

export interface BunnyState {
  stats: BunnyStats;
  lastUpdated: number;
  name: string;
  id?: string; // Database ID when using Supabase
}

export type ActionType = 'feed' | 'play' | 'sleep' | 'clean';

export interface StatModification {
  connection?: number;
  stimulation?: number;
  comfort?: number;
  energy?: number;
  curiosity?: number;
  whimsy?: number;
  melancholy?: number;
  wisdom?: number;
}