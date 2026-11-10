# Security notes

This file explains how NotesPix is secured and what to check after deploying.

## 1. The API key in the browser is normal

`js/supabase-config.js` contains the Supabase project URL and the
**publishable** key (`sb_publishable_...`). Publishable keys are designed to be
used in browsers. They do **not** grant write access on their own — every
request is checked against the Row Level Security (RLS) policies in your
database.

What must never appear in this repository:

- the service-role key (`eyJ...` / `sb_secret_...`)
- database passwords
- any secret from the Supabase dashboard

If a secret ever leaks, rotate it in **Supabase → Settings → API**.

## 2. The real security boundary: RLS

Run `database/notespix-security.sql` in the Supabase SQL Editor. It is
idempotent — running it again will not duplicate policies. After running it:

| Table | Signed-out users | Signed-in users |
| --- | --- | --- |
| `resources` | read only | read; create/update/delete only their own |
| `saved_resources` | none | read/insert/delete only their own |
| `activity_log` | none | read/insert; clear their own rows |
| `support_requests` | none | create and read their own |
| `resource_reports` | none | create reports; read their own |
| `admin_users` | none | see only their own membership row |
| `profiles` | `id`, `full_name`, `created_at` only | plus update their own row |

Storage bucket `studyhub-resources` stays publicly readable (the site serves
files with public URLs), but uploads, updates and deletions are restricted to
each user's own `user-id/` folder.

To make an account an administrator, run:

```sql
insert into public.admin_users (user_id)
values ('<the auth.users id of the account>');
```

## 3. Client-side hardening in this build

- All user text is rendered with `textContent` or escaped through
  `NotesPixData.escapeHtml`, which fixes the stored XSS in the previous
  session/welcome header code.
- Raw database and auth errors are never shown to visitors;
  `NotesPixData.friendlyError` maps them to safe messages.
- Form inputs carry `maxlength` limits and passwords are capped at 72
  characters (Supabase/GoTrue limit).
- Profile data is no longer copied into `localStorage`.
- The Supabase client is served locally from `js/vendor/supabase.js`
  instead of a third-party CDN.
- Google Tag Manager loads through the local `js/analytics.js`.
- Legal links use `rel="noopener noreferrer"`, and every page sends
  `Referrer-Policy: strict-origin-when-cross-origin` via a meta tag.

## 4. GitHub Pages limitations

GitHub Pages cannot set HTTP response headers, so a full
`Content-Security-Policy` header is not possible there. The pages still carry
`<meta http-equiv="Content-Security-Policy" content="object-src 'none'; base-uri 'self'; form-action 'self'">`,
and `robots`/`referrer` meta tags. If you later move hosting to Netlify,
Cloudflare Pages or your own server, add these headers:

```
Content-Security-Policy: default-src 'self'; script-src 'self' https://www.googletagmanager.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://corbwhebbnrbibhqsmwx.supabase.co https://www.google-analytics.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'
Referrer-Policy: strict-origin-when-cross-origin
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Permissions-Policy: camera=(), microphone=(), geolocation=()
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

If you add that CSP while still on GitHub Pages, test the sign-in flow, uploads
and analytics first — Google Tag Manager sometimes needs extra origins in
`script-src`/`connect-src` depending on the tags it runs.

## 5. Recommended Supabase settings

Check these in the Supabase dashboard:

- **Authentication → Emails**: keep "Confirm email" enabled (the sign-up code
  already expects a confirmation link).
- **Authentication → Rate limits**: leave the defaults on.
- **API settings**: the anon/publishable key stays public, the service-role key
  stays server-side only.
- **Storage → studyhub-resources**: keep the bucket public for downloads and
  keep the per-user upload policies from the SQL file. Set the bucket file
  size limit (e.g. 10 MB) and allowed MIME types
  (`application/pdf`, `application/msword`,
  `application/vnd.openxmlformats-officedocument.wordprocessingml.document`,
  `application/vnd.ms-powerpoint`,
  `application/vnd.openxmlformats-officedocument.presentationml.presentation`)
  so oversize or wrong-type files are rejected by Supabase as well as by the
  browser form.
