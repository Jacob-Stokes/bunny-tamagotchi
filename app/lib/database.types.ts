export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      bunnies: {
        Row: {
          id: string
          user_id: string
          name: string
          created_at: string
          updated_at: string
          connection: number
          stimulation: number
          comfort: number
          energy: number
          curiosity: number
          whimsy: number
          melancholy: number
          wisdom: number
        }
        Insert: {
          id?: string
          user_id: string
          name?: string
          created_at?: string
          updated_at?: string
          connection?: number
          stimulation?: number
          comfort?: number
          energy?: number
          curiosity?: number
          whimsy?: number
          melancholy?: number
          wisdom?: number
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          created_at?: string
          updated_at?: string
          connection?: number
          stimulation?: number
          comfort?: number
          energy?: number
          curiosity?: number
          whimsy?: number
          melancholy?: number
          wisdom?: number
        }
        Relationships: [
          {
            foreignKeyName: "bunnies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}