import { supabaseAdmin } from './supabase';

export type Message = {
  id: string; created_at: string;
  direction: 'in' | 'out'; channel: 'email' | 'form';
  thread: string; from_email: string; from_name: string | null; to_email: string;
  subject: string | null; text_body: string | null; html_body: string | null;
  message_id: string | null; in_reply_to: string | null; resend_id: string | null;
  order_id: string | null; client: string | null; read_at: string | null;
  attachments: { filename: string; content_type: string; size: number }[] | null;
};

export type Thread = { thread: string; name: string | null; last: Message; unread: number; count: number };

/** The other party's address, lowercased: what a conversation hangs on. */
export const threadKey = (email: string) => email.trim().toLowerCase();

export async function insertMessage(m: Omit<Message, 'id' | 'created_at' | 'read_at'> & { read_at?: string | null }): Promise<Message> {
  const { data, error } = await supabaseAdmin().from('messages').insert(m).select('*').single();
  if (error) throw new Error(`insertMessage: ${error.message}`);
  return data as Message;
}

export async function messageByResendId(resendId: string): Promise<Message | null> {
  const { data, error } = await supabaseAdmin().from('messages').select('*').eq('resend_id', resendId).maybeSingle();
  if (error) throw new Error(`messageByResendId: ${error.message}`);
  return (data as Message) ?? null;
}

/** Threads, newest activity first, from the last 1000 messages. */
export async function listThreads(): Promise<Thread[]> {
  const { data, error } = await supabaseAdmin().from('messages').select('*').order('created_at', { ascending: false }).limit(1000);
  if (error) throw new Error(`listThreads: ${error.message}`);
  const map = new Map<string, Thread>();
  for (const m of (data as Message[]) ?? []) {
    const t = map.get(m.thread) ?? { thread: m.thread, name: null, last: m, unread: 0, count: 0 };
    t.count += 1;
    if (m.direction === 'in' && !m.read_at) t.unread += 1;
    if (m.direction === 'in' && m.from_name && !t.name) t.name = m.from_name;
    map.set(m.thread, t);
  }
  return [...map.values()];
}

export async function threadMessages(thread: string): Promise<Message[]> {
  const { data, error } = await supabaseAdmin().from('messages').select('*').eq('thread', thread).order('created_at', { ascending: true }).limit(500);
  if (error) throw new Error(`threadMessages: ${error.message}`);
  return (data as Message[]) ?? [];
}

export async function markThreadRead(thread: string): Promise<void> {
  const { error } = await supabaseAdmin().from('messages').update({ read_at: new Date().toISOString() }).eq('thread', thread).eq('direction', 'in').is('read_at', null);
  if (error) throw new Error(`markThreadRead: ${error.message}`);
}

export async function unreadCount(): Promise<number> {
  const { count, error } = await supabaseAdmin().from('messages').select('id', { count: 'exact', head: true }).eq('direction', 'in').is('read_at', null);
  if (error) throw new Error(`unreadCount: ${error.message}`);
  return count ?? 0;
}

/** How many messages one client sent in the window (the contact form's cap). */
export async function messagesFromClient(client: string, windowMs: number): Promise<number> {
  const since = new Date(Date.now() - windowMs).toISOString();
  const { count, error } = await supabaseAdmin().from('messages').select('id', { count: 'exact', head: true }).eq('client', client).gte('created_at', since);
  if (error) throw new Error(`messagesFromClient: ${error.message}`);
  return count ?? 0;
}
