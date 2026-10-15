/*
 * thisisrooms analytics: receives the events js/site.js sends (section 6) and
 * adds one row per event to the first sheet of the spreadsheet it's bound to.
 *
 * Setup: in the Google Sheet, Extensions → Apps Script, replace the code with
 * this file, then Deploy → New deployment → Web app, 'Execute as: Me',
 * 'Who has access: Anyone'. Put the /exec URL in ANALYTICS_URL in js/site.js.
 * After editing this file, Deploy → Manage deployments → edit → New version,
 * so the URL stays the same.
 *
 * The web app only adds rows: there's no doGet, so the URL can't read the Sheet.
 */

const COLUMNS = ['time', 'visit', 'event', 'page', 'detail', 'value', 'source'];
const EVENTS = ['view', 'time', 'play', 'listen', 'read', 'click', 'signup', 'action'];

function doPost(e) {
  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return ContentService.createTextOutput('');
  }
  if (!data || EVENTS.indexOf(data.event) === -1) return ContentService.createTextOutput('');

  const field = function (name, max) {
    return String(data[name] == null ? '' : data[name]).slice(0, max);
  };
  const row = [
    new Date(),
    field('visit', 16),
    data.event,
    field('page', 200),
    field('detail', 200),
    /^\d+$/.test(field('value', 10)) ? Number(data.value) : field('value', 500),
    field('source', 100),
  ];

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    if (sheet.getLastRow() === 0) sheet.appendRow(COLUMNS);
    sheet.appendRow(row);
  } finally {
    lock.releaseLock();
  }
  return ContentService.createTextOutput('');
}
