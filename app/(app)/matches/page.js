'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { compat } from '@/lib/compat';
import { grad, initials } from '@/lib/ui';

export default function Matches() {
  const supabase = createClient();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: me } = await supabase.from('profiles').select('*').eq('id', user.id).single();

    const { data: matches } = await supabase.from('matches')
      .select('id, user_a, user_b, created_at')
      .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
      .order('created_at', { ascending: false });

    const out = [];
    for (const m of matches || []) {
      const otherId = m.user_a === user.id ? m.user_b : m.user_a;
      const { data: other } = await supabase.from('profiles').select('*').eq('id', otherId).single();
      if (!other) continue;
      const { data: last } = await supabase.from('messages')
        .select('body, sender_id').eq('match_id', m.id)
        .order('created_at', { ascending: false }).limit(1).maybeSingle();
      out.push({
        matchId: m.id, other, pct: compat(me, other).pct,
        last: last ? `${last.sender_id === user.id ? 'You: ' : ''}${last.body}` : 'Say hi 👋',
      });
    }
    setRows(out);
    setLoading(false);
  }

  return (
    <>
      <div className="topbar"><div className="wordmark">Nook<span className="dot" /></div><div className="sub">Your matches</div></div>
      <div className="scroll">
        {loading ? (
          <div className="empty"><div className="big">💬</div>Loading…</div>
        ) : rows.length === 0 ? (
          <div className="empty" style={{ height: 'auto', padding: '60px 30px' }}>
            <div className="big">💬</div>
            <b style={{ fontSize: 18, color: 'var(--ink)' }}>No matches yet</b>
            <p>Like a few rooms or people in Discover. When someone likes you back, they land here.</p>
            <Link href="/discover" className="btn btn-sm btn-primary" style={{ textDecoration: 'none' }}>Start browsing</Link>
          </div>
        ) : (
          <>
            <div className="section-label">{rows.length} match{rows.length > 1 ? 'es' : ''}</div>
            <div className="list">
              {rows.map((r) => (
                <Link key={r.matchId} href={`/chat/${r.matchId}`} className="row" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div className="av" style={{ background: grad(r.other.avatar_color) }}>{initials(r.other.name)}</div>
                  <div className="info">
                    <b>{r.other.name}, {r.other.age}</b>{' '}
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)' }}>
                      {r.other.intent === 'has_place' ? '· 🛏 room' : '· 🤝 team up'}
                    </span>
                    <p>{r.last}</p>
                  </div>
                  <div className="pct">{r.pct}%</div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
