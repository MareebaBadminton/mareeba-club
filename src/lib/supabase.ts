import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

// Database types (you can generate these with Supabase CLI later)
export interface Database {
  public: {
    Tables: {
      players: {
        Row: {
          id: string
          first_name: string
          last_name: string
          email: string
          registered_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          first_name: string
          last_name: string
          email: string
          registered_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          first_name?: string
          last_name?: string
          email?: string
          registered_at?: string
          created_at?: string
          updated_at?: string
        }
      }
      bookings: {
        Row: {
          id: string
          player_id: string
          session_date: string
          session_time: string
          status: string
          payment_reference: string | null
          payment_confirmed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          player_id: string
          session_date: string
          session_time: string
          status?: string
          payment_reference?: string | null
          payment_confirmed?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          player_id?: string
          session_date?: string
          session_time?: string
          status?: string
          payment_reference?: string | null
          payment_confirmed?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      sessions: {
        Row: {
          id: string
          day_of_week: string
          start_time: string
          end_time: string
          max_players: number
          fee: number
          created_at: string
        }
        Insert: {
          id: string
          day_of_week: string
          start_time: string
          end_time: string
          max_players?: number
          fee?: number
          created_at?: string
        }
        Update: {
          id?: string
          day_of_week?: string
          start_time?: string
          end_time?: string
          max_players?: number
          fee?: number
          created_at?: string
        }
      }
      // Add this to your Database interface
      payments: {
        Row: {
          id: string
          booking_id: string
          player_id: string
          amount: number
          payment_method: string | null
          payment_reference: string | null
          status: 'pending' | 'completed' | 'failed' | 'refunded'
          payment_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          booking_id: string
          player_id: string
          amount: number
          payment_method?: string | null
          payment_reference?: string | null
          status?: 'pending' | 'completed' | 'failed' | 'refunded'
          payment_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          booking_id?: string
          player_id?: string
          amount?: number
          payment_method?: string | null
          payment_reference?: string | null
          status?: 'pending' | 'completed' | 'failed' | 'refunded'
          payment_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}