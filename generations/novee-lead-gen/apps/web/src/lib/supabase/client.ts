/**
 * Supabase client for browser usage (Client Components)
 */
import { createBrowserClient as createSupabaseBrowserClient } from '@supabase/ssr';
import type { Database } from '@novee/shared';

export function createClient() {
  return createSupabaseBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
