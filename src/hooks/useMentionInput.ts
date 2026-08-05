import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase, isSupabaseAvailable } from '../lib/supabase';

export interface MentionUser {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
}

interface MentionState {
  active: boolean;
  query: string;
  startIndex: number;
}

const MENTION_RE = /@([\w.-]*)$/;

let cachedUsers: MentionUser[] | null = null;

async function fetchMentionableUsers(): Promise<MentionUser[]> {
  if (cachedUsers) return cachedUsers;
  if (!isSupabaseAvailable()) return [];
  const { data } = await supabase!
    .from('profiles')
    .select('id, full_name, avatar_url, role')
    .in('role', ['admin', 'member', 'creator'])
    .not('full_name', 'is', null)
    .order('full_name');
  cachedUsers = (data as MentionUser[] | null) ?? [];
  return cachedUsers;
}

export function useMentionInput(value: string, onChange: (val: string) => void) {
  const [mention, setMention] = useState<MentionState>({ active: false, query: '', startIndex: -1 });
  const [users, setUsers] = useState<MentionUser[]>([]);
  const [allUsers, setAllUsers] = useState<MentionUser[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  useEffect(() => {
    fetchMentionableUsers().then(setAllUsers);
  }, []);

  const detect = useCallback((text: string, cursorPos: number) => {
    const before = text.slice(0, cursorPos);
    const m = before.match(MENTION_RE);
    if (m) {
      const q = m[1];
      const startIdx = cursorPos - q.length - 1;
      const filtered = allUsers.filter(u =>
        (u.full_name ?? '').toLowerCase().includes(q.toLowerCase())
      ).slice(0, 6);
      setMention({ active: true, query: q, startIndex: startIdx });
      setUsers(filtered);
      setSelectedIndex(0);
    } else {
      setMention({ active: false, query: '', startIndex: -1 });
      setUsers([]);
    }
  }, [allUsers]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    onChange(newVal);
    detect(newVal, e.target.selectionStart ?? newVal.length);
  }, [onChange, detect]);

  const selectMention = useCallback((user: MentionUser) => {
    const name = (user.full_name ?? '').replace(/\s+/g, '');
    const before = value.slice(0, mention.startIndex);
    const after = value.slice(mention.startIndex + mention.query.length + 1);
    const newVal = `${before}@${name} ${after}`;
    onChange(newVal);
    setMention({ active: false, query: '', startIndex: -1 });
    setUsers([]);
    setTimeout(() => {
      const el = inputRef.current;
      if (!el) return;
      const pos = before.length + name.length + 2;
      el.setSelectionRange(pos, pos);
      el.focus();
    }, 0);
  }, [value, mention, onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!mention.active || users.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(i => (i + 1) % users.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(i => (i - 1 + users.length) % users.length); }
    else if (e.key === 'Enter' || e.key === 'Tab') {
      if (mention.active && users.length > 0) { e.preventDefault(); selectMention(users[selectedIndex]); }
    } else if (e.key === 'Escape') {
      setMention({ active: false, query: '', startIndex: -1 });
      setUsers([]);
    }
  }, [mention, users, selectedIndex, selectMention]);

  const closeMention = useCallback(() => {
    setMention({ active: false, query: '', startIndex: -1 });
    setUsers([]);
  }, []);

  return { inputRef, mention, users, selectedIndex, handleChange, handleKeyDown, selectMention, closeMention };
}
