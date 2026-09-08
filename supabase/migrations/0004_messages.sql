-- The inbox: every mail to hej@ (through Resend receiving) and every message from the contact form,
-- and every answer sent from admin. One row per message; a thread is the other party's address.
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  direction text not null check (direction in ('in', 'out')),
  channel text not null check (channel in ('email', 'form')),
  thread text not null,
  from_email text not null,
  from_name text,
  to_email text not null,
  subject text,
  text_body text,
  html_body text,
  message_id text,
  in_reply_to text,
  resend_id text unique,
  order_id uuid references orders(id) on delete set null,
  client text,
  read_at timestamptz,
  attachments jsonb
);
create index if not exists messages_thread_idx on messages (thread, created_at desc);
create index if not exists messages_unread_idx on messages (created_at desc) where read_at is null and direction = 'in';
create index if not exists messages_client_idx on messages (client, created_at desc);
alter table messages enable row level security;
