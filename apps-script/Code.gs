/**
 * Stall Tokens Sheet bridge (F-35, D-SYNC). Paste into the Apps Script editor of a Google Sheet (a TEST copy first),
 * set the Script Property STALL_KEY, then Deploy > New deployment > Web app (Execute as: Me, Who has access: Anyone).
 * Protocol (POST, text/plain JSON body), mirrored by src/data/adapters/sheetTransport.ts:
 *   {action:'push', key, ops:[Op]}      -> {ok:true, stored:[opId]}   (append-only; an opId already stored is skipped)
 *   {action:'pull', key, cursor:'<n>'}  -> {ok:true, ops:[Op], cursor:'<m>'}  (rows after n, at most PULL_MAX)
 *   anything wrong                      -> {ok:false, error:'...'}
 * Sheet tab "ops": A opId, B writer, C kind, D op JSON, E received at (ISO). Row 1 is the header.
 * Nothing here deletes or edits rows; the app's fold makes sense of the log.
 */
var TAB = 'ops';
var PULL_MAX = 500;
var PUSH_MAX = 500;

function doPost(e) {
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var want = PropertiesService.getScriptProperties().getProperty('STALL_KEY');
    if (!want) return reply_({ ok: false, error: 'STALL_KEY not set on the script' });
    if (body.key !== want) return reply_({ ok: false, error: 'wrong stall key' });
    if (body.action === 'push') return reply_(push_(body.ops));
    if (body.action === 'pull') return reply_(pull_(body.cursor));
    return reply_({ ok: false, error: 'unknown action' });
  } catch (err) {
    return reply_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function doGet() {
  return reply_({ ok: true, app: 'stall-tokens-bridge', protocol: 1 });
}

function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(TAB);
  if (!sh) {
    sh = ss.insertSheet(TAB);
    sh.appendRow(['opId', 'writer', 'kind', 'op', 'receivedAt']);
    sh.setFrozenRows(1);
  }
  return sh;
}

function push_(ops) {
  if (!Array.isArray(ops)) return { ok: false, error: 'ops must be a list' };
  if (ops.length > PUSH_MAX) return { ok: false, error: 'too many ops in one push' };
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sh = sheet_();
    var last = sh.getLastRow();
    var seen = {};
    if (last > 1) {
      var ids = sh.getRange(2, 1, last - 1, 1).getValues();
      for (var i = 0; i < ids.length; i++) seen[ids[i][0]] = true;
    }
    var now = new Date().toISOString();
    var rows = [];
    var stored = [];
    for (var j = 0; j < ops.length; j++) {
      var op = ops[j];
      if (!op || typeof op.opId !== 'string' || typeof op.kind !== 'string') continue;
      stored.push(op.opId);
      if (seen[op.opId]) continue;
      seen[op.opId] = true;
      rows.push([op.opId, String(op.writer || ''), op.kind, JSON.stringify(op), now]);
    }
    if (rows.length) sh.getRange(last + 1, 1, rows.length, 5).setValues(rows);
    return { ok: true, stored: stored };
  } finally {
    lock.releaseLock();
  }
}

function pull_(cursor) {
  var sh = sheet_();
  var total = Math.max(0, sh.getLastRow() - 1);
  var from = Math.max(0, Math.min(total, parseInt(cursor, 10) || 0));
  var n = Math.min(PULL_MAX, total - from);
  var ops = [];
  if (n > 0) {
    var vals = sh.getRange(2 + from, 4, n, 1).getValues();
    for (var i = 0; i < vals.length; i++) {
      try { ops.push(JSON.parse(vals[i][0])); } catch (err) { /* a hand-edited row; skip it */ }
    }
  }
  return { ok: true, ops: ops, cursor: String(from + n) };
}

function reply_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
