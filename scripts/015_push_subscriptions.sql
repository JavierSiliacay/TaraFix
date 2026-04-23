-- 15. Push Subscriptions Table
create table if not exists public.push_subscriptions (
    id uuid primary key default gen_random_uuid(),
    user_email text not null,
    subscription jsonb not null,
    created_at timestamptz default now(),
    -- Ensure a user doesn't have duplicate identical subscriptions
    unique(user_email, subscription)
);

-- Enable RLS
alter table public.push_subscriptions enable row level security;

-- Policies
drop policy if exists "push_subscriptions_insert_all" on public.push_subscriptions;
create policy "push_subscriptions_insert_all" on public.push_subscriptions for insert with check (true);

drop policy if exists "push_subscriptions_select_own" on public.push_subscriptions;
create policy "push_subscriptions_select_own" on public.push_subscriptions for select using (
    auth.jwt() ->> 'email' = user_email
);

drop policy if exists "push_subscriptions_delete_own" on public.push_subscriptions;
create policy "push_subscriptions_delete_own" on public.push_subscriptions for delete using (
    auth.jwt() ->> 'email' = user_email
);
