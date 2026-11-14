import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

// Landing page. If already signed in, skip straight into the app.
export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from('profiles').select('onboarded').eq('id', user.id).single();
    redirect(profile?.onboarded ? '/discover' : '/onboarding');
  }

  return (
    <div className="app landing">
      <div className="hero">
        <div className="wordmark">Nook<span className="dot" /></div>
        <h1>Find a flatmate you <em>actually</em> click with.</h1>
        <p>Have a spare room, or looking to find a new place with someone on your wavelength? Nook does both.</p>
      </div>
      <div className="landing-cta">
        <Link href="/login" className="btn btn-primary" style={{ textAlign: 'center', textDecoration: 'none' }}>
          Get started
        </Link>
        <div className="fine">Sign in with Google or your phone number</div>
      </div>
    </div>
  );
}
