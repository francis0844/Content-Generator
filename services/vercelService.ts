
import { Topic } from '../types';

/**
 * Service to interact with Vercel KV (Redis) via REST API.
 * This allows the client-side app to function with a database without a backend server,
 * provided the user supplies their REST API URL and Token.
 */

export const loadFromVercel = async (url: string, token: string): Promise<Topic[] | null> => {
  if (!url || !token) return null;

  try {
    // Vercel KV / Upstash REST API: GET /get/key
    const response = await fetch(`${url}/get/topic_gen_data`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Vercel KV Error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Redis returns the data as a string in the 'result' field if stored as string,
    // or as JSON if stored as JSON.
    if (data.result) {
        // If it's a stringified JSON (common in Redis), parse it
        if (typeof data.result === 'string') {
            return JSON.parse(data.result);
        }
        return data.result;
    }
    
    return null;
  } catch (error) {
    console.error('Failed to load from Vercel KV:', error);
    throw error;
  }
};

export const saveToVercel = async (url: string, token: string, topics: Topic[]): Promise<void> => {
  if (!url || !token) return;

  try {
    // Vercel KV / Upstash REST API: POST /set/key
    const response = await fetch(`${url}/set/topic_gen_data`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(topics),
    });

    if (!response.ok) {
      throw new Error(`Vercel KV Save Error: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Failed to save to Vercel KV:', error);
    throw error;
  }
};
