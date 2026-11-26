import {afterEach,describe,expect,it,vi} from 'vitest';
import {isLocalDemoEnabled,safeRedirectPath} from '@/lib/config';
import {verifySameOriginMutation} from '@/lib/security/rate-limit';
import {readFormBody,readJsonBody,routeError} from '@/lib/http';
import {readDemoSession,signDemoSession} from '@/lib/auth/demo-session';
import {createOrUpdateEventSchema} from '@/lib/validators';
import {parseGuestImportText,detectDelimiter} from '@/lib/spreadsheet/guest-import';
import {encodedFormSize, MAX_REQUEST_BYTES} from '@/lib/http-limits';
afterEach(()=>vi.unstubAllEnvs());
describe('configuration and request boundaries',()=>{
 it('never enables demo sessions on Vercel or in production',()=>{
  vi.stubEnv('NODE_ENV','production');vi.stubEnv('LOCAL_DEMO_MODE','true');expect(isLocalDemoEnabled()).toBe(false);
  vi.stubEnv('NODE_ENV','development');vi.stubEnv('VERCEL','1');expect(isLocalDemoEnabled()).toBe(false);
  expect(readDemoSession('user-platform-admin')).toBeNull();
 });
 it('rejects tampered local cookies and accepts signed local sessions',()=>{
  const signed=signDemoSession('user-wo-a');expect(readDemoSession(signed)).toBe('user-wo-a');
  expect(readDemoSession(signed+'x')).toBeNull();expect(readDemoSession('user-platform-admin')).toBeNull();
 });
 it.each(['//evil.example','https://evil.example','/\\evil.example','/\n/evil.example'])('rejects external or malformed redirects: %s',value=>expect(safeRedirectPath(value)).toBe('/app/workspaces'));
 it('preserves internal redirect paths and blocks cross-origin mutations',()=>{
  expect(safeRedirectPath('/invite/token?from=mail')).toBe('/invite/token?from=mail');
  expect(verifySameOriginMutation(new Request('https://app.example/api/events',{headers:{origin:'https://evil.example'}}))).toBe(false);
  expect(verifySameOriginMutation(new Request('https://app.example/api/events'))).toBe(false);
  expect(verifySameOriginMutation(new Request('https://app.example/api/events',{headers:{origin:'https://app.example'}}))).toBe(true);
 });
 it('returns structured errors for malformed JSON and oversized bodies',async()=>{
  await expect(readJsonBody(new Request('https://app.example/api/events',{method:'POST',body:'null'}))).rejects.toMatchObject({status:400});
  await expect(readFormBody(new Request('https://app.example/api/events',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}))).rejects.toMatchObject({status:400});
  await expect(readJsonBody(new Request('https://app.example/api/events',{method:'POST',body:'x'.repeat(4*1024*1024+1)}))).rejects.toMatchObject({status:413});
  vi.spyOn(console,'error').mockImplementation(()=>{});
  const error=routeError(new Error('secret-database-password'));expect(error.status).toBe(503);expect(await error.text()).not.toContain('secret-database-password');
  vi.restoreAllMocks();
 });
 it('counts form encoding expansion for Unicode and textarea line breaks',()=>{
  const fields={action:'import_csv_lines',csvLines:'Keluarga 🌸\nDewi & Budi;2'};
  const wire=new URLSearchParams({...fields,csvLines:fields.csvLines.replace('\n','\r\n')}).toString();
  expect(encodedFormSize(fields)).toBe(new TextEncoder().encode(wire).length);
  expect(encodedFormSize({csvLines:'🌸'.repeat(350_000)})).toBeGreaterThan(MAX_REQUEST_BYTES);
 });
 it('validates calendar dates and clock ranges',()=>{
  const base={workspaceId:'11111111-1111-4111-8111-111111111111',title:'Uji Acara',brideName:'A',groomName:'B',eventDate:'2027-02-30',startTime:'18:00',endTime:'21:00',timezone:'Asia/Jakarta',venue:'Ballroom',city:'Jakarta'};
  expect(createOrUpdateEventSchema.safeParse(base).success).toBe(false);
  expect(createOrUpdateEventSchema.safeParse({...base,eventDate:'2027-02-28',endTime:'99:00'}).success).toBe(false);
 });
 it('keeps public display opt-in and handles CSV quoting, line breaks, and invalid capacity',()=>{
  const parsed=parseGuestImportText('Nama Penerima;Kuota;Kategori;Meja;TampilTV;NoWA;CatatanWO\n"Budi; Keluarga";2;vip;;;;"Baris satu\nBaris dua"');
  expect(parsed.errors).toEqual([]);expect(parsed.rows[0]?.displayName).toBe('Budi; Keluarga');
  expect(parsed.rows[0]?.allowedPublicDisplay).toBe(false);expect(parsed.rows[0]?.notesPrivateOptional).toContain('\n');
  expect(parseGuestImportText('Budi,2.5,vip').errors.length).toBe(1);
  expect(parseGuestImportText('Budi,21,vip').errors.length).toBe(1);
  expect(detectDelimiter('"Budi; keluarga",2,vip')).toBe(',');
 });
});
