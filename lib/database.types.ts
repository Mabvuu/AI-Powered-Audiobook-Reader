export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      books: {
        Row: {
          id: string;
          title: string;
          author: string | null;
          full_text: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          author?: string | null;
          full_text?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          title?: string;
          author?: string | null;
          full_text?: string | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      chapters: {
        Row: {
          id: string;
          book_id: string;
          title: string;
          chapter_order: number;
          text: string;
          summary: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          book_id: string;
          title: string;
          chapter_order: number;
          text: string;
          summary?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          book_id?: string;
          title?: string;
          chapter_order?: number;
          text?: string;
          summary?: string | null;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "chapters_book_id_fkey";
            columns: ["book_id"];
            isOneToOne: false;
            referencedRelation: "books";
            referencedColumns: ["id"];
          }
        ];
      };
      chunks: {
        Row: {
          id: string;
          book_id: string;
          chapter_id: string;
          chunk_order: number;
          text: string;
          embedding: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          book_id: string;
          chapter_id: string;
          chunk_order: number;
          text: string;
          embedding?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          book_id?: string;
          chapter_id?: string;
          chunk_order?: number;
          text?: string;
          embedding?: string | null;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "chunks_book_id_fkey";
            columns: ["book_id"];
            isOneToOne: false;
            referencedRelation: "books";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chunks_chapter_id_fkey";
            columns: ["chapter_id"];
            isOneToOne: false;
            referencedRelation: "chapters";
            referencedColumns: ["id"];
          }
        ];
      };
      bookmarks: {
        Row: {
          id: string;
          book_id: string;
          chapter_id: string | null;
          text: string | null;
          note: string | null;
          audio_timestamp: number | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          book_id: string;
          chapter_id?: string | null;
          text?: string | null;
          note?: string | null;
          audio_timestamp?: number | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          book_id?: string;
          chapter_id?: string | null;
          text?: string | null;
          note?: string | null;
          audio_timestamp?: number | null;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "bookmarks_book_id_fkey";
            columns: ["book_id"];
            isOneToOne: false;
            referencedRelation: "books";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookmarks_chapter_id_fkey";
            columns: ["chapter_id"];
            isOneToOne: false;
            referencedRelation: "chapters";
            referencedColumns: ["id"];
          }
        ];
      };
      chat_sessions: {
        Row: {
          id: string;
          book_id: string;
          title: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          book_id: string;
          title?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          book_id?: string;
          title?: string | null;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "chat_sessions_book_id_fkey";
            columns: ["book_id"];
            isOneToOne: false;
            referencedRelation: "books";
            referencedColumns: ["id"];
          }
        ];
      };
      chat_messages: {
        Row: {
          id: string;
          session_id: string;
          role: "user" | "assistant" | "system";
          content: string;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          session_id: string;
          role: "user" | "assistant" | "system";
          content: string;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          session_id?: string;
          role?: "user" | "assistant" | "system";
          content?: string;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "chat_sessions";
            referencedColumns: ["id"];
          }
        ];
      };
      reading_progress: {
        Row: {
          id: string;
          book_id: string;
          chapter_id: string | null;
          current_text_position: number | null;
          current_audio_timestamp: number | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          book_id: string;
          chapter_id?: string | null;
          current_text_position?: number | null;
          current_audio_timestamp?: number | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          book_id?: string;
          chapter_id?: string | null;
          current_text_position?: number | null;
          current_audio_timestamp?: number | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "reading_progress_book_id_fkey";
            columns: ["book_id"];
            isOneToOne: false;
            referencedRelation: "books";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reading_progress_chapter_id_fkey";
            columns: ["chapter_id"];
            isOneToOne: false;
            referencedRelation: "chapters";
            referencedColumns: ["id"];
          }
        ];
      };
      chapter_audio: {
        Row: {
          id: string;
          chapter_id: string;
          audio_url: string;
          duration_seconds: number | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          chapter_id: string;
          audio_url: string;
          duration_seconds?: number | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          chapter_id?: string;
          audio_url?: string;
          duration_seconds?: number | null;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "chapter_audio_chapter_id_fkey";
            columns: ["chapter_id"];
            isOneToOne: true;
            referencedRelation: "chapters";
            referencedColumns: ["id"];
          }
        ];
      };
      characters: {
        Row: {
          id: string;
          book_id: string;
          name: string;
          aliases: Json | null;
          description: string | null;
          first_appearance_chapter_id: string | null;
          metadata: Json | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          book_id: string;
          name: string;
          aliases?: Json | null;
          description?: string | null;
          first_appearance_chapter_id?: string | null;
          metadata?: Json | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          book_id?: string;
          name?: string;
          aliases?: Json | null;
          description?: string | null;
          first_appearance_chapter_id?: string | null;
          metadata?: Json | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "characters_book_id_fkey";
            columns: ["book_id"];
            isOneToOne: false;
            referencedRelation: "books";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "characters_first_appearance_chapter_id_fkey";
            columns: ["first_appearance_chapter_id"];
            isOneToOne: false;
            referencedRelation: "chapters";
            referencedColumns: ["id"];
          }
        ];
      };
      places: {
        Row: {
          id: string;
          book_id: string;
          name: string;
          description: string | null;
          first_appearance_chapter_id: string | null;
          metadata: Json | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          book_id: string;
          name: string;
          description?: string | null;
          first_appearance_chapter_id?: string | null;
          metadata?: Json | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          book_id?: string;
          name?: string;
          description?: string | null;
          first_appearance_chapter_id?: string | null;
          metadata?: Json | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "places_book_id_fkey";
            columns: ["book_id"];
            isOneToOne: false;
            referencedRelation: "books";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "places_first_appearance_chapter_id_fkey";
            columns: ["first_appearance_chapter_id"];
            isOneToOne: false;
            referencedRelation: "chapters";
            referencedColumns: ["id"];
          }
        ];
      };
      story_events: {
        Row: {
          id: string;
          book_id: string;
          chapter_id: string | null;
          title: string;
          summary: string | null;
          metadata: Json | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          book_id: string;
          chapter_id?: string | null;
          title: string;
          summary?: string | null;
          metadata?: Json | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          book_id?: string;
          chapter_id?: string | null;
          title?: string;
          summary?: string | null;
          metadata?: Json | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "story_events_book_id_fkey";
            columns: ["book_id"];
            isOneToOne: false;
            referencedRelation: "books";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "story_events_chapter_id_fkey";
            columns: ["chapter_id"];
            isOneToOne: false;
            referencedRelation: "chapters";
            referencedColumns: ["id"];
          }
        ];
      };
      character_relationships: {
        Row: {
          id: string;
          book_id: string;
          from_character_id: string;
          to_character_id: string;
          type: string;
          description: string | null;
          metadata: Json | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          book_id: string;
          from_character_id: string;
          to_character_id: string;
          type: string;
          description?: string | null;
          metadata?: Json | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          book_id?: string;
          from_character_id?: string;
          to_character_id?: string;
          type?: string;
          description?: string | null;
          metadata?: Json | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "character_relationships_book_id_fkey";
            columns: ["book_id"];
            isOneToOne: false;
            referencedRelation: "books";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "character_relationships_from_character_id_fkey";
            columns: ["from_character_id"];
            isOneToOne: false;
            referencedRelation: "characters";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "character_relationships_to_character_id_fkey";
            columns: ["to_character_id"];
            isOneToOne: false;
            referencedRelation: "characters";
            referencedColumns: ["id"];
          }
        ];
      };
      character_mentions: {
        Row: {
          id: string;
          character_id: string;
          chapter_id: string;
          quote: string | null;
          context: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          character_id: string;
          chapter_id: string;
          quote?: string | null;
          context?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          character_id?: string;
          chapter_id?: string;
          quote?: string | null;
          context?: string | null;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "character_mentions_character_id_fkey";
            columns: ["character_id"];
            isOneToOne: false;
            referencedRelation: "characters";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "character_mentions_chapter_id_fkey";
            columns: ["chapter_id"];
            isOneToOne: false;
            referencedRelation: "chapters";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Record<string, never>;
Functions: Record<string, never>;
Enums: Record<string, never>;
CompositeTypes: Record<string, never>;
  };
};