// Deploy within the SAME Apps Script project, as USER_ACCESSING, with only the
// scopes in auth-manifest.json. The storage deployment retains owner execution.
// All helper names end in _ so HtmlService google.script.run cannot invoke them.
function loginDigest_(value) {
  return hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value, Utilities.Charset.UTF_8));
}

function googleLogin_(e) {
  var callback = 'https://sanstech-wedding-management-system.vercel.app/auth/callback';
  try {
    var p = e && e.parameter;
    if (!p || !/^[A-Za-z0-9_-]{43}$/.test(p.state || '') || !/^[A-Za-z0-9_-]{43}$/.test(p.nonce || '') ||
      !/^[A-Za-z0-9_-]{43}$/.test(p.challenge || '')) throw new Error('Invalid login request');
    // This token is minted by Google for the current execution, never supplied
    // by a URL/form/caller. Node verifies Google's signature on exchange.
    var token = ScriptApp.getIdentityToken();
    if (!token) throw new Error('Google identity unavailable');
    var claims = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(token.split('.')[1])).getDataAsString('UTF-8'));
    var active = Session.getActiveUser().getEmail().toLowerCase();
    var effective = Session.getEffectiveUser().getEmail().toLowerCase();
    if (!active || active !== effective || claims.email !== active || claims.email_verified !== true ||
      typeof claims.sub !== 'string' || !claims.sub || typeof claims.aud !== 'string' ||
      ['https://accounts.google.com', 'accounts.google.com'].indexOf(claims.iss) < 0 ||
      !Number.isSafeInteger(claims.exp) || claims.exp * 1000 <= Date.now()) throw new Error('Google identity mismatch');
    var code = loginDigest_(Utilities.getUuid() + Utilities.getUuid());
    var record = {state:p.state,nonce:p.nonce,challenge:p.challenge,idToken:token,audience:claims.aud,
      scriptId:ScriptApp.getScriptId(),expiresAt:Date.now()+120000};
    CacheService.getScriptCache().put('google-login:'+loginDigest_(code), JSON.stringify(record), 120);
    callback += '?state=' + encodeURIComponent(p.state) + '&code=' + code;
    // Fixed destination: caller cannot choose a redirect or receive an ID token.
    return HtmlService.createHtmlOutput('<!doctype html><html lang="id"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Lanjutkan ke SANSTECH</title><body style="font:17px system-ui;max-width:480px;margin:64px auto;padding:24px"><h1>Akun Google terverifikasi</h1><p>Lanjutkan untuk membuka aplikasi.</p><a target="_top" rel="noreferrer" href="'+callback.replace(/&/g,'&amp;')+'" style="display:inline-block;background:#14283f;color:white;padding:14px 20px;border-radius:10px;text-decoration:none">Lanjutkan ke SANSTECH</a></body></html>');
  } catch (error) {
    return HtmlService.createHtmlOutput('<!doctype html><html lang="id"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Masuk Google</title><body style="font:17px system-ui;padding:32px"><h1>Masuk belum selesai</h1><p>Buka kembali aplikasi dan ulangi masuk dengan Google.</p><a target="_top" rel="noreferrer" href="https://sanstech-wedding-management-system.vercel.app/auth/login">Kembali ke halaman masuk</a></body></html>');
  }
}

// Called only from a timestamped, HMAC-authenticated storage request while holding
// ScriptLock. The cache is shared by deployments of this one script project.
function exchangeGoogleLogin_(request) {
  if (!/^[a-f0-9]{64}$/.test(request.code || '') || !/^[A-Za-z0-9_-]{43}$/.test(request.verifier || '')) return {ok:false,code:'INVALID_LOGIN'};
  var cache = CacheService.getScriptCache(), key = 'google-login:'+loginDigest_(request.code);
  var raw = cache.get(key);
  if (!raw) return {ok:false,code:'EXPIRED_LOGIN'};
  var record = JSON.parse(raw);
  var challenge = Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,request.verifier,Utilities.Charset.UTF_8)).replace(/=+$/,'');
  if (record.expiresAt <= Date.now() || !equal_(record.state,request.state) || !equal_(record.nonce,request.authNonce) || !equal_(record.challenge,challenge)) return {ok:false,code:'INVALID_LOGIN'};
  cache.remove(key);
  return {ok:true,id_token:record.idToken,audience:record.audience,scriptId:record.scriptId};
}
