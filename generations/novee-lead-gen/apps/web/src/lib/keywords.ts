/**
 * Keywords data management using Supabase.
 * Uses service role client to bypass RLS since user auth is validated at the API layer.
 */
import { createServiceRoleClient } from './supabase/server';

export interface KeywordGroup {
  id: string;
  user_id: string;
  keywords: string[];
  active: boolean;
  created_at: string;
  updated_at: string;
}

// Internal interface matching Supabase schema
interface KeywordGroupRow {
  id: string;
  user_id: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface KeywordRow {
  id: string;
  user_keyword_group_id: string;
  text: string;
  created_at: string;
  updated_at: string;
}

/**
 * Convert database rows to KeywordGroup
 */
function rowsToKeywordGroup(group: KeywordGroupRow, keywords: KeywordRow[]): KeywordGroup {
  return {
    id: group.id,
    user_id: group.user_id,
    keywords: keywords.map(k => k.text),
    active: group.active,
    created_at: group.created_at,
    updated_at: group.updated_at,
  };
}

/**
 * Get all keyword groups for a specific user
 */
export async function getKeywordGroupsByUserId(userId: string): Promise<KeywordGroup[]> {
  const supabase = await createServiceRoleClient();

  // Get all keyword groups for user
  const { data: groups, error: groupsError } = await supabase
    .from('user_keyword_groups')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (groupsError || !groups) {
    console.error('Failed to get keyword groups:', groupsError);
    return [];
  }

  if (groups.length === 0) {
    return [];
  }

  // Get all keywords for these groups
  const groupIds = groups.map(g => g.id);
  const { data: keywords, error: keywordsError } = await supabase
    .from('keywords')
    .select('*')
    .in('user_keyword_group_id', groupIds);

  if (keywordsError) {
    console.error('Failed to get keywords:', keywordsError);
    return [];
  }

  // Map keywords to groups
  const keywordsByGroup = new Map<string, KeywordRow[]>();
  for (const keyword of (keywords || [])) {
    const existing = keywordsByGroup.get(keyword.user_keyword_group_id) || [];
    existing.push(keyword);
    keywordsByGroup.set(keyword.user_keyword_group_id, existing);
  }

  return groups.map(group =>
    rowsToKeywordGroup(group, keywordsByGroup.get(group.id) || [])
  );
}

/**
 * Get a specific keyword group by ID
 */
export async function getKeywordGroupById(groupId: string, userId: string): Promise<KeywordGroup | null> {
  const supabase = await createServiceRoleClient();

  const { data: group, error: groupError } = await supabase
    .from('user_keyword_groups')
    .select('*')
    .eq('id', groupId)
    .eq('user_id', userId)
    .single();

  if (groupError || !group) {
    return null;
  }

  const { data: keywords } = await supabase
    .from('keywords')
    .select('*')
    .eq('user_keyword_group_id', groupId);

  return rowsToKeywordGroup(group, keywords || []);
}

/**
 * Create a new keyword group for a user
 */
export async function createKeywordGroup(userId: string, keywords: string[]): Promise<KeywordGroup> {
  const supabase = await createServiceRoleClient();

  // Create the group
  const { data: group, error: groupError } = await supabase
    .from('user_keyword_groups')
    .insert({ user_id: userId, active: true })
    .select()
    .single();

  if (groupError || !group) {
    throw new Error(`Failed to create keyword group: ${groupError?.message}`);
  }

  // Insert keywords
  if (keywords.length > 0) {
    const keywordInserts = keywords.map(text => ({
      user_keyword_group_id: group.id,
      text,
    }));

    const { error: keywordsError } = await supabase
      .from('keywords')
      .insert(keywordInserts);

    if (keywordsError) {
      // Rollback by deleting the group
      await supabase.from('user_keyword_groups').delete().eq('id', group.id);
      throw new Error(`Failed to create keywords: ${keywordsError.message}`);
    }
  }

  return {
    id: group.id,
    user_id: group.user_id,
    keywords,
    active: group.active,
    created_at: group.created_at,
    updated_at: group.updated_at,
  };
}

/**
 * Update a keyword group
 */
export async function updateKeywordGroup(
  groupId: string,
  userId: string,
  updates: { keywords?: string[]; active?: boolean }
): Promise<KeywordGroup | null> {
  const supabase = await createServiceRoleClient();

  // Verify ownership
  const existing = await getKeywordGroupById(groupId, userId);
  if (!existing) {
    return null;
  }

  // Update active status if provided
  if (updates.active !== undefined) {
    const { error } = await supabase
      .from('user_keyword_groups')
      .update({ active: updates.active })
      .eq('id', groupId);

    if (error) {
      console.error('Failed to update keyword group:', error);
      return null;
    }
  }

  // Update keywords if provided
  if (updates.keywords !== undefined) {
    // Delete existing keywords
    await supabase
      .from('keywords')
      .delete()
      .eq('user_keyword_group_id', groupId);

    // Insert new keywords
    if (updates.keywords.length > 0) {
      const keywordInserts = updates.keywords.map(text => ({
        user_keyword_group_id: groupId,
        text,
      }));

      const { error } = await supabase
        .from('keywords')
        .insert(keywordInserts);

      if (error) {
        console.error('Failed to update keywords:', error);
        return null;
      }
    }
  }

  return getKeywordGroupById(groupId, userId);
}

/**
 * Delete a keyword group
 */
export async function deleteKeywordGroup(groupId: string, userId: string): Promise<boolean> {
  const supabase = await createServiceRoleClient();

  // Verify ownership first
  const existing = await getKeywordGroupById(groupId, userId);
  if (!existing) {
    return false;
  }

  // Delete the group (keywords will cascade delete due to FK)
  const { error } = await supabase
    .from('user_keyword_groups')
    .delete()
    .eq('id', groupId);

  if (error) {
    console.error('Failed to delete keyword group:', error);
    return false;
  }

  return true;
}

/**
 * Get all unique keywords for a user across all their groups
 */
export async function getAllKeywordsForUser(userId: string): Promise<string[]> {
  const groups = await getKeywordGroupsByUserId(userId);
  const allKeywords = new Set<string>();

  for (const group of groups) {
    if (group.active) {
      for (const keyword of group.keywords) {
        allKeywords.add(keyword);
      }
    }
  }

  return Array.from(allKeywords);
}

/**
 * Clear all keyword groups for a user
 */
export async function clearAllKeywordsForUser(userId: string): Promise<number> {
  const supabase = await createServiceRoleClient();
  const groups = await getKeywordGroupsByUserId(userId);

  if (groups.length === 0) {
    return 0;
  }

  const { error } = await supabase
    .from('user_keyword_groups')
    .delete()
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to clear keywords:', error);
    return 0;
  }

  return groups.length;
}

/**
 * Delete a specific keyword from all groups for a user
 */
export async function deleteKeywordForUser(userId: string, keyword: string): Promise<boolean> {
  const supabase = await createServiceRoleClient();

  // Get all groups for this user
  const { data: groups } = await supabase
    .from('user_keyword_groups')
    .select('id')
    .eq('user_id', userId);

  if (!groups || groups.length === 0) {
    return false;
  }

  const groupIds = groups.map(g => g.id);

  // First check if the keyword exists
  const { data: existingKeywords } = await supabase
    .from('keywords')
    .select('id')
    .in('user_keyword_group_id', groupIds)
    .eq('text', keyword);

  if (!existingKeywords || existingKeywords.length === 0) {
    return false; // Keyword doesn't exist
  }

  // Delete the keyword from all groups
  const { error } = await supabase
    .from('keywords')
    .delete()
    .in('user_keyword_group_id', groupIds)
    .eq('text', keyword);

  if (error) {
    console.error('Failed to delete keyword:', error);
    return false;
  }

  // Clean up empty groups
  for (const group of groups) {
    const { data: remaining } = await supabase
      .from('keywords')
      .select('id')
      .eq('user_keyword_group_id', group.id)
      .limit(1);

    if (!remaining || remaining.length === 0) {
      await supabase
        .from('user_keyword_groups')
        .delete()
        .eq('id', group.id);
    }
  }

  return true; // Deletion was successful
}
