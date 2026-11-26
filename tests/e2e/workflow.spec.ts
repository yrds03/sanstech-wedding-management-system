import {test,expect} from '@playwright/test';
import {parseXlsxFirstSheet} from '../../lib/spreadsheet/xlsx';
import QRCode from 'qrcode';
// Local demo requires next dev. Source hot reload is absent in production and
// must not cancel redirects while this isolated browser workflow is running.
test.beforeEach(async({context})=>{
 const health=await context.request.get('/api/health');
 expect(health.status()).toBe(503);expect((await health.json()).database).toBe('not_configured');
 await context.routeWebSocket(/\/_next\/webpack-hmr/,()=>{});
});
test('WO creates an event, manages a guest, records RSVP and attendance, and exports a report',async({page,context})=>{
 test.setTimeout(360000); // Includes cold compilation of every local dev route.
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/auth/login');
 await page.getByRole('button',{name:'user-wo-a',exact:true}).click();
 await expect(page).toHaveURL(/\/app\/workspaces/);
 await page.goto('/app/w/11111111-1111-4111-8111-111111111111/events');
 const form=page.locator('form[action="/api/events"]');
 await form.locator('[name="planCode"]').selectOption('pro');
 await form.locator('[name="title"]').fill('Acara Browser '+Date.now());
 await form.locator('[name="brideName"]').fill('Nadya');await form.locator('[name="groomName"]').fill('Rian');
 await form.locator('[name="eventDate"]').fill('2027-12-20');
 await form.locator('[name="venue"]').fill('Ballroom Uji');await form.locator('[name="city"]').fill('Jakarta');
 await form.locator('button[type="submit"]').click();
 await expect(page).toHaveURL(/\/app\/e\/[a-f0-9-]+$/);
 const eventId=page.url().split('/').at(-1)!;
 const template=await context.request.get(`/api/events/${eventId}/guests/template`);
 expect(template.ok()).toBe(true);
 const templateRows=parseXlsxFirstSheet(new Uint8Array(await template.body()));
 expect(templateRows).toHaveLength(1);expect(templateRows[0]).toEqual(['Nama Penerima','Kuota','Kategori','Meja','TampilTV','NoWA','CatatanWO']);
 const csvTemplate=await context.request.get(`/api/events/${eventId}/guests/template?format=csv`);
 expect((await csvTemplate.text()).trim().split(/\r?\n/)).toHaveLength(2);
 await page.setViewportSize({width:390,height:844});
 expect(await page.locator('body').evaluate(e=>e.scrollWidth<=window.innerWidth)).toBe(true);
 await page.goto(`/app/e/${eventId}/guests`);
 const guestForm=page.locator('form').filter({has:page.locator('input[name="displayName"]')}).first();
 await guestForm.locator('[name="displayName"]').fill('Keluarga Pengujian Browser');
 await guestForm.locator('[name="capacity"]').fill('4');
 await guestForm.locator('[name="guestCategory"]').selectOption('vip');
 await guestForm.locator('button[type="submit"]').click();
 await expect(page.getByText('Keluarga Pengujian Browser',{exact:true})).toBeVisible();
 const importButton=page.getByRole('button',{name:/Import Semua Baris Sekaligus/});
 const upload=page.locator('input[type="file"]').first();
 await expect(upload).toBeEnabled();
 await upload.setInputFiles({name:'tamu.csv',mimeType:'text/csv',buffer:Buffer.from('Nama Penerima;Kuota;Kategori;Meja;TampilTV;NoWA;CatatanWO\nTim Pengujian Impor;2;regular;;tidak;;')});
 await expect(importButton).toBeEnabled();
 await upload.setInputFiles({name:'file-lama.xls',mimeType:'application/vnd.ms-excel',buffer:Buffer.from('invalid legacy workbook')});
 await expect(page.getByText(/Format .xls lama tidak didukung/)).toBeVisible();
 await expect(importButton).toBeDisabled();await expect(page.locator('textarea[name="csvLines"]')).toHaveValue('');
 await page.locator('textarea[name="csvLines"]').fill('Tim Pengujian Impor;2;regular;;tidak;;');
 await expect(importButton).toBeEnabled();
 await page.locator('textarea[name="csvLines"]').fill('');
 expect(await page.locator('body').evaluate(e=>e.scrollWidth<=window.innerWidth)).toBe(true);
 const api=await context.request.get(`/api/events/${eventId}/guests`);expect(api.ok()).toBe(true);
 const {groups}=await api.json();const guest=groups.find((g:{displayName:string})=>g.displayName==='Keluarga Pengujian Browser');
 const publicContext=await context.browser()!.newContext();
 await publicContext.routeWebSocket(/\/_next\/webpack-hmr/,()=>{});
 const publicPage=await publicContext.newPage();
 await publicPage.goto(`http://localhost:3100/i/${guest.publicTokenPreview}`);
 await publicPage.setViewportSize({width:390,height:844});
 expect(await publicPage.locator('body').evaluate(e=>e.scrollWidth<=window.innerWidth)).toBe(true);
 await expect(publicPage.getByRole('heading',{name:/Nadya/})).toBeVisible();
 const rsvp=publicPage.locator('form[action="/api/public/rsvp"]');
 await rsvp.locator('[name="attendeeCount"]').fill('3');await rsvp.locator('button[type="submit"]').click();
 await expect(publicPage).toHaveURL(/saved=1/);
 await page.goto(`/app/e/${eventId}/checkin`);
 const scanner=page.locator(`form[action="/api/events/${eventId}/checkins"]`).first();
 const qrImage=await QRCode.toBuffer(guest.qrTokenPreview,{type:'png',width:720,margin:4});
 await page.locator('input[type="file"][accept="image/*"]').setInputFiles({name:'qr-pengujian.png',mimeType:'image/png',buffer:qrImage});
 await expect(scanner.locator('[name="groupIdOrQrToken"]')).toHaveValue(guest.qrTokenPreview);
 await scanner.locator('[name="deltaAttendees"]').fill('2');await scanner.locator('button[type="submit"]').click();
 await expect(page).toHaveURL(/success=/);
 const after=await context.request.get(`/api/events/${eventId}/guests`);const current=(await after.json()).groups.find((g:{id:string})=>g.id===guest.id);
 expect(current.checkedInCount).toBe(2);expect(current.rsvpCount).toBe(3);expect(current.remainingCapacity).toBe(2);
 await page.goto(`/app/e/${eventId}/display`);
 const operatorLink=await page.locator('a[href^="https://wa.me/"]').first().getAttribute('href');
 expect(operatorLink).toBeTruthy();const operatorMessage=new URL(operatorLink!).searchParams.get('text')!;
 expect(operatorMessage).toMatch(/http:\/\/localhost:3100\/tv\?code=\d{6}/);expect(operatorMessage).not.toMatch(/\/display\/\d{6}/);
 const portal=operatorMessage.match(/http:\/\/localhost:3100\/tv\?code=\d{6}/)![0];
 let pollCompleted=false, pollAborted=false;
 publicPage.on('requestfailed',request=>{if(/\/api\/display\/.*\/state/.test(request.url()))pollAborted=true;});
 await publicPage.route('**/api/display/**/state',async route=>{
  const response=await route.fetch();
  if(!pollCompleted)await new Promise(resolve=>setTimeout(resolve,9000));
  try{await route.fulfill({response});pollCompleted=true;}catch{pollAborted=true;}
 });
 await publicPage.goto(portal);await publicPage.getByRole('button',{name:/Hubungkan Layar TV/}).click();
 await expect(publicPage).toHaveURL(/\/display\//,{timeout:90000});
 await expect(publicPage.getByText('Keluarga Pengujian Browser',{exact:true})).toHaveCount(0);
 await expect.poll(()=>pollCompleted,{timeout:35000}).toBe(true);expect(pollAborted).toBe(false);
 await publicPage.unroute('**/api/display/**/state');
 await page.goto(`/app/e/${eventId}/reports`);
 expect(await page.locator('body').evaluate(e=>e.scrollWidth<=window.innerWidth)).toBe(true);
 const exportResponse=await context.request.get(`/api/events/${eventId}/reports/export`);expect(exportResponse.ok()).toBe(true);expect(exportResponse.headers()['content-type']).toContain('spreadsheetml');
 expect(errors).toEqual([]);await publicContext.close();
});
test('mobile forms remain usable and unknown tokens do not expose an event',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 for(const path of ['/','/auth/login','/auth/register','/auth/forgot-password','/tv']){
  await page.goto(path);expect(await page.locator('body').evaluate(e=>e.scrollWidth<=window.innerWidth)).toBe(true);
 }
 const display=await page.request.get('/api/display/unknown-session/state');expect(display.status()).toBe(404);
 await page.goto('/i/invalid-token');await expect(page.getByRole('heading',{name:/ditemukan/i})).toBeVisible();
});
test('cross-site mutations and forged sessions are rejected',async({request})=>{
 const response=await request.post('/api/events',{headers:{Origin:'https://evil.example'},data:{title:'forged'}});expect(response.status()).toBe(403);
 const forged=await request.get('/api/workspaces',{headers:{Cookie:'sanstech_dev_session_uid=user-platform-admin'}});expect(forged.status()).toBe(401);
});
test('preserves the invitation destination when a new member opens registration',async({page})=>{
 await page.goto('/auth/login?next=%2Finvite%2Ftest-invitation-token');
 await page.getByRole('link',{name:'Daftar baru'}).click();
 await expect(page.locator('form[action="/api/auth/register"] input[name="redirectTo"]')).toHaveValue('/invite/test-invitation-token');
});
test('handbook explains Google login, plan limits and an actionable trial without sample guest cards',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/panduan');
 await expect(page.getByRole('heading',{name:'1. Masuk menggunakan Google'})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Checklist uji coba'})).toBeVisible();
 await expect(page.getByRole('table',{name:'Tujuh kolom template impor'})).toBeVisible();
 expect(await page.locator('body').evaluate(e=>e.scrollWidth<=window.innerWidth)).toBe(true);
 for(const href of await page.locator('nav[aria-label="Daftar isi"] a').evaluateAll(links=>links.map(a=>a.getAttribute('href'))))expect(await page.locator(href!).count()).toBe(1);
 await page.goto('/');await expect(page.getByText('Segera hadir · Extra Quota +250 Grup Undangan Unik')).toHaveCount(0);
 await expect(page.getByText('Bapak Budi Santoso',{exact:false})).toHaveCount(0);
 await expect(page.getByRole('link',{name:'Mulai dengan Free'})).toBeVisible();
});
