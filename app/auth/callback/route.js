import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// OAuth redirect lands here. Exchange the code for a session, then route the
// user to onboarding (new) or discover (returning).
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      let dest = '/onboarding';
      if (user) {
        const { data: profile } = await supabase
          .from('profiles').select('onboarded').eq('id', user.id).single();
        if (profile?.onboarded) dest = '/discover';
      }
      return NextResponse.redirect(`${origin}${dest}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
