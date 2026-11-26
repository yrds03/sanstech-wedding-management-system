/* Keep this standalone script project private to its owner.
 * Deploy as a Web App, executing as its owner, accessible to Anyone.
 * The endpoint is public; every operation requires a timestamped HMAC from Vercel.
 * Script Properties: DRIVE_GATEWAY_SECRET (>=32 random characters), DRIVE_FILE_ID.
 * Run setupStorage once from the editor before deployment. Never log the secret/data.
 */
var SNAPSHOT_FORMAT = 'sanstech-pglite-0.6.0-aes256gcm-gzip-v2';
var MAX_DATA_LENGTH = 8 * 1024 * 1024;
// The login deployment uses an immutable version with mode google_login and
// identity-only OAuth scopes. Never run storage operations as a visiting user.
var WMS_DEPLOYMENT_MODE = 'storage';
// Destinations supplied by the owner. IDs are not credentials.
var DEFAULT_FOLDER_ID = '1GcHlIs-dL1ZbRMaZNHcDeYByHeeoFzP7';
var DEFAULT_SHEET_ID = '1uGUbw8vMLeZrbIWxiHZ7BWEde5n55cDmxRTY9B4rYBA';
var TABLE_HEADERS = [
  {name: 'SANSTECH_Workspace', headers: ['ID_Workspace', 'Tipe', 'Nama_Workspace', 'Slug', 'ID_Pemilik', 'Status', 'Dibuat_UTC']},
  {name: 'SANSTECH_Acara', headers: ['ID_Acara', 'ID_Workspace', 'Judul_Acara', 'Mempelai_Wanita', 'Mempelai_Pria', 'Tanggal', 'Jam_Mulai', 'Jam_Selesai', 'Zona_Waktu', 'Tempat', 'Alamat', 'Kota', 'Status', 'Paket', 'Lisensi']},
  {name: 'SANSTECH_Tamu', headers: ['ID_Grup', 'ID_Acara', 'Nama_Penerima', 'Tipe_Undangan', 'Kapasitas_Orang', 'Kategori', 'Meja', 'Izinkan_Tampil_TV', 'Dibuat_UTC']},
  {name: 'SANSTECH_RSVP', headers: ['ID_Grup', 'ID_Acara', 'Status_RSVP', 'Jumlah_Orang', 'Catatan', 'Diperbarui_UTC']},
  {name: 'SANSTECH_Checkin', headers: ['ID_Transaksi', 'ID_Acara', 'ID_Grup', 'ID_Petugas', 'Delta_Orang', 'Metode', 'Alasan_Koreksi', 'Kunci_Idempotensi', 'Dibuat_UTC']},
  {name: 'SANSTECH_Tim', headers: ['ID_Acara', 'ID_Pengguna', 'Peran', 'Status', 'Dibuat_UTC']},
  {name: 'SANSTECH_Audit', headers: ['ID_Audit', 'ID_Workspace', 'ID_Acara', 'ID_Pelaku', 'Aksi', 'Tipe_Entitas', 'ID_Entitas', 'Keterangan', 'Dibuat_UTC']},
  {name: 'SANSTECH_Kamus_Kolom', headers: ['Nama_Tab', 'Urutan_Kolom', 'Nama_Kolom', 'Keterangan']}
];

function prepareSheetHeaders_(spreadsheet) {
  // Preflight every existing header before changing any table.
  TABLE_HEADERS.forEach(function(definition) {
    var sheet = spreadsheet.getSheetByName(definition.name);
    if (!sheet || sheet.getLastRow() === 0) return;
    var existing = sheet.getRange(1, 1, 1, definition.headers.length).getDisplayValues()[0];
    if (existing.some(function(value, i) { return value && value !== definition.headers[i]; })) {
      throw new Error('Header tab ' + definition.name + ' berbeda. Data yang ada tidak diubah.');
    }
  });
  var created = [];
  TABLE_HEADERS.forEach(function(definition) {
    var sheet = spreadsheet.getSheetByName(definition.name);
    if (!sheet) { sheet = spreadsheet.insertSheet(definition.name); created.push(definition.name); }
    sheet.getRange(1, 1, 1, definition.headers.length).setValues([definition.headers]).setFontWeight('bold').setBackground('#14283f').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, definition.headers.length);
  });
  var dictionary = spreadsheet.getSheetByName('SANSTECH_Kamus_Kolom');
  if (dictionary.getLastRow() <= 1) {
    var rows = [];
    TABLE_HEADERS.filter(function(d) { return d.name !== 'SANSTECH_Kamus_Kolom'; }).forEach(function(d) {
      d.headers.forEach(function(header, index) { rows.push([d.name, index + 1, header, 'Templat kolom; data utama aplikasi tersimpan terenkripsi di Drive.']); });
    });
    if (rows.length) dictionary.getRange(2, 1, rows.length, 4).setValues(rows);
  }
  SpreadsheetApp.flush();
  return {ok: true, created: created, tables: TABLE_HEADERS.map(function(d) { return d.name; })};
}

/** Run by the authenticated script owner; no secret is needed to create headers. */
function setupSpreadsheetHeaders() {
  var lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    var id = PropertiesService.getScriptProperties().getProperty('DRIVE_SHEET_ID') || DEFAULT_SHEET_ID;
    return prepareSheetHeaders_(SpreadsheetApp.openById(id));
  } finally { lock.releaseLock(); }
}

function setupAll() {
  var headers = setupSpreadsheetHeaders();
  setupStorage();
  return headers;
}

function assertStorageWriters_(file) {
  if (file.getEditors().length || file.getViewers().length || file.getSharingAccess() !== DriveApp.Access.PRIVATE ||
    file.getSharingPermission() === DriveApp.Permission.EDIT) throw new Error('Storage must be private to its owner.');
}

// Write operational metadata only, even if the owner later shares the sheet;
// never copy guest details, identity tokens, database bytes or secrets into it.
function syncStatus_(snapshot) {
  try {
    var properties = PropertiesService.getScriptProperties();
    var id = properties.getProperty('DRIVE_SHEET_ID') || DEFAULT_SHEET_ID;
    var spreadsheet = SpreadsheetApp.openById(id);
    var sheet = spreadsheet.getSheetByName('SANSTECH_Status');
    if (!sheet) sheet = spreadsheet.insertSheet('SANSTECH_Status');
    var marker = sheet.getRange('A1').getValue();
    if (marker && marker !== 'SANSTECH_STORAGE_V2') return false;
    sheet.getRange(1, 1, 6, 2).setValues([
      ['SANSTECH_STORAGE_V2', 'Panel koneksi aplikasi'], ['Status', 'Terhubung'],
      ['Versi commit', snapshot.version], ['Diperbarui UTC', new Date().toISOString()],
      ['Ukuran snapshot base64', snapshot.data ? snapshot.data.length : 0], ['Penyimpanan', 'Google Drive - AES-256-GCM']
    ]);
    SpreadsheetApp.flush();
    return true;
  } catch (error) { return false; }
}

function setupStorage() {
  var properties = PropertiesService.getScriptProperties();
  var secret = properties.getProperty('DRIVE_GATEWAY_SECRET');
  if (!secret || secret.length < 32) throw new Error('Set DRIVE_GATEWAY_SECRET before setup.');
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var existing = properties.getProperty('DRIVE_FILE_ID');
    if (existing) {
      var current = DriveApp.getFileById(existing); assertStorageWriters_(current);
      if (!syncStatus_(JSON.parse(current.getBlob().getDataAsString('UTF-8')))) throw new Error('Spreadsheet status cannot be updated.');
      return;
    }
    var folderId = properties.getProperty('DRIVE_FOLDER_ID') || DEFAULT_FOLDER_ID;
    var folder = DriveApp.getFolderById(folderId);
    assertStorageWriters_(folder);
    if (folder.getFilesByName('database.encrypted.snapshot.json').hasNext()) throw new Error('A snapshot already exists. Recover its DRIVE_FILE_ID instead of creating another database.');
    var initial = {version: 0, data: null, checksum: null, format: SNAPSHOT_FORMAT};
    // Existing folder sharing is preserved. All nonempty payloads are encrypted by Vercel.
    var file = folder.createFile('database.encrypted.snapshot.json', JSON.stringify(initial), MimeType.PLAIN_TEXT);
    assertStorageWriters_(file);
    properties.setProperty('DRIVE_FILE_ID', file.getId());
    properties.setProperty('DRIVE_FOLDER_ID', folderId);
    properties.setProperty('DRIVE_SHEET_ID', properties.getProperty('DRIVE_SHEET_ID') || DEFAULT_SHEET_ID);
    if (!syncStatus_(initial)) throw new Error('Storage created; spreadsheet status needs access. Rerun setupStorage after fixing spreadsheet access.');
  } finally { lock.releaseLock(); }
}

function hex_(bytes) { return bytes.map(function(b) { return ('0' + ((b + 256) % 256).toString(16)).slice(-2); }).join(''); }
function equal_(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  var mismatch = 0;
  for (var i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}
function output_(value) { return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON); }
function doGet(e) {
  if (WMS_DEPLOYMENT_MODE === 'google_login') return googleLogin_(e);
  return output_({ok: false, code: 'METHOD_NOT_ALLOWED'});
}

function doPost(e) {
  var lock;
  try {
    if (WMS_DEPLOYMENT_MODE !== 'storage') return output_({ok: false, code: 'METHOD_NOT_ALLOWED'});
    if (!e || !e.postData || e.postData.contents.length > MAX_DATA_LENGTH + 2048) return output_({ok: false, code: 'INVALID_REQUEST'});
    var envelope = JSON.parse(e.postData.contents);
    var properties = PropertiesService.getScriptProperties();
    var secret = properties.getProperty('DRIVE_GATEWAY_SECRET');
    if (!secret || secret.length < 32 || typeof envelope.message !== 'string') return output_({ok: false, code: 'UNAUTHORIZED'});
    var expected = hex_(Utilities.computeHmacSha256Signature(envelope.message, secret, Utilities.Charset.UTF_8));
    if (!equal_(expected, envelope.signature)) return output_({ok: false, code: 'UNAUTHORIZED'});
    var request = JSON.parse(envelope.message);
    if (!Number.isSafeInteger(request.timestamp) || Math.abs(Date.now() - request.timestamp) > 120000 ||
      typeof request.nonce !== 'string' || !/^[a-f0-9-]{36}$/.test(request.nonce)) return output_({ok: false, code: 'EXPIRED_REQUEST'});
    if (request.action !== 'read' && request.action !== 'commit' && request.action !== 'setup_headers' && request.action !== 'exchange_auth_code') return output_({ok: false, code: 'INVALID_REQUEST'});
    lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) return output_({ok: false, code: 'BUSY'});
    if (request.action === 'exchange_auth_code') return output_(exchangeGoogleLogin_(request));
    if (request.action === 'setup_headers') return output_(prepareSheetHeaders_(SpreadsheetApp.openById(properties.getProperty('DRIVE_SHEET_ID') || DEFAULT_SHEET_ID)));
    var file = DriveApp.getFileById(properties.getProperty('DRIVE_FILE_ID'));
    assertStorageWriters_(file);
    var snapshot = JSON.parse(file.getBlob().getDataAsString('UTF-8'));
    if (snapshot.format !== SNAPSHOT_FORMAT || !Number.isSafeInteger(snapshot.version) || snapshot.version < 0 ||
      (snapshot.data === null && snapshot.version !== 0) ||
      (snapshot.data !== null && (typeof snapshot.data !== 'string' || hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, snapshot.data, Utilities.Charset.UTF_8)) !== snapshot.checksum))) return output_({ok: false, code: 'CORRUPT_STORAGE'});
    if (request.action === 'read') return output_({ok: true, snapshot: snapshot});
    if (!Number.isSafeInteger(request.baseVersion) || request.baseVersion < 0 || request.format !== SNAPSHOT_FORMAT ||
      typeof request.data !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(request.data) || request.data.length > MAX_DATA_LENGTH ||
      hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, request.data, Utilities.Charset.UTF_8)) !== request.checksum) return output_({ok: false, code: 'INVALID_REQUEST'});
    if (snapshot.version !== request.baseVersion) return output_({ok: true, committed: false});
    if (snapshot.version >= Number.MAX_SAFE_INTEGER) return output_({ok: false, code: 'VERSION_LIMIT'});
    var committed = {version: snapshot.version + 1, data: request.data, checksum: request.checksum, format: SNAPSHOT_FORMAT};
    file.setContent(JSON.stringify(committed));
    // Metadata failure never rolls back an already committed check-in.
    return output_({ok: true, committed: true, sheetSynced: syncStatus_(committed)});
  } catch (error) {
    return output_({ok: false, code: 'STORAGE_UNAVAILABLE'});
  } finally { if (lock && lock.hasLock()) lock.releaseLock(); }
}
