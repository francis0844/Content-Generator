
import { createClient } from '@supabase/supabase-js';
import { Topic } from '../types';

// Hardcoded Credentials for Anchor Computer Software Database
const SUPABASE_URL = 'https://jgdjlrmmcfizsdowitgf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpnZGpscm1tY2ZpenNkb3dpdGdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5ODk5ODAsImV4cCI6MjA3OTU2NTk4MH0.hGosTqlhLSFmDzHR3XiSZxUJnHuNN7BxMP8mfDfBBZ0';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export const fetchSupabaseTopics = async (): Promise<Topic[]> => {
  const { data, error } = await supabase
    .from('topics')
    .select('*');

  if (error) {
    console.error('Supabase Fetch Error Details:', JSON.stringify(error, null, 2));
    
    if (error.code === '42501') {
        throw new Error(`Permission Denied (RLS Violation). Please go to Settings and check the SQL Setup script.`);
    }

    throw new Error(`Supabase Error: ${error.message || JSON.stringify(error)}`);
  }
  
  if (!data) return [];
  
  // console.log(`Fetched ${data.length} topics from Supabase`); // Debug Log

  return data.map((row: any) => {
      // Safety Check: Handle double-nested data (e.g., row.data.data)
      // This happens if the save payload was { data: { ...topic } } instead of just { ...topic }
      if (row.data && row.data.data && typeof row.data.data === 'object') {
          return { ...row.data.data, id: row.id };
      }

      // Safety Check: Handle wrapping in a "topic" key (common artifact)
      if (row.data && row.data.topic && typeof row.data.topic === 'object') {
          return { ...row.data.topic, id: row.id };
      }

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

export const saveSupabaseTopic = async (topic: Topic) => {
  // Payload strictly follows the schema: id (text), data (jsonb)
  const payload = { 
      id: topic.id, 
      data: topic,
      updated_at: new Date().toISOString() 
  };

  // Debug log to ensure content is present before save
  if (topic.status === 'CONTENT_GENERATED' && topic.generatedContent) {
      console.log(`Saving Topic ${topic.id} to Supabase with Content (Length: ${topic.generatedContent.content_html?.length || 0})`);
  }

  const { error } = await supabase
    .from('topics')
    .upsert(payload, { onConflict: 'id' });

  if (error) {
      console.error('Supabase Save Error Details:', JSON.stringify(error, null, 2));
  } else {
      console.log(`Successfully saved topic ${topic.id} to Supabase`);
  }
};

export const deleteSupabaseTopic = async (id: string) => {
    const { error } = await supabase
        .from('topics')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Supabase Delete Error Details:', JSON.stringify(error, null, 2));
    }
}

// --- Application Config (Angles) ---

export const fetchAppConfig = async (): Promise<{ preferredAngles: string[], unpreferredAngles: string[] } | null> => {
    const { data, error } = await supabase
        .from('app_config')
        .select('key, value');

    if (error) {
        // Silent fail if table doesn't exist yet, just return null so app uses defaults
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
}

export const saveAppConfig = async (key: 'preferred_angles' | 'unpreferred_angles', value: string[]) => {
    const { error } = await supabase
        .from('app_config')
        .upsert({ key, value }, { onConflict: 'key' });
    
    if (error) console.error(`Config Save Error (${key}):`, error);
}
