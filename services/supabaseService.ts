import { createClient } from '@supabase/supabase-js';
import { Topic } from '../types';

// Hardcoded Credentials for Anchor Computer Software Database
const SUPABASE_URL = 'https://jgdjlrmmcfizsdowitgf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpnZGpscm1tY2ZpenNkb3dpdGdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5ODk5ODAsImV4cCI6MjA3OTU2NTk4MH0.hGosTqlhLSFmDzHR3XiSZxUJnHuNN7BxMP8mfDfBBZ0';

// Custom memory storage to avoid LocalStorage access issues in restricted environments
const memoryStorage = {
  getItem: (key: string) => null,
  setItem: (key: string, value: string) => {},
  removeItem: (key: string) => {},
};

// Initialize client with stateless auth configuration to avoid browser storage/fetch issues
// Explicitly bind global fetch to avoid context loss in some environments
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    storage: memoryStorage
  },
  global: {
    fetch: (url, options) => fetch(url, options)
  }
});

export const fetchSupabaseTopics = async (): Promise<Topic[]> => {
  try {
    const { data, error } = await supabase
        .from('topics')
        .select('*');

    if (error) {
        // Suppress generic fetch errors from spamming, just log warning
        if (error.message && error.message.includes('Failed to fetch')) {
             console.warn('Supabase is unreachable (Network/CORS). Running in offline mode.');
             return [];
        }

        console.error('Supabase Fetch Error Details:', JSON.stringify(error, null, 2));
        if (error.code === '42501') {
            console.error(`Permission Denied (RLS Violation).`);
        }
        return [];
    }
    
    if (!data) return [];
    
    return data.map((row: any) => {
        // Safety Check: Handle double-nested data (e.g., row.data.data)
        if (row.data && row.data.data && typeof row.data.data === 'object') {
            return { ...row.data.data, id: row.id };
        }

        // Safety Check: Handle wrapping in a "topic" key
        if (row.data && row.data.topic && typeof row.data.topic === 'object') {
            return { ...row.data.topic, id: row.id };
        }

        // Check if data column exists (JSONB pattern)
        if (row.data) {
            return { ...row.data, id: row.id };
        }
        
        // Fallback: Flat columns
        return {
            id: row.id,
            ...row
        };
    });
  } catch (err: any) {
    // If it's a fetch error, it's likely network related, treat gracefully
    if (err.message && err.message.includes('Failed to fetch')) {
        console.warn("Supabase fetch failed (Network).");
    } else {
        console.error("Critical Supabase Fetch Error:", err);
    }
    return [];
  }
};

export const saveSupabaseTopic = async (topic: Topic) => {
  // Payload strictly follows the schema: id (text), data (jsonb)
  const payload = { 
      id: topic.id, 
      data: topic,
      updated_at: new Date().toISOString() 
  };

  try {
      const { error } = await supabase
        .from('topics')
        .upsert(payload, { onConflict: 'id' });

      if (error) {
          // Swallow fetch errors for save to prevent UI disruption
          if (error.message?.includes('Failed to fetch')) return;
          console.error('Supabase Save Error Details:', JSON.stringify(error, null, 2));
      }
  } catch (err: any) {
      if (err.message?.includes('Failed to fetch')) return;
      console.error("Critical Supabase Save Error:", err);
  }
};

export const deleteSupabaseTopic = async (id: string) => {
    try {
        const { error } = await supabase
            .from('topics')
            .delete()
            .eq('id', id);

        if (error) {
            if (error.message?.includes('Failed to fetch')) return;
            console.error('Supabase Delete Error Details:', JSON.stringify(error, null, 2));
        }
    } catch (err: any) {
        if (err.message?.includes('Failed to fetch')) return;
        console.error("Critical Supabase Delete Error:", err);
    }
}

// --- Application Config (Angles) ---

export const fetchAppConfig = async (): Promise<{ preferredAngles: string[], unpreferredAngles: string[] } | null> => {
    try {
        const { data, error } = await supabase
            .from('app_config')
            .select('key, value');

        if (error) {
            return null; 
        }

        const config: any = {};
        if (data) {
            data.forEach((row: any) => {
                config[row.key] = row.value;
            });
        }

        return {
            preferredAngles: config.preferred_angles || [],
            unpreferredAngles: config.unpreferred_angles || []
        };
    } catch (err) {
        console.warn("Config Fetch ignored (Network/Offline).");
        return null;
    }
}

export const saveAppConfig = async (key: 'preferred_angles' | 'unpreferred_angles', value: string[]) => {
    try {
        const { error } = await supabase
            .from('app_config')
            .upsert({ key, value }, { onConflict: 'key' });
        
        if (error) {
            if (error.message?.includes('Failed to fetch')) return;
            console.error(`Config Save Error (${key}):`, error);
        }
    } catch (err) {
        console.warn(`Config Save ignored (${key}).`);
    }
}