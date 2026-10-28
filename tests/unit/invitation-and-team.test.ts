import { describe, expect, it } from 'vitest';
import {
  createEventInWorkspace,
  createEventMemberInvite,
  getEventIfAuthorized,
  loginInvitedMemberByEmail,
  redeemMemberInviteToken,
  resetDevStoreForTests,
  updateEventInvitationConfig,
} from '@/lib/db/repository';
import {
  getInvitationFeatureAccess,
  sanitizeInvitationConfig,
  sanitizeMapsUrl,
} from '@/lib/invitation/config';
import { decodeInvitationConfig, encodeInvitationConfig } from '@/lib/invitation/signing';

const OWNER = 'user-wo-a';
const WS = '11111111-1111-4111-8111-111111111111';

function makeEvent(planCode: 'free' | 'pro' | 'pro_plus' = 'free') {
  resetDevStoreForTests();
  const ev = createEventInWorkspace({
    userId: OWNER,
    workspaceId: WS,
    title: 'Uji Undangan',
    brideName: 'Putri',
    groomName: 'Andi',
    eventDate: '2027-01-10',
    startTime: '18:00',
    endTime: '21:00',
    timezone: 'Asia/Jakarta',
    venue: 'Ballroom',
    city: 'Jakarta',
    address: '',
    planCode,
  });
  if ('error' in ev) throw new Error(ev.error);
  return ev;
}

describe('invitation design plan gating', () => {
  it('free plan is forced to classic theme with no custom extras', () => {
    const cfg = sanitizeInvitationConfig(
      { themeStyle: 'royal_navy_gold', quoteText: 'x', mapsUrl: 'https://maps.app.goo.gl/abc', digitalGiftBank: 'BCA 1', whiteLabelBrandName: 'Brand' },
      'free'
    );
    expect(cfg.themeStyle).toBe('classic_ivory');
    expect(cfg.quoteText).toBe('');
    expect(cfg.mapsUrl).toBe('');
    expect(cfg.digitalGiftBank).toBe('');
    expect(cfg.whiteLabelBrandName).toBe('');
    expect(getInvitationFeatureAccess('free').showSanstechWatermark).toBe(true);
  });

  it('pro unlocks themes/maps but not digital gift or white label', () => {
    const cfg = sanitizeInvitationConfig(
      { themeStyle: 'emerald_botanical', mapsUrl: 'https://maps.app.goo.gl/abc', digitalGiftBank: 'BCA 1', whiteLabelBrandName: 'Brand' },
      'pro'
    );
    expect(cfg.themeStyle).toBe('emerald_botanical');
    expect(cfg.mapsUrl).toContain('maps.app.goo.gl');
    expect(cfg.digitalGiftBank).toBe('');
    expect(cfg.whiteLabelBrandName).toBe('');
  });

  it('pro_plus unlocks everything and blocks non-map / non-https links', () => {
    const cfg = sanitizeInvitationConfig({ digitalGiftBank: 'BCA 1', whiteLabelBrandName: 'Aurora' }, 'pro_plus');
    expect(cfg.digitalGiftBank).toBe('BCA 1');
    expect(cfg.whiteLabelBrandName).toBe('Aurora');
    expect(sanitizeMapsUrl('javascript:alert(1)')).toBe('');
    expect(sanitizeMapsUrl('http://maps.google.com/x')).toBe('');
    expect(sanitizeMapsUrl('https://evil.example.com/x')).toBe('');
  });

  it('server enforces plan when saving, and signed design link rejects tampering', () => {
    const ev = makeEvent('pro');
    const saved = updateEventInvitationConfig({
      userId: OWNER,
      eventId: ev.id,
      rawConfig: { themeStyle: 'modern_pearl', digitalGiftBank: 'BCA 999' },
    });
    if ('error' in saved) throw new Error(saved.error);
    expect(saved.invitationConfig?.themeStyle).toBe('modern_pearl');
    expect(saved.invitationConfig?.digitalGiftBank).toBe('');

    const encoded = encodeInvitationConfig(saved.invitationConfig!, 'pro');
    expect(decodeInvitationConfig(encoded)?.config.themeStyle).toBe('modern_pearl');
    const [payload, sig] = encoded.split('.');
    const tamperedPayload = Buffer.from(
      JSON.stringify({ plan: 'pro_plus', config: { digitalGiftBank: 'BCA 666' } })
    ).toString('base64url');
    expect(decodeInvitationConfig(`${tamperedPayload}.${sig}`)).toBeNull();
    expect(decodeInvitationConfig(`${payload}.bad`)).toBeNull();
  });
});

describe('invited member access', () => {
  it('invited email can log in and only gets the invited role on that event', () => {
    const ev = makeEvent('pro');
    const invite = createEventMemberInvite({
      actorUserId: OWNER,
      eventId: ev.id,
      recipientEmail: 'Pengantin@Contoh.ID',
      eventRoleGrant: 'couple',
    });
    if ('error' in invite) throw new Error(invite.error);

    const login = loginInvitedMemberByEmail('pengantin@contoh.id');
    expect(login?.eventId).toBe(ev.id);
    const event = getEventIfAuthorized(login!.userId, ev.id);
    expect(event?.myEffectiveRole).toBe('couple');

    expect(loginInvitedMemberByEmail('orang.lain@contoh.id')).toBeNull();
  });

  it('token redemption works once valid and fails after revoke-like invalid token', () => {
    const ev = makeEvent('pro');
    const invite = createEventMemberInvite({
      actorUserId: OWNER,
      eventId: ev.id,
      recipientEmail: 'scanner@contoh.id',
      eventRoleGrant: 'receptionist',
    });
    if ('error' in invite) throw new Error(invite.error);

    const ok = redeemMemberInviteToken(invite.rawToken);
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(getEventIfAuthorized(ok.userId, ev.id)?.myEffectiveRole).toBe('receptionist');
    }
    expect(redeemMemberInviteToken('token-ngawur').ok).toBe(false);
  });
});

