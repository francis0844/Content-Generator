import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Topic } from '../types';

let supabaseInstance: SupabaseClient | null = null;
let currentUrl: string | null = null;
let currentKey: string | null = null;

const initSupabase = (url: string, key: string) => {
  if (!url || !key) return null;
  
  // Re-initialize if credentials change
  if (!supabaseInstance || currentUrl !== url || currentKey !== key) {
    try {
        supabaseInstance = createClient(url, key);
        currentUrl = url;
        currentKey = key;
    } catch (e) {
        console.error("Failed to initialize Supabase client:", e);
        return null;
    }
  }
  return supabaseInstance;
};

export const fetchSupabaseTopics = async (url: string, key: string): Promise<Topic[]> => {
  const sb = initSupabase(url, key);
  if (!sb) throw new Error("Invalid Supabase Credentials");

  const { data, error } = await sb
    .from('topics')
    .select('*');

  if (error) {
    console.error('Supabase Fetch Error Details:', JSON.stringify(error, null, 2));
    
    // Check for RLS policy error
    if (error.code === '42501') {
        throw new Error(`Permission Denied (RLS Violation). Please go to Settings > Cloud Database and run the SQL Setup script.`);
    }

    throw new Error(`Supabase Error: ${error.message || JSON.stringify(error)}`);
  }
  
  if (!data) return [];

  return data.map((row: any) => {
      // Check if data column exists (JSONB pattern) as per setup instructions
      if (row.data) {
          return { ...row.data, id: row.id };
      }
      // Fallback: If user created columns flat (title, keyword, etc)
      return {
          id: row.id,
          ...row
      };
  });
};

export const saveSupabaseTopic = async (url: string, key: string, topic: Topic) => {
  const sb = initSupabase(url, key);
  if (!sb) return;

  // Payload strictly follows the schema: id (text), data (jsonb)
  const payload = { 
      id: topic.id, 
      data: topic,
      updated_at: new Date().toISOString() 
  };

  const { error } = await sb
    .from('topics')
    .upsert(payload, { onConflict: 'id' });

  if (error) {
      console.error('Supabase Save Error Details:', JSON.stringify(error, null, 2));
      
      if (error.code === '42501') {
          console.warn("Supabase RLS Error: New row violates row-level security policy. Please run the SQL Setup script in Settings.");
      }
      // We log but don't throw to prevent blocking the UI flow for non-critical saves
  }
};

export const deleteSupabaseTopic = async (url: string, key: string, id: string) => {
    const sb = initSupabase(url, key);
    if (!sb) return;

    const { error } = await sb
        .from('topics')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Supabase Delete Error Details:', JSON.stringify(error, null, 2));
    }
}