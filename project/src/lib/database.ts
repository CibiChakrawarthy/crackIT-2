import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface DBMessage {
  type: 'question' | 'answer';
  text: string;
  timestamp: Date;
}

export class DatabaseService {
  private client: SupabaseClient | null = null;

  constructor() {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (url && key) {
      this.client = createClient(url, key);
    } else {
      console.warn('Supabase environment variables are not configured');
    }
  }

  async saveMessage(message: DBMessage): Promise<void> {
    if (!this.client) return;
    try {
      const { error } = await this.client.from('messages').insert({
        type: message.type,
        text: message.text,
        timestamp: message.timestamp.toISOString(),
      });
      if (error) {
        console.error('Failed to save message', error);
      }
    } catch (err) {
      console.error('Unexpected error saving message', err);
    }
  }
}
