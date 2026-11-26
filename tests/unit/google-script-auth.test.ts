import {afterEach, describe, expect, it, vi} from 'vitest';
import vm from 'node:vm';
import fs from 'node:fs';
import {createHash, createHmac, randomUUID} from 'node:crypto';
import {generateKeyPair, exportJWK, SignJWT} from 'jose';
import {createGoogleFlow, exchangeGoogleCode, googleAuthorizationUrl} from '@/lib/auth/google';
import {isApplicationConfigured} from '@/lib/drive/config';

const secret = 'test-only-script-gateway-secret-32-characters';
const scriptId = 'a'.repeat(60);
const verifier = 'v'.repeat(43), state = 's'.repeat(43), nonce = 'n'.repeat(43);
const challenge = createHash('sha256').update(verifier).digest('base64url');

function broker(options: {active?: string; effective?: string; claims?: Record<string, unknown>} = {}) {
  const cache = new Map<string, string>(); let locked = false;
  const claims = {sub:'verified-google-sub',email:'owner@example.com',email_verified:true,
    aud:'script-client.apps.googleusercontent.com',iss:'https://accounts.google.com',exp:Math.floor(Date.now()/1000)+300,...options.claims};
  const token = `header.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.google-signature`;
  const context = vm.createContext({Date, JSON, Number,
    Session: {getActiveUser: () => ({getEmail: () => options.active ?? 'owner@example.com'}),
      getEffectiveUser: () => ({getEmail: () => options.effective ?? 'owner@example.com'})},
    ScriptApp: {getIdentityToken: () => token, getScriptId: () => scriptId},
    CacheService: {getScriptCache: () => ({put:(k:string,v:string) => cache.set(k,v),get:(k:string) => cache.get(k),remove:(k:string) => {expect(locked).toBe(true);cache.delete(k);}})},
    PropertiesService: {getScriptProperties: () => ({getProperty: () => secret})},
    LockService: {getScriptLock: () => ({tryLock: () => {locked=true;return true;},hasLock: () => locked,releaseLock: () => {locked=false;}})},
    Utilities: {Charset:{UTF_8:'utf8'},DigestAlgorithm:{SHA_256:'sha256'},getUuid:randomUUID,
      computeDigest: (_a:string,m:string) => [...createHash('sha256').update(m).digest()],
      computeHmacSha256Signature: (m:string,k:string) => [...createHmac('sha256',k).update(m).digest()],
      base64DecodeWebSafe: (s:string) => Buffer.from(s,'base64url'),base64EncodeWebSafe: (b:number[]) => Buffer.from(b).toString('base64url'),
      newBlob: (b:Buffer) => ({getDataAsString: () => b.toString('utf8')})},
    HtmlService: {createHtmlOutput:(text:string) => ({html:text})},
    ContentService: {MimeType:{JSON:'json'},createTextOutput:(text:string) => ({setMimeType: () => JSON.parse(text)})},
  });
  vm.runInContext(fs.readFileSync('google-apps-script/Code.gs','utf8')+'\n'+fs.readFileSync('google-apps-script/Auth.gs','utf8'),context);
  return {cache,token,
    login: () => {context.WMS_DEPLOYMENT_MODE='google_login';return context.doGet({parameter:{state,nonce,challenge}});},
    storageGet: () => {context.WMS_DEPLOYMENT_MODE='storage';return context.doGet({parameter:{state,nonce,challenge}});},
    exchange: (code:string,overrides:Record<string,unknown>={},key=secret) => {
      context.WMS_DEPLOYMENT_MODE='storage';
      const message=JSON.stringify({action:'exchange_auth_code',code,state,authNonce:nonce,verifier,timestamp:Date.now(),nonce:randomUUID(),...overrides});
      return context.doPost({postData:{contents:JSON.stringify({message,signature:createHmac('sha256',key).update(message).digest('hex')})}});
    },
    loginPost: () => {context.WMS_DEPLOYMENT_MODE='google_login';return context.doPost({postData:{contents:'{}'}});},
  };
}
const codeFrom = (html:string) => /code=([a-f0-9]{64})/.exec(html)![1]!;
afterEach(() => {vi.unstubAllEnvs();vi.unstubAllGlobals();});

describe('same-project Google identity broker', () => {
  it('issues only an opaque code to a fixed callback, then consumes it exactly once under lock', () => {
    const b=broker();const page=b.login();const code=codeFrom(page.html);
    expect(page.html).toContain('https://sanstech-wedding-management-system.vercel.app/auth/callback?state=');
    expect(page.html).not.toContain(b.token);expect(page.html).not.toContain('owner@example.com');
    expect(b.exchange(code)).toEqual({ok:true,id_token:b.token,audience:'script-client.apps.googleusercontent.com',scriptId});
    expect(b.exchange(code).code).toBe('EXPIRED_LOGIN');
  });
  it('requires HMAC, matching browser state/nonce, PKCE and an unexpired one-time code', () => {
    const b=broker();const code=codeFrom(b.login().html);
    expect(b.exchange(code,{},'wrong-secret').code).toBe('UNAUTHORIZED');
    expect(b.exchange(code,{state:'forged'}).code).toBe('INVALID_LOGIN');
    expect(b.exchange(code,{authNonce:'forged'}).code).toBe('INVALID_LOGIN');
    expect(b.exchange(code,{verifier:'w'.repeat(43)}).code).toBe('INVALID_LOGIN');
    expect(b.cache.size).toBe(1);
    for (const [key,value] of b.cache) b.cache.set(key,JSON.stringify({...JSON.parse(value),expiresAt:1}));
    expect(b.exchange(code).code).toBe('INVALID_LOGIN');
  });
  it('separates visiting-user login from the owner storage deployment', () => {
    const b=broker();expect(b.storageGet().code).toBe('METHOD_NOT_ALLOWED');expect(b.cache.size).toBe(0);
    expect(b.loginPost().code).toBe('METHOD_NOT_ALLOWED');
    const manifest=JSON.parse(fs.readFileSync('google-apps-script/auth-manifest.json','utf8'));
    expect(manifest.webapp.executeAs).toBe('USER_ACCESSING');
    expect(manifest.oauthScopes).toEqual(['openid','https://www.googleapis.com/auth/userinfo.email','https://www.googleapis.com/auth/userinfo.profile']);
  });
  it.each([{active:''},{effective:'another@example.com'},{claims:{email:'another@example.com'}},{claims:{email_verified:false}},{claims:{exp:1}}])('does not create a code for missing or mismatched identity: %j', options => {
    const b=broker(options);expect(b.login().html).toContain('Masuk belum selesai');expect(b.cache.size).toBe(0);
  });
  it('configures the script flow without a web client secret and retains PKCE', () => {
    vi.stubEnv('DRIVE_GATEWAY_URL','https://script.google.com/macros/s/storage/exec');vi.stubEnv('DRIVE_GATEWAY_SECRET',secret);vi.stubEnv('DRIVE_ENCRYPTION_KEY','ab'.repeat(32));
    vi.stubEnv('GOOGLE_CLIENT_ID','');vi.stubEnv('GOOGLE_CLIENT_SECRET','');vi.stubEnv('GOOGLE_AUTH_SCRIPT_URL','https://script.google.com/macros/s/login/exec');vi.stubEnv('GOOGLE_AUTH_SCRIPT_ID',scriptId);
    expect(isApplicationConfigured()).toBe(true);
    const {flow}=createGoogleFlow('/app/workspaces');const url=new URL(googleAuthorizationUrl(flow,'https://example.com/auth/callback'));
    expect(url.hostname).toBe('script.google.com');expect(url.searchParams.get('challenge')).toBe(createHash('sha256').update(flow.verifier).digest('base64url'));
    expect(url.searchParams.get('nonce')).toBe(flow.nonce);
  });
  it('rejects a broker from another project before trusting its identity response', async () => {
    vi.stubEnv('DRIVE_GATEWAY_URL','https://script.google.com/macros/s/storage/exec');vi.stubEnv('DRIVE_GATEWAY_SECRET',secret);vi.stubEnv('DRIVE_ENCRYPTION_KEY','ab'.repeat(32));
    vi.stubEnv('GOOGLE_AUTH_SCRIPT_URL','https://script.google.com/macros/s/login/exec');vi.stubEnv('GOOGLE_AUTH_SCRIPT_ID',scriptId);
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({ok:true,scriptId:'another-project',audience:'script-client.apps.googleusercontent.com',id_token:'forged'})));
    await expect(exchangeGoogleCode('a'.repeat(64),createGoogleFlow('/').flow,'https://example.com/auth/callback')).rejects.toThrow('Invalid Google identity broker');
  });
  it('verifies Google signature, issuer, broker audience and verified email on the returned token', async () => {
    vi.stubEnv('DRIVE_GATEWAY_URL','https://script.google.com/macros/s/storage/exec');vi.stubEnv('DRIVE_GATEWAY_SECRET',secret);vi.stubEnv('DRIVE_ENCRYPTION_KEY','ab'.repeat(32));
    vi.stubEnv('GOOGLE_AUTH_SCRIPT_URL','https://script.google.com/macros/s/login/exec');vi.stubEnv('GOOGLE_AUTH_SCRIPT_ID',scriptId);
    const keys=await generateKeyPair('RS256');const wrong=await generateKeyPair('RS256');const aud='script-client.apps.googleusercontent.com';
    const jwk={...await exportJWK(keys.publicKey),kid:'script-auth-unit',alg:'RS256',use:'sig'};
    const mint=(audience=aud,verified=true,key=keys.privateKey) => new SignJWT({email:'owner@example.com',email_verified:verified,name:'Pemilik'})
      .setProtectedHeader({alg:'RS256',kid:'script-auth-unit'}).setSubject('google-sub').setIssuer('https://accounts.google.com').setAudience(audience).setIssuedAt().setExpirationTime('5m').sign(key);
    let token=await mint();
    vi.stubGlobal('fetch',vi.fn(async (url: string | URL | Request) => String(url).includes('/oauth2/v3/certs') ? Response.json({keys:[jwk]}) : Response.json({ok:true,scriptId,audience:aud,id_token:token})));
    const exchange=() => exchangeGoogleCode('a'.repeat(64),createGoogleFlow('/').flow,'https://example.com/auth/callback');
    expect((await exchange()).email).toBe('owner@example.com');
    token=await mint('another-client.apps.googleusercontent.com');await expect(exchange()).rejects.toThrow();
    token=await mint(aud,false);await expect(exchange()).rejects.toThrow('Invalid Google identity');
    token=await mint(aud,true,wrong.privateKey);await expect(exchange()).rejects.toThrow();
  });
});
