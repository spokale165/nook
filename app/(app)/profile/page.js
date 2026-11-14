'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { grad, initials } from '@/lib/ui';

const CLEAN = ['', 'Very relaxed', 'Relaxed', 'Balanced', 'Tidy', 'Spotless'];
const SOCIAL = ['', 'Big homebody', 'Homebody', 'Balanced', 'Sociable', 'Very social'];

export default function Profile() {
  const supabase = createClient();
  const router = useRouter();
  const [p, setP] = useState(null);
  const [photos, setPhotos] = useState([]);

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    setP(data);
    if (data?.intent === 'has_place') {
      const { data: ph } = await supabase.from('listing_photos')
        .select('url, sort').eq('profile_id', user.id).order('sort');
      setPhotos(ph || []);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  if (!p) return (
    <>
      <div className="topbar"><div className="wordmark">Nook<span className="dot" /></div><div className="sub">You</div></div>
      <div className="empty">Loading…</div>
    </>
  );

  return (
    <>
      <div className="topbar"><div className="wordmark">Nook<span className="dot" /></div><div className="sub">You</div></div>
      <div className="scroll">
        <div className="prof-top">
          <div className="av" style={{ background: grad(p.avatar_color) }}>{initials(p.name)}</div>
          <h3>{p.name}, {p.age}</h3>
          <span className="pill">{p.intent === 'has_place' ? '🛏 Has a room' : '🤝 Looking to team up'}</span>
          <p>📍 {(p.areas || []).join(' · ')} · 💸 ₹{(p.budget || 0).toLocaleString('en-IN')}{p.intent === 'has_place' ? '/mo rent' : ' budget'}<br />
            {p.org_type === 'study' ? '🎓' : '💼'} {p.org || '—'}</p>
        </div>

        {photos.length > 0 && (
          <div className="card-box"><h4>Your room photos</h4>
            <div className="thumbs">{photos.map((ph, i) => <img key={i} className="thumb" src={ph.url} alt="" />)}</div>
          </div>
        )}

        <div className="card-box"><h4>Living style</h4>
          <Line k="Sleep" v={p.sleep === 'early' ? 'Early bird' : p.sleep === 'late' ? 'Night owl' : 'Flexible'} />
          <Line k="Tidiness" v={CLEAN[p.clean]} />
          <Line k="At home" v={SOCIAL[p.social]} />
          <Line k="Smoking" v={p.smoke ? 'Fine by me' : 'No thanks'} />
          <Line k="Pets" v={p.pets ? 'Love them' : 'Rather not'} />
        </div>

        <div style={{ padding: '4px 16px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <a href="/onboarding" className="btn btn-ghost" style={{ textDecoration: 'none', textAlign: 'center' }}>Edit profile</a>
          <button className="link-btn" onClick={signOut}>Sign out</button>
        </div>
      </div>
    </>
  );
}

function Line({ k, v }) {
  return <div className="stat-line"><span>{k}</span><span className="v">{v}</span></div>;
}
