'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();
  const [mode, setMode] = useState('choose'); // 'choose' | 'phone' | 'otp'
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function signInGoogle() {
    setError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) setError(error.message);
  }

  async function sendOtp(e) {
    e.preventDefault();
    setError(''); setBusy(true);
    // Expecting E.164 format, e.g. +919876543210
    const { error } = await supabase.auth.signInWithOtp({ phone });
    setBusy(false);
    if (error) setError(error.message);
    else setMode('otp');
  }

  async function verifyOtp(e) {
    e.preventDefault();
    setError(''); setBusy(true);
    const { error } = await supabase.auth.verifyOtp({ phone, token: code, type: 'sms' });
    setBusy(false);
    if (error) { setError(error.message); return; }
    router.push('/onboarding');
    router.refresh();
  }

  return (
    <div className="app">
      <div className="topbar"><div className="wordmark">Nook<span className="dot" /></div></div>
      <div className="scroll" style={{ justifyContent: 'center', padding: '0 24px 40px' }}>
        <div style={{ margin: 'auto 0' }}>
          <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.6px', marginBottom: 6 }}>
            Welcome to Nook
          </h2>
          <p style={{ color: 'var(--ink-soft)', marginBottom: 24 }}>Sign in to find your people.</p>

          {mode === 'choose' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button className="btn btn-google" onClick={signInGoogle}>
                <GoogleIcon /> Continue with Google
              </button>
              <button className="btn btn-ghost" onClick={() => setMode('phone')}>
                Continue with phone number
              </button>
            </div>
          )}

          {mode === 'phone' && (
            <form onSubmit={sendOtp} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="field">
                <label>Phone number <span className="hint">· with country code</span></label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210" autoFocus />
              </div>
              <button className="btn btn-primary" disabled={busy || phone.length < 8}>
                {busy ? 'Sending…' : 'Send code'}
              </button>
              <button type="button" className="link-btn" onClick={() => setMode('choose')}>← Back</button>
            </form>
          )}

          {mode === 'otp' && (
            <form onSubmit={verifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="field">
                <label>Enter the 6-digit code sent to {phone}</label>
                <input type="text" inputMode="numeric" value={code}
                  onChange={(e) => setCode(e.target.value)} placeholder="123456" autoFocus />
              </div>
              <button className="btn btn-primary" disabled={busy || code.length < 4}>
                {busy ? 'Verifying…' : 'Verify & continue'}
              </button>
              <button type="button" className="link-btn" onClick={() => setMode('phone')}>← Change number</button>
            </form>
          )}

          {error && <p className="errmsg" style={{ marginTop: 14 }}>{error}</p>}

          <p className="fine" style={{ marginTop: 28 }}>
            By continuing you agree to Nook&apos;s terms. A prototype build.
          </p>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.3 13.2 17.7 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.5 3-2.2 5.5-4.7 7.2l7.3 5.7c4.3-3.9 6.7-9.8 6.7-16.9z"/>
      <path fill="#FBBC05" d="M10.5 28.6c-.5-1.5-.8-3-.8-4.6s.3-3.1.8-4.6l-7.9-6.1C.9 16.5 0 20.1 0 24s.9 7.5 2.6 10.7l7.9-6.1z"/>
      <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.3-5.7c-2 1.4-4.7 2.3-7.9 2.3-6.3 0-11.7-3.7-13.5-9.1l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/>
    </svg>
  );
}
