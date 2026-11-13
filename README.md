# NotesPix

NotesPix is a student resource-sharing website built with HTML, CSS and JavaScript.

## Run locally

Open `index.html` in a browser, or use a local static server such as VS Code Live Server.

## Supabase

The frontend Supabase configuration is in `js/supabase-config.js` and uses a browser-safe publishable key. Never add a Supabase service-role/secret key or database password to this repository.

The database security setup is preserved at `database/notespix-security.sql`. Review `SECURITY.md` and run the SQL in the Supabase SQL Editor only when setting up or updating the project's database policies.

## Deployment

This project includes GitHub Pages support files (`.nojekyll`, `CNAME` if present, `robots.txt`, and `sitemap.xml` where applicable). Configure GitHub Pages to publish from the repository branch/folder you use.
