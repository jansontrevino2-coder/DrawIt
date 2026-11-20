# DrawIt

Vercel-ready static social app using Supabase Auth + Postgres. Users can make text posts and reply with text or canvas drawings.

## Setup
1. Create a Supabase project.
2. Run `supabase.sql` in its SQL Editor.
3. Open `app.js` and replace `YOUR_SUPABASE_URL` and `YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY`. Never use a service-role key in browser code.
4. Deploy this folder to Vercel.

For larger production use, migrate drawing PNGs from database text to Supabase Storage.
