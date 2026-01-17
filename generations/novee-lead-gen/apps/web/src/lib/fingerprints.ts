/**
 * User fingerprints data module using Supabase.
 * Uses service role client for all operations since user validation is done at API layer.
 */
import { createServiceRoleClient } from './supabase/server';

export interface UserFingerprint {
  id: string;
  user_id: string;
  fingerprint: Record<string, unknown>;
  collected_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * Get the latest fingerprint for a user
 * Uses service role client since user is already validated at API layer
 */
export async function getFingerprintForUser(userId: string): Promise<UserFingerprint | null> {
  const supabase = await createServiceRoleClient();

  const { data, error } = await supabase
    .from('user_fingerprints')
    .select('*')
    .eq('user_id', userId)
    .order('collected_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    // PGRST116 means no rows returned, which is not an error
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('Failed to get fingerprint:', error);
    return null;
  }

  return data as UserFingerprint;
}

/**
 * Store or update a user's fingerprint
 * Uses service role client to bypass RLS since user is already validated at API layer
 */
export async function upsertFingerprint(
  userId: string,
  fingerprint: Record<string, unknown>
): Promise<UserFingerprint> {
  const supabase = await createServiceRoleClient();
  const now = new Date().toISOString();

  // Check if user already has a fingerprint
  const existing = await getFingerprintForUser(userId);

  if (existing) {
    // Update existing fingerprint
    const { data, error } = await supabase
      .from('user_fingerprints')
      .update({
        fingerprint,
        collected_at: now,
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update fingerprint: ${error.message}`);
    }

    return data as UserFingerprint;
  } else {
    // Create new fingerprint
    const { data, error } = await supabase
      .from('user_fingerprints')
      .insert({
        user_id: userId,
        fingerprint,
        collected_at: now,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create fingerprint: ${error.message}`);
    }

    return data as UserFingerprint;
  }
}

/**
 * Delete a user's fingerprint
 * Uses service role client since user is already validated at API layer
 */
export async function deleteFingerprint(userId: string): Promise<boolean> {
  const supabase = await createServiceRoleClient();

  const { error } = await supabase
    .from('user_fingerprints')
    .delete()
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to delete fingerprint:', error);
    return false;
  }

  return true;
}
