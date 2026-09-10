@AGENTS.md

# Working rules for this repo (owner's, 2026-09-10)

Read `HANDOFF.md` → "Status" block first; `DECISIONS.md` explains why things are the way they are.

- **Push once per task.** Every push to `billedarv-redesign` (and the fast-forward to `main`) is a Netlify build on the owner's credits. Commit locally as often as needed, verify locally, push once when the task is done or when the owner says "push". Say "not pushed yet" when commits are waiting.
- **Before a push:** `npm test`, `npm run build`, `BASE=http://localhost:3000 node tests/viewport.browser.mjs`. `next dev` tolerates what the production build rejects.
- **Never** run `netlify build` or `netlify deploy --build` on Windows (breaks sharp; `npm install` repairs).
- **Dev server** only through the editor preview (`billede-dev` in `.claude/launch.json`), never a shell.
- **Production data:** `.env.local` points the dev server and every test at the live Supabase. Tag test visits `?utm_source=pwtest` (admin filters it), put test orders back as found, never delete production rows without the owner's yes.
- **Secrets never in chat.** Keys go into `.env.local` via Notepad (open the file for the owner) or straight into Netlify. The admin password is in `.env.local`; open it, do not read it.
- **Phone first.** The audience is 45–70 on a phone from Facebook. Verify phone flows with Playwright at 390×660–780 and in WebKit (`devices['iPhone 13']`); Facebook's in-app browser is about 360×560.
- **Meta:** Ads Manager only through the owner's Chrome (Composio's Meta connection is blocked); any change there needs the owner's explicit yes. Campaign facts and blockers: `HANDOFF.md`, `docs/meta-ads-prompt.md`.
