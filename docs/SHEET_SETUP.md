# Sheet bridge setup (F-35, D-SYNC)

The app works fully offline on every phone. The Sheet bridge is how phones see each other's orders and money, and the cloud copy of the op log. Nothing is deployed from this repo; Steve does these steps once, on a **TEST** copy first.

1. Make a new Google Sheet (name it for example "Stall TEST"). Extensions → Apps Script.
2. Replace the editor's code with `apps-script/Code.gs` from this repo. Save.
3. Project Settings → Script Properties → add `STALL_KEY` with a word only the stall team knows.
4. Deploy → New deployment → type **Web app**. Execute as: **Me**. Who has access: **Anyone**. Deploy, allow the permissions, copy the URL that ends in `/exec`.
5. Open that URL in a browser: it should show `{"ok":true,"app":"stall-tokens-bridge","protocol":1}`.
6. On each phone: Stall → Settings → Sync → paste the URL and the stall key → Save. The app restarts its sync; the Settings row shows "Synced" or what went wrong.
7. Check on the TEST sheet that an order from one phone shows on the other, and rows appear in the `ops` tab. Then repeat with the real Sheet.

Notes
- The key keeps strangers from writing to the Sheet; it is not a login. Change it in Script Properties and on each phone if it leaks.
- The script only appends rows. Do not edit or delete rows in `ops` by hand; the app rebuilds state from the whole log.
- Apps Script quotas (free account): plenty for one fair stall with polling every 4–60 s (`CONFIG.sync`). If a day gets very busy, the app backs off by itself.
- A new deployment gives a new URL; "Manage deployments → Edit → New version" keeps the same URL.
