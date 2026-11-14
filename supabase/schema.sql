-- ============================================================================
--  NOOK — database schema
--  Run this in your Supabase project: Dashboard → SQL Editor → paste → Run.
--  Safe to re-run (uses IF NOT EXISTS / CREATE OR REPLACE where possible).
-- ============================================================================

-- ---------------------------------------------------------------------------
--  1. PROFILES  (one row per user, linked to Supabase Auth)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null,
  age         int  not null check (age >= 18 and age <= 99),
  avatar_color int  not null default 0,          -- index into the gradient palette

  -- intent: 'has_place' (listing a room) or 'seeking_together' (find a new flat)
  intent      text not null check (intent in ('has_place','seeking_together')),

  org_type    text check (org_type in ('work','study')),
  org         text,                               -- company or college name
  areas       text[] not null default '{}',       -- neighbourhoods
  budget      int  not null,                       -- rent (has_place) or budget (seeking)

  -- lifestyle
  sleep       text check (sleep in ('early','flex','late')),
  clean       int  check (clean between 1 and 5),
  social      int  check (social between 1 and 5),
  guests      int  check (guests between 1 and 5),
  smoke       boolean not null default false,
  pets        boolean not null default false,

  -- prompts (Hinge-style)
  prompt1_q   text,
  prompt1_a   text,
  prompt2_q   text,
  prompt2_a   text,

  -- room details (only used when intent = 'has_place')
  room_type   text,
  furnished   text,
  available   text,

  onboarded   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
--  2. LISTING PHOTOS  (room photos; only has_place users add these)
-- ---------------------------------------------------------------------------
create table if not exists public.listing_photos (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  url         text not null,                       -- public URL from Storage
  sort        int  not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists listing_photos_profile_idx on public.listing_photos(profile_id);

-- ---------------------------------------------------------------------------
--  3. SWIPES  (a like or pass on someone)
-- ---------------------------------------------------------------------------
create table if not exists public.swipes (
  id          uuid primary key default gen_random_uuid(),
  swiper_id   uuid not null references public.profiles(id) on delete cascade,
  target_id   uuid not null references public.profiles(id) on delete cascade,
  liked       boolean not null,
  created_at  timestamptz not null default now(),
  unique (swiper_id, target_id)
);
create index if not exists swipes_target_idx on public.swipes(target_id);

-- ---------------------------------------------------------------------------
--  4. MATCHES  (created automatically when two people like each other)
--     user_a is always the lexicographically-smaller id so each pair is unique.
-- ---------------------------------------------------------------------------
create table if not exists public.matches (
  id          uuid primary key default gen_random_uuid(),
  user_a      uuid not null references public.profiles(id) on delete cascade,
  user_b      uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (user_a, user_b),
  check (user_a < user_b)
);

-- ---------------------------------------------------------------------------
--  5. MESSAGES  (chat within a match)
-- ---------------------------------------------------------------------------
create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  match_id    uuid not null references public.matches(id) on delete cascade,
  sender_id   uuid not null references public.profiles(id) on delete cascade,
  body        text not null check (char_length(body) between 1 and 2000),
  created_at  timestamptz not null default now()
);
create index if not exists messages_match_idx on public.messages(match_id, created_at);

-- ---------------------------------------------------------------------------
--  TRIGGER: when a LIKE is inserted, check for a reciprocal like.
--  If found, create a match (ordering the pair so user_a < user_b).
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_swipe()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  reciprocal boolean;
  a uuid;
  b uuid;
begin
  if new.liked then
    select exists(
      select 1 from public.swipes
      where swiper_id = new.target_id
        and target_id = new.swiper_id
        and liked = true
    ) into reciprocal;

    if reciprocal then
      if new.swiper_id < new.target_id then
        a := new.swiper_id; b := new.target_id;
      else
        a := new.target_id; b := new.swiper_id;
      end if;
      insert into public.matches(user_a, user_b)
      values (a, b)
      on conflict (user_a, user_b) do nothing;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists on_swipe_created on public.swipes;
create trigger on_swipe_created
  after insert on public.swipes
  for each row execute function public.handle_new_swipe();

-- keep updated_at fresh on profiles
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end; $$;
drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ============================================================================
--  ROW-LEVEL SECURITY
-- ============================================================================
alter table public.profiles       enable row level security;
alter table public.listing_photos enable row level security;
alter table public.swipes         enable row level security;
alter table public.matches        enable row level security;
alter table public.messages       enable row level security;

-- PROFILES: any signed-in user can view profiles (needed for discovery);
-- you may only insert/update your own.
drop policy if exists "profiles are viewable by authenticated" on public.profiles;
create policy "profiles are viewable by authenticated"
  on public.profiles for select to authenticated using (true);

drop policy if exists "insert own profile" on public.profiles;
create policy "insert own profile"
  on public.profiles for insert to authenticated with check (auth.uid() = id);

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile"
  on public.profiles for update to authenticated using (auth.uid() = id);

-- LISTING PHOTOS: viewable by all authenticated; editable only by the owner.
drop policy if exists "photos viewable" on public.listing_photos;
create policy "photos viewable"
  on public.listing_photos for select to authenticated using (true);

drop policy if exists "manage own photos" on public.listing_photos;
create policy "manage own photos"
  on public.listing_photos for all to authenticated
  using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- SWIPES: you can create and read only your own swipes.
drop policy if exists "insert own swipe" on public.swipes;
create policy "insert own swipe"
  on public.swipes for insert to authenticated with check (auth.uid() = swiper_id);

drop policy if exists "read own swipes" on public.swipes;
create policy "read own swipes"
  on public.swipes for select to authenticated using (auth.uid() = swiper_id);

-- MATCHES: you can only see matches you are part of.
drop policy if exists "see own matches" on public.matches;
create policy "see own matches"
  on public.matches for select to authenticated
  using (auth.uid() = user_a or auth.uid() = user_b);

-- MESSAGES: you can read/send messages only within your own matches.
drop policy if exists "read messages in my matches" on public.messages;
create policy "read messages in my matches"
  on public.messages for select to authenticated
  using (exists (
    select 1 from public.matches m
    where m.id = messages.match_id
      and (m.user_a = auth.uid() or m.user_b = auth.uid())
  ));

drop policy if exists "send messages in my matches" on public.messages;
create policy "send messages in my matches"
  on public.messages for insert to authenticated
  with check (
    sender_id = auth.uid() and exists (
      select 1 from public.matches m
      where m.id = messages.match_id
        and (m.user_a = auth.uid() or m.user_b = auth.uid())
    )
  );

-- Let chat update live (Supabase Realtime).
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.matches;

-- ============================================================================
--  STORAGE: bucket for room photos
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('room-photos', 'room-photos', true)
on conflict (id) do nothing;

-- Anyone can view room photos (bucket is public); only the owner can write to
-- their own folder (we store files under  <user-id>/<filename> ).
drop policy if exists "room photos public read" on storage.objects;
create policy "room photos public read"
  on storage.objects for select
  using (bucket_id = 'room-photos');

drop policy if exists "room photos owner write" on storage.objects;
create policy "room photos owner write"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'room-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "room photos owner delete" on storage.objects;
create policy "room photos owner delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'room-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
