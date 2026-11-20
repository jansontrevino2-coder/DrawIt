# DrawIt

Vercel-ready social drawing app using Supabase.

## Setup
1. Create a Supabase project.
2. Run `supabase.sql` once in the Supabase SQL Editor. This schema is for the new profile-based version.
3. In `app.js`, replace `YOUR_SUPABASE_URL` with the Project URL from Supabase Project Settings > API.
4. The supplied publishable key is already in `app.js`. Never use a service-role key in browser code.
5. Upload this folder to Vercel or import it from GitHub.

## Included
- Email/password authentication
- User profiles and avatar uploads
- Feed posts
- Text replies
- Dedicated drawing tab
- Brush, eraser, fill bucket, undo, and clear
- Responsive layout
- Row Level Security policies

Note: drawing replies are stored as PNG data URLs in the database for simplicity. For a high-traffic release, move them to a separate Storage bucket.
