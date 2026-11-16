# Sheet bridge setup (F-35, D-SYNC, Q-SHEET-DEPLOY)

The app works fully offline on every phone. The Sheet bridge is how phones see each other's orders and money, and the cloud copy of the op log.

## The Sheet (made 16 Nov 2026 19:40 IST, schema v1)
"Stall Tokens — Data (v2)" in Steve's Drive (search Drive for the name; the link is kept out of the repo by the leak scan).

| Tab | What it is |
| --- | --- |
| `_meta` | schema_version, contract_version, units, time format, rules (protected) |
| `_schema` | column dictionary: tab, column, type, description (protected) |
| `ops` | **source of truth**: append-only op log, one row per op, idempotent by `op_id` (`<writer>:<seq>`), `payload_json` = the whole op |
| `days`, `orders`, `order_events`, `order_lines`, `line_events`, `payments`, `refunds`, `money`, `settlements`, `menu`, `stock_moves`, `people`, `payees`, `settings` | append-only projections of `ops`, one row per op, `op_id` on every row, written by the bridge in the same lock |
| `v_devices`, `v_daily_sales`, `v_money_by_day`, `v_stock_moves` | formula views (QUERY) over the projections; read only |

Conventions: frozen bold header row, stable snake_case headers, no merged cells, money in integer paise (`*_paise`), times ISO-8601 (`ts_utc` …Z, `ts_ist` …+05:30), enum columns validated, data tabs protected with a warning (the bridge writes them; people should not). Columns are found by header name and new columns are only appended, so a later schema version never breaks old rows (`ensureSchema_` in `apps-script/Code.gs`; bump `SCHEMA_VERSION`).

## Deploy the bridge (Steve, one step, about 3 minutes; nothing is deployed from the repo)
In the Sheet: **Extensions → Apps Script** → replace the code with `apps-script/Code.gs` → **Project Settings → Script Properties → `STALL_KEY`** = a word only the stall team knows → **Deploy → New deployment → Web app** (Execute as: Me; Who has access: Anyone) → allow → copy the `/exec` URL.

Check: opening the URL shows `{"ok":true,"app":"stall-tokens-bridge","protocol":1,"schema_v":1}`.

## Phones
No pairing, no passcode. In the app: Stall → Settings → Developer → **Sign-in links**: fill the URL and key once, then make one link per person / role and send it to them. Opening the link sets up the phone (sync URL, key, role, name) and opens their screen. Or type URL + key under Settings → Sync. To revoke every link, change `STALL_KEY` in Script Properties and make new links.

Notes
- The key keeps strangers from writing to the Sheet; it is not a login.
- Do not edit, sort or delete rows in data tabs; the app rebuilds state from `ops`.
- "Manage deployments → Edit → New version" keeps the same URL when Code.gs changes.
