# Supabase Deployment Notes

## What Changed

Swift Signate now uses Supabase Postgres for:

- users
- admins
- sessions
- shipments
- payment requests
- customer updates
- contact requests
- editable site content

The current auth UX stays the same. Users and admins still sign in through the app, but those records and sessions now persist in Supabase Postgres.

## Environment Variables

Set one of these in local development and in Vercel:

```env
SUPABASE_DB_URL=postgresql://postgres.your-project-ref:your-password@aws-0-your-region.pooler.supabase.com:6543/postgres
```

Or:

```env
DATABASE_URL=postgresql://postgres.your-project-ref:your-password@aws-0-your-region.pooler.supabase.com:6543/postgres
```

Use the Supabase pooler connection string for Vercel/serverless deployments.

## Vercel

1. Open your Vercel project.
2. Go to `Settings > Environment Variables`.
3. Add `SUPABASE_DB_URL` or `DATABASE_URL`.
4. Redeploy.

## Local Development

Run:

```bash
npm install
npm run build
npm run dev
```

If no Supabase Postgres connection string is set, the app falls back to the local SQLite files in `data/`.

## Notes

- The app auto-creates its tables on first connection.
- Default admin seed on first boot:
  - `admin@swiftsignate.com`
  - `Superswift@vakes.26`
- Payment receipts are still stored as data URLs in the database for now. For production scale, move them to Supabase Storage and store only file URLs.
