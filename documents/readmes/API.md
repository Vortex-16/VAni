● You'll handle the edit yourself. Here's the complete Gmail setup, step by step:

  1. Create a Gmail App Password

  1. Go to https://myaccount.google.com/security and make sure 2-Step Verification is ON (App Passwords don't
  exist without it).
  2. Go to https://myaccount.google.com/apppasswords
  3. Name it anything (e.g. "VAni") → Create.
  4. Copy the 16-character password it shows (looks like abcd efgh ijkl mnop). Remove the spaces when you
  paste it.

  2. Add to your root .env

  Open D:\Discard\Discharge-Buddy4\.env and add these lines:

  SMTP_HOST=smtp.gmail.com
  SMTP_PORT=587
  SMTP_USER=youraddress@gmail.com
  SMTP_PASS=abcdefghijklmnop
  SMTP_FROM=youraddress@gmail.com

  - SMTP_USER = your full Gmail address.
  - SMTP_PASS = the 16-char app password (no spaces), not your normal Gmail password.
  - SMTP_FROM = same Gmail address (Gmail won't let you send "from" an arbitrary address).

  3. Restart the API server

  Env vars are read only at startup (email.ts:4-8), so the running server won't pick them up until restarted.
  After restart, confirm you see this in the logs:

  SMTP email transporter initialized successfully

  If you instead see SMTP credentials not fully configured, the variables aren't being read — double-check the
  file is at the repo root (D:\Discard\Discharge-Buddy4\.env), since src/env.ts:4 loads from ../../.env
  relative to the api-server folder.

  Common gotchas

  - Invalid login / BadCredentials error → you used your real password instead of an App Password, or left
  spaces in it.
  - Code still only appears in the console → the if (SMTP_HOST && SMTP_USER && SMTP_PASS) gate is still false;
  one of the three vars is missing or misspelled.
  - Emails land in spam → normal for Gmail-sent app mail; check the spam folder while testing.
  - Connection timeout → some networks block port 587; try SMTP_PORT=465 (the code automatically switches to
  secure: true for port 465, see email.ts:17).


The same ID appears throughout your docs. Since it no longer exists in Google Cloud Console, you must create
  a new OAuth client and swap the ID in. I can't do the Google Console part for you, but I'll walk you
  through it and then update all the code once you have the new ID.

  Part 1 — Create a new OAuth Client (Google Cloud Console)

  1. Go to https://console.cloud.google.com/
  2. Pick or create a project (top bar). If your old project was deleted entirely, create a new one. If only
  the client was deleted, reuse the existing project.
  3. Set up the consent screen if prompted: APIs & Services → OAuth consent screen → External → fill app name,
  your email → Save. Add your email under Test users while it's in "Testing" mode.
  4. Go to APIs & Services → Credentials → + Create Credentials → OAuth client ID.
  5. Application type: Web application (this is what your app uses — it falls back to webClientId on every
  platform).
  6. Under Authorized JavaScript origins, add:
    - http://localhost:8081
    - http://localhost:19006 (Expo web sometimes uses this)
    - your deployed frontend URL, if any
  7. Under Authorized redirect URIs, add the same origins (and your deployed URL). For Expo web,
  http://localhost:8081 is the key one.
  8. Click Create and copy the new Client ID (...apps.googleusercontent.com).

  Part 2 — Where the new ID goes (I'll do this)

  The new Web Client ID needs to be in two places, and they must match (the backend verifies the token's
  audience against GOOGLE_CLIENT_ID — auth.ts:55):

  ┌─────────────────────┬──────────────────────────────────┐
  │      Location       │             Variable             │
  ├─────────────────────┼──────────────────────────────────┤
  │ Frontend .env       │ EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID │
  ├─────────────────────┼──────────────────────────────────┤
  │ Root .env (backend) │ GOOGLE_CLIENT_ID                 │
  └─────────────────────┴──────────────────────────────────┘

  I'll also replace the dead hardcoded fallback in login.tsx:40 so a stale ID can't sneak back in.

  ---
  Once you have the new Client ID, paste it here and I'll update login.tsx, and tell you the exact .env lines
  to set.


*We Will Be Using Brevo To send Mails