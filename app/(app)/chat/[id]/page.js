'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { grad, initials } from '@/lib/ui';

export default function Chat() {
  const supabase = createClient();
  const { id: matchId } = useParams();
  const [me, setMe] = useState(null);
  const [other, setOther] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => { init(); /* eslint-disable-next-line */ }, [matchId]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  // Record that this user has now seen this match (clears the unread badge).
  async function markRead(uid) {
    await supabase.from('match_reads')
      .upsert({ match_id: matchId, user_id: uid, last_read_at: new Date().toISOString() });
  }

  async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    setMe(user);

    const { data: match } = await supabase.from('matches')
      .select('user_a, user_b').eq('id', matchId).single();
    if (!match) return;
    const otherId = match.user_a === user.id ? match.user_b : match.user_a;
    const { data: o } = await supabase.from('profiles').select('*').eq('id', otherId).single();
    setOther(o);

    const { data: history } = await supabase.from('messages')
      .select('*').eq('match_id', matchId).order('created_at', { ascending: true });
    setMsgs(history || []);
    markRead(user.id);

    // Live updates — new messages stream in without a refresh.
    const channel = supabase.channel(`chat:${matchId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `match_id=eq.${matchId}` },
        (payload) => {
          setMsgs((m) => (m.some((x) => x.id === payload.new.id) ? m : [...m, payload.new]));
          if (payload.new.sender_id !== user.id) markRead(user.id); // seen while viewing
        }
      ).subscribe();

    return () => supabase.removeChannel(channel);
  }

  async function send(e) {
    e.preventDefault();
    const body = text.trim();
    if (!body || !me) return;
    setText('');
    // No optimistic add: the realtime subscription delivers this message back
    // (to the sender too) and adds it once — avoids the message appearing twice.
    const { error } = await supabase.from('messages').insert({ match_id: matchId, sender_id: me.id, body });
    if (error) setText(body); // restore the text if the send failed
  }

  return (
    <>
      <div className="chat-head">
        <Link href="/matches" className="back">‹</Link>
        {other && <div className="av" style={{ background: grad(other.avatar_color) }}>{initials(other.name)}</div>}
        <div><b style={{ fontSize: 16 }}>{other ? `${other.name}, ${other.age}` : 'Chat'}</b></div>
      </div>
      <div className="bubbles">
        {msgs.map((m) => (
          <div key={m.id} className={`bub ${me && m.sender_id === me.id ? 'me' : 'them'}`}>{m.body}</div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form className="composer" onSubmit={send}>
        <input type="text" value={text} onChange={(e) => setText(e.target.value)} placeholder="Message…" />
        <button type="submit">➤</button>
      </form>
    </>
  );
}
