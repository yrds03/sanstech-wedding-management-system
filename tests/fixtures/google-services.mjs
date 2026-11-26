// Explicit local test preload only. Never imported by application code.
// The production build runs unchanged; only external Google services are simulated.
import {createHash, createHmac} from 'node:crypto';
import vm from 'node:vm';
import fs from 'node:fs';
import {generateKeyPair, exportJWK, SignJWT} from 'jose';
import {createServer} from 'node:http';
import {randomUUID} from 'node:crypto';
if (process.env.WMS_TEST_GOOGLE !== '1' || process.env.VERCEL) throw new Error('Google fixture is local-test-only');
const originalFetch = globalThis.fetch;
const {privateKey, publicKey} = await generateKeyPair('RS256');
const wrongKeys = await generateKeyPair('RS256');
const jwk = {...await exportJWK(publicKey), kid: 'local-test-key', alg: 'RS256', use: 'sig'};
let contents = JSON.stringify({version: 0, data: null, checksum: null, format: 'sanstech-pglite-0.6.0-aes256gcm-gzip-v2'});
let locked = false;
const loginCache = new Map();
let currentIdentityToken, currentIdentityEmail;
const file = {getSharingAccess: () => 'private', getSharingPermission: () => 'view', getEditors: () => [], getViewers: () => [],
 getBlob: () => ({getDataAsString: () => contents}), setContent: text => {if (!locked) throw new Error('Missing storage lock'); contents = text;}};
const context = vm.createContext({Date, JSON, Number,
 PropertiesService: {getScriptProperties: () => ({getProperty: key => key === 'DRIVE_GATEWAY_SECRET' ? process.env.DRIVE_GATEWAY_SECRET : 'local-test-file'})},
 LockService: {getScriptLock: () => ({tryLock: () => {if (locked) return false; locked = true; return true;}, hasLock: () => locked, releaseLock: () => {locked = false;}})},
 DriveApp: {getFileById: () => file, Access: {PRIVATE: 'private'}, Permission: {EDIT: 'edit'}},
 SpreadsheetApp: {flush: () => {}, openById: () => ({getSheetByName: () => ({getRange: () => ({getValue: () => 'SANSTECH_STORAGE_V2', setValues: () => {}})})})},
 Utilities: {Charset: {UTF_8: 'utf8'}, DigestAlgorithm: {SHA_256: 'sha256'},
  getUuid: randomUUID, base64DecodeWebSafe: text => Buffer.from(text,'base64url'), base64EncodeWebSafe: bytes => Buffer.from(bytes).toString('base64url'),
  newBlob: bytes => ({getDataAsString: () => Buffer.from(bytes).toString('utf8')}),
  computeHmacSha256Signature: (message, key) => Array.from(createHmac('sha256', key).update(message).digest()),
  computeDigest: (_algorithm, message) => Array.from(createHash('sha256').update(message).digest())},
 ContentService: {MimeType: {JSON: 'json'}, createTextOutput: text => ({setMimeType: () => JSON.parse(text)})},
 HtmlService: {createHtmlOutput: html => ({html})},
 ScriptApp: {getIdentityToken: () => currentIdentityToken, getScriptId: () => process.env.GOOGLE_AUTH_SCRIPT_ID},
 Session: {getActiveUser: () => ({getEmail: () => currentIdentityEmail}),getEffectiveUser: () => ({getEmail: () => currentIdentityEmail})},
 CacheService: {getScriptCache: () => ({get:key => loginCache.get(key),put:(key,value) => loginCache.set(key,value),remove:key => loginCache.delete(key)})},
});
vm.runInContext(fs.readFileSync('google-apps-script/Code.gs', 'utf8')+'\n'+fs.readFileSync('google-apps-script/Auth.gs','utf8'), context);

if (process.env.WMS_TEST_GOOGLE_SCRIPT === '1') {
 const server = createServer(async (request,response) => {
  try {
   const url=new URL(request.url,'http://127.0.0.1:3139');
   if(url.pathname!=='/authorize'){response.writeHead(404).end();return;}
   const sub=url.searchParams.get('sub') || 'browser-owner'; currentIdentityEmail=`${sub}@example.com`;
   currentIdentityToken=await new SignJWT({email:currentIdentityEmail,email_verified:true,name:'Pemilik Drive'})
    .setProtectedHeader({alg:'RS256',kid:'local-test-key'}).setSubject(sub).setIssuer('https://accounts.google.com')
    .setAudience(process.env.GOOGLE_CLIENT_ID).setIssuedAt().setExpirationTime('5m').sign(url.searchParams.get('wrongSignature')==='1'?wrongKeys.privateKey:privateKey);
   const parameter=Object.fromEntries(url.searchParams);
   if(parameter.wrongNonce==='1')parameter.nonce='f'.repeat(43);
   context.WMS_DEPLOYMENT_MODE='google_login';
   const result=context.doGet({parameter});
   response.writeHead(200,{'Content-Type':'text/html'}).end(result.html.replaceAll('https://sanstech-wedding-management-system.vercel.app',process.env.NEXT_PUBLIC_APP_URL));
  } catch {response.writeHead(500).end('Local identity fixture failed');}
 });
 await new Promise(resolve => server.listen(3139,'127.0.0.1',resolve));
 server.unref();
}
globalThis.fetch = async (input, options) => {
 const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
 if (url === process.env.DRIVE_GATEWAY_URL) {
  if (fs.existsSync('test-results/drive-timeout.marker')) throw new DOMException('Fixture upstream timeout','TimeoutError');
  const body = await new Response(options?.body ?? (input instanceof Request ? input.body : null)).text();
  context.WMS_DEPLOYMENT_MODE='storage';
  const result = context.doPost({postData: {contents: body}});
  return Response.json(result);
 }
 if (url === 'https://www.googleapis.com/oauth2/v3/certs') return Response.json({keys: [jwk]}, {headers: {'Cache-Control': 'public,max-age=300'}});
 if (url === 'https://oauth2.googleapis.com/token') {
  const form = new URLSearchParams(await new Response(options?.body ?? (input instanceof Request ? input.body : null)).text());
  try {
   const code = JSON.parse(Buffer.from(form.get('code'), 'base64url').toString('utf8'));
   if (form.get('client_id') !== process.env.GOOGLE_CLIENT_ID || form.get('client_secret') !== process.env.GOOGLE_CLIENT_SECRET ||
    createHash('sha256').update(form.get('code_verifier')).digest('base64url') !== code.challenge) throw new Error('Bad token request');
   const idToken = await new SignJWT({email: code.email, email_verified: true, name: 'Pemilik Drive', nonce: code.nonce})
    .setProtectedHeader({alg: 'RS256', kid: 'local-test-key'}).setSubject(code.sub).setIssuer('https://accounts.google.com')
    .setAudience(process.env.GOOGLE_CLIENT_ID).setIssuedAt().setExpirationTime('5m').sign(code.wrongSignature ? wrongKeys.privateKey : privateKey);
   return Response.json({id_token: idToken});
  } catch {return Response.json({error: 'invalid_grant'}, {status: 400});}
 }
 return originalFetch(input, options);
};
