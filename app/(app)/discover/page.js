'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { compat } from '@/lib/compat';
import { grad, initials, roomArtDataUri } from '@/lib/ui';

export default function Discover() {
  const supabase = createClient();
  const [me, setMe] = useState(null);
  const [cands, setCands] = useState([]);       // all un-swiped candidates (scored)
  const [view, setView] = useState('rooms');     // 'rooms' | 'people'
  const [idx, setIdx] = useState({ rooms: 0, people: 0 });
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    setMe(profile);
    setView(profile.intent === 'has_place' ? 'people' : 'rooms');

    const { data: swipes } = await supabase.from('swipes').select('target_id').eq('swiper_id', user.id);
    const seen = new Set((swipes || []).map((s) => s.target_id));

    const { data: others } = await supabase.from('profiles')
      .select('*, listing_photos(url, sort)')
      .neq('id', user.id).eq('onboarded', true);

    const scored = (others || [])
      .filter((o) => !seen.has(o.id))
      .map((o) => ({ ...o, ...compat(profile, o) }))
      .sort((a, b) => b.pct - a.pct);
    setCands(scored);
    setLoading(false);
  }

  const queues = useMemo(() => ({
    rooms: cands.filter((c) => c.intent === 'has_place'),
    people: cands.filter((c) => c.intent === 'seeking_together'),
  }), [cands]);

  const q = queues[view];
  const current = q[idx[view]];

  async function swipe(liked) {
    if (!current) return;
    const c = current;
    setIdx((s) => ({ ...s, [view]: s[view] + 1 }));

    await supabase.from('swipes').insert({ swiper_id: me.id, target_id: c.id, liked });

    if (liked) {
      const [a, b] = me.id < c.id ? [me.id, c.id] : [c.id, me.id];
      const { data } = await supabase.from('matches').select('id')
        .eq('user_a', a).eq('user_b', b).maybeSingle();
      if (data) setMatch({ ...c, matchId: data.id });
    }
  }

  if (loading) return <Shell><div className="empty"><div className="big">🏠</div>Loading…</div></Shell>;

  return (
    <Shell view={view} setView={(v) => setView(v)} me={me}>
      <div className="deck">
        {!current ? (
          <div className="card"><div className="empty">
            <div className="big">🎉</div>
            <b style={{ fontSize: 19, color: 'var(--ink)' }}>You&apos;re all caught up</b>
            <p>That&apos;s everyone {view === 'rooms' ? 'with a room' : 'looking to team up'} near you for now.</p>
          </div></div>
        ) : (
          <Card c={current} me={me} />
        )}
      </div>

      {current && (
        <div className="acts">
          <button className="fab pass" onClick={() => swipe(false)} aria-label="Pass">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
          <button className="fab like" onClick={() => swipe(true)} aria-label="Like">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7.5-4.6-10-9.3C.3 8.4 2 5 5.2 5c2 0 3.3 1.1 4 2.2.7-1.1 2-2.2 4-2.2C20.4 5 22 8.4 20 11.7 17.5 16.4 12 21 12 21z" /></svg>
          </button>
        </div>
      )}

      {/* match celebration */}
      {match && (
        <div className="modal">
          <div className="modal-card">
            <div className="avpair">
              <div className="av" style={{ background: grad(me.avatar_color) }}>{initials(me.name)}</div>
              <div className="av" style={{ background: grad(match.avatar_color) }}>{initials(match.name)}</div>
            </div>
            <h2>It&apos;s a match!</h2>
            <p>You and {match.name} both liked each other — {match.pct}% compatible.</p>
            <a href={`/chat/${match.matchId}`} className="btn btn-primary" style={{ textDecoration: 'none', display: 'block', textAlign: 'center' }}>Say hi 👋</a>
            <button className="link-btn" onClick={() => setMatch(null)}>Keep browsing</button>
          </div>
        </div>
      )}
    </Shell>
  );
}

function Shell({ children, view, setView }) {
  return (
    <>
      <div className="topbar">
        <div className="wordmark">Nook<span className="dot" /></div>
        <div className="sub">{view === 'rooms' ? 'Rooms near you' : view === 'people' ? 'People near you' : ''}</div>
      </div>
      {setView && (
        <div className="viewtoggle">
          <button className={view === 'rooms' ? 'on' : ''} onClick={() => setView('rooms')}>🛏 Rooms available</button>
          <button className={view === 'people' ? 'on' : ''} onClick={() => setView('people')}>🤝 Looking to team up</button>
        </div>
      )}
      {children}
    </>
  );
}

function Card({ c, me }) {
  const isRoom = c.intent === 'has_place';
  const photos = (c.listing_photos || []).sort((a, b) => a.sort - b.sort);
  const photoUrl = photos[0]?.url || roomArtDataUri(c.avatar_color);
  const workIcon = c.org_type === 'study' ? '🎓' : '💼';

  return (
    <div className="card">
      {isRoom ? (
        <div className="photo">
          <img src={photoUrl} alt="room" />
          <div className="kind room">🛏 Room available</div>
          <div className="score"><b>{c.pct}%</b> match</div>
          <div className="rent-badge">₹{(c.budget || 0).toLocaleString('en-IN')}/mo</div>
        </div>
      ) : (
        <div className="av-hero" style={{ background: grad(c.avatar_color) }}>
          <div className="av-lg" style={{ background: grad(c.avatar_color) }}>{initials(c.name)}</div>
          <div className="kind team">🤝 Looking to team up</div>
          <div className="score"><b>{c.pct}%</b> match</div>
        </div>
      )}
      <div className="body">
        <div className="nm">
          <div className="mini-av2" style={{ background: grad(c.avatar_color) }}>{initials(c.name)}</div>
          <h3>{c.name}</h3><span className="age">{c.age}</span>
        </div>
        <div className="meta">
          <span>📍 {(c.areas || []).join(' / ')}</span>
          {isRoom
            ? <><span>🛏 {c.room_type}</span><span>💸 ₹{(c.budget || 0).toLocaleString('en-IN')}/mo</span></>
            : <span>💸 ₹{(c.budget || 0).toLocaleString('en-IN')}/mo budget</span>}
          <span>{workIcon} {c.org}</span>
        </div>
        {c.reasons?.length > 0 && (
          <div className={`why ${isRoom ? 'room' : 'team'}`}>✦ <span>You {c.reasons.join(', ')}.</span></div>
        )}
        {c.prompt1_a && <div className="prompt"><div className="q">{c.prompt1_q}</div><div className="a">{c.prompt1_a}</div></div>}
        {c.prompt2_a && <div className="prompt"><div className="q">{c.prompt2_q}</div><div className="a">{c.prompt2_a}</div></div>}
      </div>
    </div>
  );
}
