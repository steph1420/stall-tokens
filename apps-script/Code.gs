/**
 * Stall Tokens Sheet bridge (F-35, D-SYNC, Q-SHEET-DEPLOY). Schema v1 of "Stall Tokens — Data (v2)".
 *
 * Source of truth: the append-only `ops` tab (one row per app op, idempotent by op_id). Every other data tab is an
 * append-only projection of `ops` written by this script in the same lock (one row per op, op_id on every row), and
 * the v_* tabs are formula views over those. Nothing here edits or deletes rows. The app rebuilds state from `ops`.
 *
 * Deploy (Steve, once): Extensions > Apps Script > paste this file > Project Settings > Script Properties:
 *   STALL_KEY = <shared stall key>  > Deploy > New deployment > Web app (Execute as: Me, Who has access: Anyone).
 * Protocol (POST, text/plain JSON body), mirrored by src/data/adapters/sheetTransport.ts:
 *   {action:'push', key, ops:[Op]}      -> {ok:true, stored:[opId], schema_v}
 *   {action:'pull', key, cursor:'<n>'}  -> {ok:true, ops:[Op], cursor:'<m>', schema_v}
 *   GET                                 -> {ok:true, app:'stall-tokens-bridge', protocol:1, schema_v}
 *   anything wrong                      -> {ok:false, error:'...'}
 * Future safe: columns are found by header name, new columns are only ever appended (ensureSchema_), and
 * _meta.schema_version records the layout; bump SCHEMA_VERSION and add columns at the end for a migration.
 * Money columns are integer paise (*_paise); times are ISO-8601 (ts_utc with Z, ts_ist with +05:30).
 */
var SCHEMA_VERSION = 1;
var CONTRACT_VERSION = 2;
var PULL_MAX = 500;
var PUSH_MAX = 500;
var IST_MS = 330 * 60000;

/** Tab -> ordered columns [name, type, description]. Shared by setup, projections and the _schema dictionary. */
var TABS = {
  ops: [
    ['op_id', 'text', 'Unique op id "<writer>:<seq>" (stable, never reused)'], ['schema_v', 'int', 'Sheet schema version at write'],
    ['contract_v', 'int', 'App op contract version'], ['device_id', 'text', 'Writer device (first part of writer)'],
    ['writer', 'text', 'Writer id (device + app load)'], ['seq', 'int', 'Per-writer sequence'], ['lamport', 'int', 'Lamport clock'],
    ['kind', 'enum', 'Op kind, e.g. order.create'], ['entity_id', 'text', 'Main id the op is about'],
    ['ts_utc', 'iso8601', 'Device wall time (display only), UTC'], ['ts_ist', 'iso8601', 'Same time in IST (+05:30)'],
    ['received_at_utc', 'iso8601', 'When the Sheet stored it'], ['payload_json', 'json', 'The whole op as JSON (source of truth)']],
  days: [['op_id', 'text', ''], ['ts_ist', 'iso8601', ''], ['day_id', 'text', 'Fair day id'], ['label', 'date', 'IST date YYYY-MM-DD']],
  orders: [['op_id', 'text', ''], ['ts_ist', 'iso8601', ''], ['order_id', 'text', ''], ['day_id', 'text', ''], ['token', 'int', 'Token number'], ['served_by', 'text', 'Serving name']],
  order_events: [['op_id', 'text', ''], ['ts_ist', 'iso8601', ''], ['order_id', 'text', ''], ['event', 'enum', 'send / delete / cancel / priority / client / note / discount / roundoff'], ['value', 'text', 'Main value (reason, name, note, on)'], ['amount_paise', 'int', 'Discount value / round-off amount'], ['detail_json', 'json', 'Op body']],
  order_lines: [['op_id', 'text', ''], ['ts_ist', 'iso8601', ''], ['order_id', 'text', ''], ['line_id', 'text', ''], ['item_id', 'text', ''], ['name', 'text', ''], ['price_paise', 'int', ''], ['qty', 'int', ''], ['category', 'text', ''], ['station_id', 'text', '']],
  line_events: [['op_id', 'text', ''], ['ts_ist', 'iso8601', ''], ['order_id', 'text', ''], ['line_id', 'text', ''], ['event', 'enum', 'qty / note / status / finish'], ['value', 'text', 'New qty, note or status']],
  payments: [['op_id', 'text', ''], ['ts_ist', 'iso8601', ''], ['day', 'date', 'IST date'], ['payment_id', 'text', ''], ['order_id', 'text', ''], ['cash_paise', 'int', ''], ['upi_paise', 'int', ''], ['upi_payee_id', 'text', ''], ['tip_paise', 'int', ''], ['waived_paise', 'int', ''], ['waived_by', 'text', ''], ['cash_given_paise', 'int', '']],
  refunds: [['op_id', 'text', ''], ['ts_ist', 'iso8601', ''], ['day', 'date', ''], ['refund_id', 'text', ''], ['order_id', 'text', ''], ['amount_paise', 'int', ''], ['source', 'enum', 'cash / upi']],
  money: [['op_id', 'text', ''], ['ts_ist', 'iso8601', ''], ['event', 'enum', 'add / void'], ['entry_id', 'text', ''], ['day_id', 'text', ''], ['dir', 'enum', 'spent / received'], ['amount_paise', 'int', ''], ['label', 'text', 'For / From'], ['kind', 'enum', 'normal / donation'], ['person_id', 'text', ''], ['parts_json', 'json', 'Paid by / Received in parts'], ['note', 'text', '']],
  settlements: [['op_id', 'text', ''], ['ts_ist', 'iso8601', ''], ['event', 'enum', 'pay / clear / undo / lock'], ['settle_id', 'text', 'payId / clearId / target'], ['day_id', 'text', ''], ['person_id', 'text', ''], ['amount_paise', 'int', 'Signed: + stall pays the person'], ['via', 'text', ''], ['by_person_id', 'text', ''], ['reason', 'text', ''], ['note', 'text', ''], ['detail_json', 'json', '']],
  menu: [['op_id', 'text', ''], ['ts_ist', 'iso8601', ''], ['item_id', 'text', ''], ['name', 'text', 'Blank = unchanged by this op'], ['price_paise', 'int', ''], ['category', 'text', ''], ['station_id', 'text', ''], ['count', 'int', ''], ['unit', 'text', ''], ['supply', 'bool', 'Stock only, never on the Menu'], ['sold_out', 'bool', ''], ['removed', 'bool', ''], ['fields_json', 'json', 'The partial update']],
  stock_moves: [['op_id', 'text', ''], ['ts_ist', 'iso8601', ''], ['item_id', 'text', ''], ['delta', 'int', ''], ['reason', 'text', 'panel / stock / paste']],
  people: [['op_id', 'text', ''], ['ts_ist', 'iso8601', ''], ['person_id', 'text', ''], ['name', 'text', ''], ['is_partner', 'bool', ''], ['share_pct', 'int', ''], ['removed', 'bool', '']],
  payees: [['op_id', 'text', ''], ['ts_ist', 'iso8601', ''], ['payee_id', 'text', ''], ['name', 'text', ''], ['upi_id', 'text', ''], ['removed', 'bool', '']],
  settings: [['op_id', 'text', ''], ['ts_ist', 'iso8601', ''], ['key', 'text', ''], ['value', 'text', '']]
};

/** Formula views (read-only; rebuilt by setup). */
var VIEWS = {
  v_devices: '=IFERROR(QUERY(ops!A:M,"select D, count(A), min(J), max(J) where A is not null group by D label count(A) \'ops\', min(J) \'first_ts_utc\', max(J) \'last_ts_utc\'",1),{"device_id","ops","first_ts_utc","last_ts_utc"})',
  v_daily_sales: '=IFERROR(QUERY(payments!A:L,"select C, sum(F)/100, sum(G)/100, sum(I)/100, sum(J)/100, count(D) where D is not null group by C label sum(F)/100 \'cash_inr\', sum(G)/100 \'upi_inr\', sum(I)/100 \'tips_inr\', sum(J)/100 \'waived_inr\', count(D) \'payments\'",1),{"day","cash_inr","upi_inr","tips_inr","waived_inr","payments"})',
  v_money_by_day: '=IFERROR(QUERY(money!A:L,"select E, F, sum(G)/100, count(D) where C = \'add\' group by E, F pivot I label sum(G)/100 \'inr\', count(D) \'entries\'",1),{"day_id","dir"})',
  v_stock_moves: '=IFERROR(QUERY(stock_moves!A:E,"select C, sum(D), count(A) where A is not null group by C label sum(D) \'net_delta\', count(A) \'moves\'",1),{"item_id","net_delta","moves"})'
};

function iso_(ms, offset) {
  var d = new Date(ms + offset);
  var s = d.toISOString().replace(/\.\d{3}Z$/, '');
  return offset ? s + '+05:30' : s + 'Z';
}
function day_(ms) { return iso_(ms, IST_MS).slice(0, 10); }
function json_(x) { return JSON.stringify(x === undefined ? null : x); }
function v_(x) { return x === undefined || x === null ? '' : x; }

/** op -> [tab, row object] or null. Every row carries op_id + ts_ist. */
function project_(op) {
  var b = op.body || {}; var k = op.kind;
  var base = { op_id: op.opId, ts_ist: iso_(op.wallAt, IST_MS) };
  function row(tab, o) { for (var key in o) base[key] = o[key]; return [tab, base]; }
  if (k === 'day.start') return row('days', { day_id: b.dayId, label: b.label });
  if (k === 'order.create') return row('orders', { order_id: b.orderId, day_id: b.dayId, token: b.token, served_by: b.servedBy });
  if (k === 'line.add') return row('order_lines', { order_id: b.orderId, line_id: b.lineId, item_id: b.itemId, name: b.name, price_paise: b.price, qty: b.qty, category: b.category, station_id: b.stationId });
  if (k === 'line.qty' || k === 'line.note' || k === 'line.status' || k === 'line.finish')
    return row('line_events', { order_id: b.orderId, line_id: b.lineId, event: k.slice(5), value: v_(k === 'line.qty' ? b.qty : k === 'line.note' ? b.note : b.status) });
  if (k.indexOf('order.') === 0) {
    var val = b.reason !== undefined ? b.reason : b.name !== undefined ? b.name : b.note !== undefined ? b.note : b.on !== undefined ? String(b.on) : b.kind !== undefined ? b.kind : '';
    return row('order_events', { order_id: b.orderId, event: k.slice(6), value: val, amount_paise: v_(b.value !== undefined ? b.value : b.amount), detail_json: json_(b) });
  }
  if (k === 'payment.add') return row('payments', { day: day_(op.wallAt), payment_id: b.paymentId, order_id: b.orderId, cash_paise: b.cash, upi_paise: b.upi, upi_payee_id: v_(b.upiPayeeId), tip_paise: b.tip, waived_paise: b.waived, waived_by: b.waivedBy, cash_given_paise: b.cashGiven });
  if (k === 'refund.add') return row('refunds', { day: day_(op.wallAt), refund_id: b.refundId, order_id: b.orderId, amount_paise: b.amount, source: b.source });
  if (k === 'entry.add') return row('money', { event: 'add', entry_id: b.entryId, day_id: b.dayId, dir: b.dir, amount_paise: b.amount, label: b.label, kind: b.kind, person_id: v_(b.personId), parts_json: json_(b.parts), note: b.note });
  if (k === 'entry.void') return row('money', { event: 'void', entry_id: b.entryId, note: b.reason });
  if (k.indexOf('settle.') === 0 || k === 'day.lock')
    return row('settlements', { event: k === 'day.lock' ? 'lock' : k.slice(7), settle_id: v_(b.payId || b.clearId || b.targetId), day_id: v_(b.dayId), person_id: v_(b.personId), amount_paise: v_(b.amount), via: v_(b.via), by_person_id: v_(b.byPersonId), reason: v_(b.reason), note: v_(b.note), detail_json: json_(b) });
  if (k === 'item.set') {
    var f = b.fields || {};
    return row('menu', { item_id: b.itemId, name: v_(f.name), price_paise: v_(f.price), category: v_(f.category), station_id: v_(f.stationId), count: v_(f.count), unit: v_(f.unit), supply: v_(f.supply), sold_out: v_(f.soldOut), removed: v_(f.removed), fields_json: json_(f) });
  }
  if (k === 'stock.adjust') return row('stock_moves', { item_id: b.itemId, delta: b.delta, reason: b.reason });
  if (k === 'person.set') return row('people', { person_id: b.personId, name: b.name, is_partner: b.isPartner, share_pct: b.sharePct, removed: b.removed });
  if (k === 'payee.set') return row('payees', { payee_id: b.payeeId, name: b.name, upi_id: b.upiId, removed: b.removed });
  if (k === 'setting.set') return row('settings', { key: b.key, value: b.value });
  return null; // a newer kind: kept in ops, projected once this script learns it
}

function entityId_(op) {
  var b = op.body || {};
  return v_(b.orderId || b.entryId || b.itemId || b.personId || b.payeeId || b.dayId || b.payId || b.clearId || b.targetId || b.key || '');
}

function doPost(e) {
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var want = PropertiesService.getScriptProperties().getProperty('STALL_KEY');
    if (!want) return reply_({ ok: false, error: 'STALL_KEY not set on the script' });
    if (body.key !== want) return reply_({ ok: false, error: 'wrong stall key' });
    ensureSchema_();
    if (body.action === 'push') return reply_(push_(body.ops));
    if (body.action === 'pull') return reply_(pull_(body.cursor));
    return reply_({ ok: false, error: 'unknown action' });
  } catch (err) {
    return reply_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function doGet() { return reply_({ ok: true, app: 'stall-tokens-bridge', protocol: 1, schema_v: SCHEMA_VERSION }); }

function headers_(sh) { return sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0]; }

/** Creates missing tabs / appends missing columns. Never reorders or removes. Cheap when the version matches. */
function ensureSchema_() {
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty('SCHEMA_DONE') === String(SCHEMA_VERSION)) return;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  for (var tab in TABS) {
    var cols = TABS[tab].map(function (c) { return c[0]; });
    var sh = ss.getSheetByName(tab);
    if (!sh) { sh = ss.insertSheet(tab); sh.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold'); sh.setFrozenRows(1); continue; }
    var have = sh.getLastColumn() ? headers_(sh) : [];
    var missing = cols.filter(function (c) { return have.indexOf(c) < 0; });
    if (missing.length) sh.getRange(1, have.length + 1, 1, missing.length).setValues([missing]).setFontWeight('bold');
  }
  var meta = ss.getSheetByName('_meta');
  if (meta) {
    var vals = meta.getDataRange().getValues();
    for (var i = 1; i < vals.length; i++) if (vals[i][0] === 'schema_version') meta.getRange(i + 1, 2).setValue(SCHEMA_VERSION);
  }
  props.setProperty('SCHEMA_DONE', String(SCHEMA_VERSION));
}

function appendObjects_(sh, objs) {
  if (!objs.length) return;
  var h = headers_(sh);
  var rows = objs.map(function (o) { return h.map(function (c) { return o[c] === undefined ? '' : o[c]; }); });
  sh.getRange(sh.getLastRow() + 1, 1, rows.length, h.length).setValues(rows);
}

function push_(ops) {
  if (!Array.isArray(ops)) return { ok: false, error: 'ops must be a list' };
  if (ops.length > PUSH_MAX) return { ok: false, error: 'too many ops in one push' };
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName('ops');
    var last = sh.getLastRow();
    var seen = {};
    if (last > 1) { var ids = sh.getRange(2, 1, last - 1, 1).getValues(); for (var i = 0; i < ids.length; i++) seen[ids[i][0]] = true; }
    var now = iso_(Date.now(), 0);
    var rows = []; var stored = []; var byTab = {};
    for (var j = 0; j < ops.length; j++) {
      var op = ops[j];
      if (!op || typeof op.opId !== 'string' || typeof op.kind !== 'string' || typeof op.wallAt !== 'number') continue;
      stored.push(op.opId);
      if (seen[op.opId]) continue; // idempotent by op_id
      seen[op.opId] = true;
      rows.push({ op_id: op.opId, schema_v: SCHEMA_VERSION, contract_v: op.v, device_id: String(op.writer || '').split('.')[0], writer: op.writer, seq: op.seq, lamport: op.lamport,
        kind: op.kind, entity_id: entityId_(op), ts_utc: iso_(op.wallAt, 0), ts_ist: iso_(op.wallAt, IST_MS), received_at_utc: now, payload_json: JSON.stringify(op) });
      var p = project_(op);
      if (p) (byTab[p[0]] = byTab[p[0]] || []).push(p[1]);
    }
    appendObjects_(sh, rows);
    for (var t in byTab) { var tsh = ss.getSheetByName(t); if (tsh) appendObjects_(tsh, byTab[t]); }
    return { ok: true, stored: stored, schema_v: SCHEMA_VERSION };
  } finally {
    lock.releaseLock();
  }
}

function pull_(cursor) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('ops');
  var col = headers_(sh).indexOf('payload_json') + 1;
  var total = Math.max(0, sh.getLastRow() - 1);
  var from = Math.max(0, Math.min(total, parseInt(cursor, 10) || 0));
  var n = Math.min(PULL_MAX, total - from);
  var ops = [];
  if (n > 0 && col > 0) {
    var vals = sh.getRange(2 + from, col, n, 1).getValues();
    for (var i = 0; i < vals.length; i++) { try { ops.push(JSON.parse(vals[i][0])); } catch (err) { /* hand-edited row: skipped */ } }
  }
  return { ok: true, ops: ops, cursor: String(from + n), schema_v: SCHEMA_VERSION };
}

function reply_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }

if (typeof module !== 'undefined') module.exports = { TABS: TABS, VIEWS: VIEWS, SCHEMA_VERSION: SCHEMA_VERSION, project_: project_, iso_: iso_ };
