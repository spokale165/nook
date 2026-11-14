# Nook 🏠

A flatmate-matching web app — Hinge-style, but for finding rooms and flatmates.
Two modes: **list a spare room**, or **find a new flat with someone** on your wavelength.
Built with **Next.js** (App Router) + **Supabase** (Postgres, Auth, Storage, Realtime).

---

## What's inside

- **Two intents** — "I have a room" vs "I want to team up", chosen at onboarding.
- **Compatibility matching** — scored on budget, area, sleep, tidiness, smoking, pets (`lib/compat.js`).
- **Google + phone (SMS OTP) sign-in** — either works.
- **Room photo uploads** → Supabase Storage.
- **Swipe → mutual like → match** (created automatically by a database trigger).
- **Realtime chat** inside matches.
- **Row-Level Security** on every table so users only touch their own data.

```
app/
  page.js                 landing (redirects if signed in)
  login/                  Google + phone OTP
  auth/callback/          OAuth code exchange
  onboarding/             profile builder (writes to Supabase)
  (app)/                  signed-in shell (auth + onboarding guard + tab bar)
    discover/             the swipe deck
    matches/              your matches
    chat/[id]/            realtime 1:1 chat
    profile/              your profile
lib/
  supabase/               browser + server + middleware clients
  compat.js               compatibility scoring
  config.js               CITY + AREAS  ← change these to launch a new city
supabase/schema.sql       run this once in Supabase (tables, RLS, triggers, storage)
```

---

## Setup (about 15 minutes)

### 1. Create a Supabase project
Go to [supabase.com](https://supabase.com) → **New project**. Wait for it to finish provisioning.

### 2. Run the schema
In Supabase: **SQL Editor** → **New query** → paste the contents of
[`supabase/schema.sql`](supabase/schema.sql) → **Run**.
This creates all tables, the auto-match trigger, Row-Level Security policies, and the
`room-photos` storage bucket.

### 3. Get your keys
**Project Settings → API**. Copy the **Project URL** and the **anon public** key.

### 4. Configure the app locally
```bash
cp .env.local.example .env.local
```
Fill in:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 5. Enable sign-in providers
In Supabase → **Authentication → Providers**:

- **Google** — toggle on. You'll need a Google OAuth client
  ([console.cloud.google.com](https://console.cloud.google.com) → Credentials → OAuth client ID,
  type *Web*). Add this redirect URL to both Google and Supabase:
  `https://your-project.supabase.co/auth/v1/callback`
  Paste the Google client ID + secret into Supabase.

- **Phone** — toggle on. ⚠️ **Phone OTP needs an SMS provider** (Twilio, MessageBird, Vonage,
  or Textlocal/MSG91 for India). Add your provider's credentials in the same screen.
  SMS costs money per message, so Google is the cheaper default to start with.

### 6. Run it
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000).

---

## Deploy to Vercel

1. Push this folder to a **GitHub** repo.
2. On [vercel.com](https://vercel.com) → **Add New → Project** → import the repo.
3. Add the three env vars from your `.env.local` under **Settings → Environment Variables**
   (set `NEXT_PUBLIC_SITE_URL` to your real domain, e.g. `https://nook.app`).
4. Deploy. Every `git push` now auto-deploys.
5. In Supabase → **Authentication → URL Configuration**, add your Vercel domain to the
   **Redirect URLs** (and to your Google OAuth client's authorised redirects).

> **Billing note:** Vercel's free **Hobby** plan is for *personal, non-commercial* use only —
> the moment Nook is a real/commercial product you need **Pro ($20/mo)**. Supabase's free tier
> is fine for building and early testing but **pauses a project after 7 days of inactivity**;
> **Pro ($25/mo)** removes that and raises limits. Budget ~$45/mo once you're live.

---

## Where to take it next

- **Verification & moderation** on room photos (the classic scam vector) — add before launch.
- **Filters** — budget range, move-in date, area, smoking/pets.
- **Push notifications** for new matches and messages.
- **Report/block** + basic trust & safety.
- **Seed the first city** — launch hyper-local (a few neighbourhoods) to beat the cold-start problem.

The matching logic lives in `lib/compat.js` — tune the weights there as you learn what
actually predicts a good flatmate fit.
