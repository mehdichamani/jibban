export interface GroupMemberItem {
  id: string;
  name: string;
}

const STORAGE_KEY_MEMBERS = 'jibban_local_group_members';

export const DEFAULT_MEMBERS: GroupMemberItem[] = [
  { id: 'من', name: 'من (کاربر اصلی)' },
  { id: 'رضا', name: 'رضا' },
  { id: 'سارا', name: 'سارا' },
];

export function getStoredGroupMembers(): GroupMemberItem[] {
  if (typeof window === 'undefined') return DEFAULT_MEMBERS;
  const saved = localStorage.getItem(STORAGE_KEY_MEMBERS);
  if (!saved) {
    localStorage.setItem(STORAGE_KEY_MEMBERS, JSON.stringify(DEFAULT_MEMBERS));
    return DEFAULT_MEMBERS;
  }
  try {
    const parsed = JSON.parse(saved);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return DEFAULT_MEMBERS;
  } catch {
    return DEFAULT_MEMBERS;
  }
}

export function saveStoredGroupMembers(members: GroupMemberItem[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_MEMBERS, JSON.stringify(members));
}
