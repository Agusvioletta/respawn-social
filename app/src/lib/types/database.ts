// Auto-generated types from Supabase schema
// To regenerate: npx supabase gen types typescript --project-id ajegcbzvviukuewqhqqb > src/lib/types/database.ts

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
      profiles: {
        Row: {
          id: string
          username: string
          avatar: string | null
          bio: string | null
          games: string[] | null
          max_level: number
          created_at: string
          // Gaming status
          now_playing: string | null
          // Privacy
          privacy_posts: 'public' | 'followers' | 'private'
          privacy_messages: 'everyone' | 'followers' | 'none'
          privacy_show_followers: boolean
          privacy_show_following: boolean
          // Notification prefs
          notif_likes: boolean
          notif_comments: boolean
          notif_follows: boolean
          notif_messages: boolean
          notif_tournaments: boolean
        }
        Insert: {
          id: string
          username: string
          avatar?: string | null
          bio?: string | null
          games?: string[] | null
          max_level?: number
          created_at?: string
          now_playing?: string | null
          privacy_posts?: string
          privacy_messages?: string
          privacy_show_followers?: boolean
          privacy_show_following?: boolean
          notif_likes?: boolean
          notif_comments?: boolean
          notif_follows?: boolean
          notif_messages?: boolean
          notif_tournaments?: boolean
        }
        Update: {
          id?: string
          username?: string
          avatar?: string | null
          bio?: string | null
          games?: string[] | null
          max_level?: number
          created_at?: string
          now_playing?: string | null
          privacy_posts?: string
          privacy_messages?: string
          privacy_show_followers?: boolean
          privacy_show_following?: boolean
          notif_likes?: boolean
          notif_comments?: boolean
          notif_follows?: boolean
          notif_messages?: boolean
          notif_tournaments?: boolean
        }
      }
      posts: {
        Row: {
          id: string
          user_id: string
          username: string
          avatar: string | null
          content: string
          image_url: string | null
          created_at: string
          post_type: 'normal' | 'lfg'
          lfg_game: string | null
          lfg_platform: string | null
          lfg_slots: number | null
        }
        Insert: {
          id?: string
          user_id: string
          username: string
          avatar?: string | null
          content: string
          image_url?: string | null
          created_at?: string
          post_type?: string
          lfg_game?: string | null
          lfg_platform?: string | null
          lfg_slots?: number | null
        }
        Update: {
          id?: string
          user_id?: string
          username?: string
          avatar?: string | null
          content?: string
          image_url?: string | null
          created_at?: string
          post_type?: string
          lfg_game?: string | null
          lfg_platform?: string | null
          lfg_slots?: number | null
        }
      }
      comments: {
        Row: {
          id: string
          post_id: string
          user_id: string
          username: string
          avatar: string | null
          content: string
          parent_id: string | null
          image_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          user_id: string
          username: string
          avatar?: string | null
          content: string
          parent_id?: string | null
          image_url?: string | null
          created_at?: string
        }
        Update: {
          content?: string
        }
      }
      likes: {
        Row: {
          id: string
          post_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          user_id: string
          created_at?: string
        }
        Update: never
      }
      follows: {
        Row: {
          follower_id: string
          following_id: string
          created_at: string
        }
        Insert: {
          follower_id: string
          following_id: string
          created_at?: string
        }
        Update: never
      }
      messages: {
        Row: {
          id: string
          from_id: string
          to_id: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          from_id: string
          to_id: string
          content: string
          created_at?: string
        }
        Update: never
      }
      tournaments: {
        Row: {
          id: string
          creator_id: string
          name: string
          game: string
          format: string
          max_players: number
          prize: string | null
          description: string | null
          date: string | null
          status: 'upcoming' | 'live' | 'finished'
          created_at: string
        }
        Insert: {
          id?: string
          creator_id: string
          name: string
          game: string
          format: string
          max_players: number
          prize?: string | null
          description?: string | null
          date?: string | null
          status?: 'upcoming' | 'live' | 'finished'
          created_at?: string
        }
        Update: {
          name?: string
          game?: string
          format?: string
          max_players?: number
          prize?: string | null
          description?: string | null
          date?: string | null
          status?: 'upcoming' | 'live' | 'finished'
        }
      }
      tournament_players: {
        Row: {
          tournament_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          tournament_id: string
          user_id: string
          created_at?: string
        }
        Update: never
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

// Convenience types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Post = Database['public']['Tables']['posts']['Row']
export type Comment = Database['public']['Tables']['comments']['Row']
export type Like = Database['public']['Tables']['likes']['Row']
export type Follow = Database['public']['Tables']['follows']['Row']
export type Message = Database['public']['Tables']['messages']['Row']
export type Tournament = Database['public']['Tables']['tournaments']['Row']
export type TournamentPlayer = Database['public']['Tables']['tournament_players']['Row']
