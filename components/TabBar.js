'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function TabBar() {
  const supabase = createClient();
  const path = usePathname();
  const [unread, setUnread] = useState(0);

  // Count matches that are new or have unseen incoming messages.
  async function computeUnread() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: matches } = await supabase.from('matches')
      .select('id').or(`user_a.eq.${user.id},user_b.eq.${user.id}`);
    if (!matches || matches.length === 0) { setUnread(0); return; }

    const { data: reads } = await supabase.from('match_reads')
      .select('match_id, last_read_at').eq('user_id', user.id);
    const readMap = new Map((reads || []).map((r) => [r.match_id, r.last_read_at]));

    let count = 0;
    for (const m of matches) {
      const lastRead = readMap.get(m.id);
      if (!lastRead) { count += 1; continue; }            // never opened this match
      const { data: newer } = await supabase.from('messages')
        .select('id').eq('match_id', m.id)
        .neq('sender_id', user.id).gt('created_at', lastRead).limit(1);
      if (newer && newer.length) count += 1;              // unseen message from them
    }
    setUnread(count);
  }

  // Live updates: a new match or message anywhere refreshes the badge.
  useEffect(() => {
    let channel;
    computeUnread();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      channel = supabase.channel('tabbar')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, computeUnread)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'matches' }, computeUnread)
        .subscribe();
    })();
    return () => { if (channel) supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recompute on navigation (e.g. after opening a chat clears its unread).
  useEffect(() => { computeUnread(); /*
