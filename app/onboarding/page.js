'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { GRADS, grad, initials } from '@/lib/ui';
import { AREAS, CITY } from '@/lib/config';

const STEPS = 5;

export default function Onboarding() {
  const supabase = createClient();
  const router = useRouter();
  const [userId, setUserId] = useState(null);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [files, setFiles] = useState([]); // {file, preview}

  const [p, setP] = useState({
    name: '', age: 26, avatar_color: 0, intent: 'seeking_together',
    org_type: 'work', org: '', areas: [CITY ? 'Koramangala' : ''], budget: 20000,
    room_type: 'Private room · attached bath', sleep: 'early', clean: 4, social: 3,
    guests: 2, smoke: false, pets: true,
    prompt1_q: 'My ideal Sunday at home is…', prompt1_a: '',
    prompt2_q: 'A dealbreaker for me is…', prompt2_a: '',
  });
  const set = (k, v) => setP((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/login'); return; }
      setUserId(data.user.id);
    });
  }, [supabase, router]);

  function toggleArea(a) {
    set('areas', p.areas.includes(a) ? p.areas.filter((x) => x !== a) : [...p.areas, a]);
  }
  function addFiles(list) {
    const next = [...files, ...[...list].map((f) => ({ file: f, preview: URL.createObjectURL(f) }))];
    setFiles(next);
  }

  function validate() {
    if (step === 1) {
      if (!p.name.trim()) return 'Please add your name.';
      if (!p.age || p.age < 18) return 'Age is required (18+).';
    }
    if (step === 2 && !p.org.trim()) return p.org_type === 'study' ? 'College is required.' : 'Company is required.';
    if (step === 3) {
      if (p.areas.filter(Boolean).length === 0) return 'Pick at least one area.';
      if (p.intent === 'has_place' && files.length === 0) return 'Add at least one room photo.';
    }
    return '';
  }

  async function next() {
    const v = validate();
    if (v) { setErr(v); return; }
    setErr('');
    if (step < STEPS - 1) { setStep(step + 1); return; }
    await finish();
  }

  async function finish() {
    setSaving(true);
    try {
      const payload = {
        id: userId, ...p,
        areas: p.areas.filter(Boolean),
        onboarded: true,
        furnished: p.intent === 'has_place' ? 'Furnished' : null,
        available: p.intent === 'has_place' ? 'Flexible' : null,
      };
      const { error: pErr } = await supabase.from('profiles').upsert(payload);
      if (pErr) throw pErr;

      if (p.intent === 'has_place' && files.length) {
        await supabase.from('listing_photos').delete().eq('profile_id', userId);
        let i = 0;
        for (const { file } of files) {
          const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
          const path = `${userId}/${Date.now()}-${i}.${ext}`;
          const { error: upErr } = await supabase.storage
            .from('room-photos').upload(path, file, { upsert: true });
          if (upErr) throw upErr;
          const { data: pub } = supabase.storage.from('room-photos').getPublicUrl(path);
          await supabase.from('listing_photos').insert({ profile_id: userId, url: pub.publicUrl, sort: i });
          i++;
        }
      }
      router.push('/discover');
      router.refresh();
    } catch (e) {
      setErr(e.message || 'Something went wrong saving your profile.');
      setSaving(false);
    }
  }

  return (
    <div className="app">
      <div className="topbar">
        <div className="wordmark">Nook<span className="dot" /></div>
        <div className="sub">Step {step + 1} of {STEPS}</div>
      </div>
      <div className="progress"><i style={{ width: `${((step + 1) / STEPS) * 100}%` }} /></div>

      <div className="scroll">
        <div className="ob-head">
          <h2>{titleFor(step, p.intent)}</h2>
          <p>{subFor(step, p.intent)}</p>
        </div>
        <div className="ob-body">
          {step === 0 && (
            <>
              <div className={`choice ${p.intent === 'has_place' ? 'on' : ''}`} onClick={() => set('intent', 'has_place')}>
                <div className="ic">🛏</div>
                <div><h3>I have a flat with a spare room</h3><p>List your room, pick who moves in.</p></div>
              </div>
              <div className={`choice ${p.intent === 'seeking_together' ? 'on' : ''}`} onClick={() => set('intent', 'seeking_together')}>
                <div className="ic">🤝</div>
                <div><h3>I want to find a flat with someone</h3><p>Match with people, hunt for a place together.</p></div>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div className="field"><label>Your name <span className="req">*</span></label>
                <input type="text" value={p.name} onChange={(e) => set('name', e.target.value)} placeholder="First name" /></div>
              <div className="field"><label>Age <span className="req">*</span></label>
                <input type="number" value={p.age} min={18} max={99} onChange={(e) => set('age', +e.target.value)} /></div>
              <div className="field"><label>Pick your avatar colour</label>
                <div className="chips">
                  {GRADS.map((_, i) => (
                    <div key={i} className={`chip ${i === p.avatar_color ? 'on' : ''}`} onClick={() => set('avatar_color', i)}
                      style={{ background: grad(i), width: 40, height: 40, borderRadius: '50%', border: '2px solid var(--line)' }} />
                  ))}
                </div></div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="field"><label>Are you working or studying? <span className="req">*</span></label>
                <Seg value={p.org_type} opts={[['work', 'Working'], ['study', 'Studying']]} onChange={(v) => set('org_type', v)} /></div>
              <div className="field"><label>{p.org_type === 'study' ? 'Which college?' : 'Which company?'} <span className="req">*</span></label>
                <input type="text" value={p.org} onChange={(e) => set('org', e.target.value)} placeholder="Company or college name" /></div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="field"><label>{p.intent === 'has_place' ? "Where's the flat?" : 'Preferred areas'} <span className="req">*</span> <span className="hint">· {CITY}</span></label>
                <div className="chips">
                  {AREAS.map((a) => (
                    <div key={a} className={`chip ${p.areas.includes(a) ? 'on' : ''}`} onClick={() => toggleArea(a)}>{a}</div>
                  ))}
                </div></div>
              <div className="field"><label>{p.intent === 'has_place' ? 'Rent per person' : 'Your monthly budget'} <span className="hint">· ₹{p.budget.toLocaleString('en-IN')}{p.intent === 'has_place' ? '/mo' : ''}</span></label>
                <input type="range" min={8000} max={40000} step={1000} value={p.budget} onChange={(e) => set('budget', +e.target.value)} /></div>
              <div className="field"><label>Room setup</label>
                <Seg value={p.room_type} onChange={(v) => set('room_type', v)}
                  opts={[['Private room · attached bath', 'Private + bath'], ['Private room · shared bath', 'Private'], ['Shared room', 'Shared']]} /></div>
              {p.intent === 'has_place' && (
                <div className="field"><label>Room photos <span className="req">*</span></label>
                  <label className="uploader" htmlFor="photoInput"><span className="ic">📷</span>Tap to add room photos</label>
                  <input id="photoInput" type="file" accept="image/*" multiple hidden onChange={(e) => addFiles(e.target.files)} />
                  <div className="thumbs">{files.map((f, i) => <img key={i} className="thumb" src={f.preview} alt="" />)}</div>
                </div>
              )}
            </>
          )}

          {step === 4 && (
            <>
              <div className="field"><label>Sleep schedule</label>
                <Seg value={p.sleep} onChange={(v) => set('sleep', v)}
                  opts={[['early', 'Early bird'], ['flex', 'Flexible'], ['late', 'Night owl']]} /></div>
              <div className="field slider-row"><label>How tidy are you?</label>
                <div className="ends"><span>Relaxed</span><span>Spotless</span></div>
                <input type="range" min={1} max={5} value={p.clean} onChange={(e) => set('clean', +e.target.value)} /></div>
              <div className="field slider-row"><label>At home, you&apos;re more…</label>
                <div className="ends"><span>Homebody</span><span>Social</span></div>
                <input type="range" min={1} max={5} value={p.social} onChange={(e) => set('social', +e.target.value)} /></div>
              <div className="field"><label>Smoking in the flat?</label>
                <Seg value={p.smoke ? 'yes' : 'no'} onChange={(v) => set('smoke', v === 'yes')}
                  opts={[['no', 'No thanks'], ['yes', 'Fine by me']]} /></div>
              <div className="field"><label>Pets?</label>
                <Seg value={p.pets ? 'yes' : 'no'} onChange={(v) => set('pets', v === 'yes')}
                  opts={[['yes', 'Love them'], ['no', 'Rather not']]} /></div>
              <div className="field"><label>A prompt <span className="hint">· optional</span></label>
                <input type="text" value={p.prompt1_a} onChange={(e) => set('prompt1_a', e.target.value)} placeholder={p.prompt1_q} /></div>
            </>
          )}

          {err && <p className="errmsg">{err}</p>}
        </div>

        <div className="ob-foot">
          {step > 0 && <button className="btn btn-ghost" onClick={() => setStep(step - 1)} disabled={saving}>Back</button>}
          <button className="btn btn-primary" onClick={next} disabled={saving}>
            {saving ? 'Saving…' : step === STEPS - 1 ? 'Find flatmates' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Seg({ value, opts, onChange }) {
  return (
    <div className="seg">
      {opts.map(([v, label]) => (
        <button key={v} className={value === v ? 'on' : ''} onClick={() => onChange(v)} type="button">{label}</button>
      ))}
    </div>
  );
}

function titleFor(step, intent) {
  return ['What brings you to Nook?', 'The basics', 'Work or study',
    intent === 'has_place' ? 'List your room' : 'Place & budget', 'Your living style'][step];
}
function subFor(step, intent) {
  return ['This changes who you see.', 'Age and a photo help people trust your card.',
    'Shown on your card — builds trust.',
    intent === 'has_place' ? 'Add the details people need to decide.' : 'We match on budget and area first.',
    'The stuff that actually causes friction.'][step];
}
