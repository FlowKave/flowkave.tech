# Supabase setup for FlowKave SaaS test portal

This project uses Supabase for the real `app.flowkave.tech` test flow:

- Email/password signup
- Email/password login
- Password recovery
- Tenant isolation
- Test subscription activation with `FLOWKAVE100` (100% discount, 0 toman)

## 1. Local env

Copy `.env.example` to `.env.local` and fill values from Supabase Project Settings → API Keys.

```bash
cp .env.example .env.local
```

Required values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Optional server-only key for future admin jobs only:

```env
SUPABASE_SECRET_KEY=sb_secret_...
```

Never commit `.env.local`.

## 2. Database schema/RLS

Open Supabase Dashboard → SQL Editor → New query, paste and run:

```text
supabase/schema.sql
```

This creates:

- `tenants`
- `tenant_members`
- `restaurants`
- `subscriptions`
- `sync_events`

RLS is enabled on all tables. Users can only read/write data for tenants they belong to.

## 3. Auth URL configuration

In Supabase Dashboard → Authentication → URL Configuration:

Local test:

```text
Site URL: http://localhost:3000
Redirect URLs:
http://localhost:3000/auth/callback
http://localhost:3000/reset-password
```

Production/staging test domain:

```text
Site URL: https://app.flowkave.tech
Redirect URLs:
https://app.flowkave.tech/auth/callback
https://app.flowkave.tech/reset-password
```

For password recovery, this app requests:

```text
/auth/callback?next=/reset-password
```

So `/auth/callback` must be allowed.

## 4. Test flow

Run local dev server:

```bash
npm run dev -- --hostname 127.0.0.1 --port 3000
```

Open:

```text
http://127.0.0.1:3000/signup
```

Then test:

1. Signup with real email/password.
2. Login at `/login`.
3. Open `/app/dashboard`.
4. Create test restaurant tenant.
5. Confirm subscription shows `FLOWKAVE100`, `100%`, `0 تومان`.
6. Test `/forgot-password` and reset password email.

## 5. Deployment note

For our test we can deploy `app.flowkave.tech` to Vercel or another Next.js host with the same env vars.

For real Iranian production, the final customer-facing infrastructure should move to an Iran-hosted stack so it remains reachable on national internet.
