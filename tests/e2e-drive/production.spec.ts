import {test, expect, type Page} from '@playwright/test';
const base = 'http://localhost:3131';
async function googleFlow(page: Page, options?: {wrongNonce?: boolean; wrongSignature?: boolean; sub?: string}) {
 let authorization: URL | undefined;
 // Playwright routing applies to the first request in a redirect chain. Capture the
 // real POST response first, then visit its Google destination as a separate request.
 await page.route('**/api/auth/login', async route => {
  const response = await route.fetch({maxRedirects: 0});
  expect(response.status()).toBe(303);
  authorization = new URL(response.headers()['location']!);
  await route.fulfill({response, status: 200, contentType: 'text/html', body: '<p>Continue to identity provider</p>'});
 });
 await page.route('https://accounts.google.com/**', async route => {await route.fulfill({contentType: 'text/html', body: '<p>Local Google identity fixture</p>'});});
 await page.goto('/auth/login');
 await page.getByRole('button', {name: 'Lanjutkan dengan Google'}).click();
 await expect.poll(() => authorization?.hostname).toBe('accounts.google.com');
 expect(authorization).toBeDefined();
 await page.goto(authorization!.href);
 const sub = options?.sub ?? 'browser-owner';
 const code = Buffer.from(JSON.stringify({sub, email: `${sub}@example.com`, nonce: options?.wrongNonce ? 'forged-nonce' : authorization!.searchParams.get('nonce'),
  challenge: authorization!.searchParams.get('code_challenge'), wrongSignature: options?.wrongSignature})).toString('base64url');
 await page.goto(`${base}/auth/callback?state=${encodeURIComponent(authorization!.searchParams.get('state')!)}&code=${code}`);
}

test('production build uses Google identity and Drive snapshots through the whole guest workflow', async ({page, context}) => {
 const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
 await googleFlow(page);
 await expect(page).toHaveURL(/\/app\/workspaces/);
 const health = await context.request.get('/api/health'); expect(health.status()).toBe(200); expect((await health.json()).storage).toBe('google_drive');
 const workspace = await context.request.post('/api/workspaces', {headers: {Origin: base}, data: {type: 'wo', name: 'Workspace Drive Browser', slug: 'drive-browser', idempotencyKey: crypto.randomUUID()}});
 expect(workspace.status()).toBe(201); const workspaceId = (await workspace.json()).workspace.id;
 await page.goto(`/app/w/${workspaceId}/events`);
 const form = page.locator('form[action="/api/events"]');
 await form.locator('[name="title"]').fill('Acara Drive Produksi'); await form.locator('[name="brideName"]').fill('Nadya');
 await form.locator('[name="groomName"]').fill('Rian'); await form.locator('[name="eventDate"]').fill('2099-12-20');
 await form.locator('[name="venue"]').fill('Ballroom Uji'); await form.locator('[name="city"]').fill('Jakarta');
 await form.locator('button[type="submit"]').click(); await expect(page).toHaveURL(/\/app\/e\/[a-f0-9-]+$/);
 const eventId = page.url().split('/').at(-1)!;
 await page.goto(`/app/e/${eventId}/guests`);
 const guestForm = page.locator('form').filter({has: page.locator('input[name="displayName"]')}).first();
 await guestForm.locator('[name="displayName"]').fill('Keluarga Drive Browser'); await guestForm.locator('[name="capacity"]').fill('4');
 await guestForm.locator('button[type="submit"]').click(); await expect(page.getByText('Keluarga Drive Browser', {exact: true})).toBeVisible();
 const guestResponse = await context.request.get(`/api/events/${eventId}/guests`); expect(guestResponse.ok()).toBe(true);
 const guest = (await guestResponse.json()).groups[0];
 const publicContext = await context.browser()!.newContext(); const publicPage = await publicContext.newPage();
 await publicPage.goto(`${base}/i/${guest.publicTokenPreview}`);
 const rsvp = publicPage.locator('form[action="/api/public/rsvp"]'); await rsvp.locator('[name="attendeeCount"]').fill('3');
 await rsvp.locator('button[type="submit"]').click(); await expect(publicPage).toHaveURL(/saved=1/);
 await page.goto(`/app/e/${eventId}/checkin`);
 const scanner = page.locator(`form[action="/api/events/${eventId}/checkins"]`).first();
 await scanner.locator('[name="groupIdOrQrToken"]').fill(guest.qrTokenPreview); await scanner.locator('[name="deltaAttendees"]').fill('2');
 await scanner.locator('button[type="submit"]').click(); await expect(page).toHaveURL(/success=/);
 const after = await context.request.get(`/api/events/${eventId}/guests`); const current = (await after.json()).groups[0];
 expect(current.checkedInCount).toBe(2); expect(current.rsvpCount).toBe(3); expect(current.remainingCapacity).toBe(2);
 await page.goto(`/app/e/${eventId}/reports`);
 const exportLink = await page.getByRole('link', {name: 'Unduh ringkasan CSV', exact: true}).getAttribute('href');
 expect(exportLink).toContain('format=csv');
 const exported = await context.request.get(exportLink!); expect(exported.ok()).toBe(true); expect(exported.headers()['content-type']).toContain('text/csv');
 const cookies = await context.cookies(); const token = cookies.find(cookie => cookie.name === 'sanstech_session')!;
 expect(token.httpOnly).toBe(true); expect(token.sameSite).toBe('Lax');
 await context.request.post('/api/auth/logout', {headers: {Origin: base}, maxRedirects: 0});
 const replay = await context.request.get('/api/workspaces', {headers: {Cookie: `sanstech_session=${token.value}`}}); expect(replay.status()).toBe(401);
 expect(errors).toEqual([]); await publicContext.close();
});

for (const invalid of ['nonce', 'signature'] as const) {
 test(`production build rejects a Google identity with an invalid ${invalid}`, async ({page}) => {
  await googleFlow(page, {wrongNonce: invalid === 'nonce', wrongSignature: invalid === 'signature', sub: `invalid-${invalid}`});
  await expect(page).toHaveURL(/\/auth\/login\?error=/);
  expect((await page.context().cookies()).some(cookie => cookie.name === 'sanstech_session')).toBe(false);
 });
}
