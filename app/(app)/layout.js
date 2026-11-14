import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import TabBar from '@/components/TabBar';

// Shared shell for the signed-in app: guards auth + onboarding, shows tabs.
export default async function AppLayout({ children }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles').select('onboarded').eq('id', user.id).single();
  if (!profile?.onboarded) redirect('/onboarding');

  return (
    <div className="app">
      {children}
      <TabBar />
    </div>
  );
}
