import {test,expect} from '@playwright/test';
test('WO creates an event, manages a guest, records RSVP and attendance, and exports a report',async({page,context})=>{
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
 await page.setViewportSize({width:390,height:844});
 expect(await page.locator('body').evaluate(e=>e.scrollWidth<=window.innerWidth)).toBe(true);
 await page.goto(`/app/e/${eventId}/guests`);
 const guestForm=page.locator('form').filter({has:page.locator('input[name="displayName"]')}).first();
 await guestForm.locator('[name="displayName"]').fill('Keluarga Pengujian Browser');
 await guestForm.locator('[name="capacity"]').fill('4');
 await guestForm.locator('[name="guestCategory"]').selectOption('vip');
 await guestForm.locator('button[type="submit"]').click();
 await expect(page.getByText('Keluarga Pengujian Browser',{exact:true})).toBeVisible();
 expect(await page.locator('body').evaluate(e=>e.scrollWidth<=window.innerWidth)).toBe(true);
 const api=await context.request.get(`/api/events/${eventId}/guests`);expect(api.ok()).toBe(true);
 const {groups}=await api.json();const guest=groups.find((g:{displayName:string})=>g.displayName==='Keluarga Pengujian Browser');
 const publicContext=await context.browser()!.newContext();const publicPage=await publicContext.newPage();
 await publicPage.goto(`http://localhost:3100/i/${guest.publicTokenPreview}`);
 await publicPage.setViewportSize({width:390,height:844});
 expect(await publicPage.locator('body').evaluate(e=>e.scrollWidth<=window.innerWidth)).toBe(true);
 await expect(publicPage.getByRole('heading',{name:/Nadya/})).toBeVisible();
 const rsvp=publicPage.locator('form[action="/api/public/rsvp"]');
 await rsvp.locator('[name="attendeeCount"]').fill('3');await rsvp.locator('button[type="submit"]').click();
 await expect(publicPage).toHaveURL(/saved=1/);
 await page.goto(`/app/e/${eventId}/checkin`);
 const scanner=page.locator(`form[action="/api/events/${eventId}/checkins"]`).first();
 await scanner.locator('[name="groupIdOrQrToken"]').fill(guest.qrTokenPreview);
 await scanner.locator('[name="deltaAttendees"]').fill('2');await scanner.locator('button[type="submit"]').click();
 await expect(page).toHaveURL(/success=/);
 const after=await context.request.get(`/api/events/${eventId}/guests`);const current=(await after.json()).groups.find((g:{id:string})=>g.id===guest.id);
 expect(current.checkedInCount).toBe(2);expect(current.rsvpCount).toBe(3);expect(current.remainingCapacity).toBe(2);
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
