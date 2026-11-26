import {describe, expect, it} from 'vitest';
import {getAddOnsCatalog, getPlansCatalog, canAddInvitationGroup, updatePlatformPricingAndRetention} from '@/lib/plans';
import {buildTvOperatorMessage} from '@/lib/display/pairing-message';

describe('offers and operational links', () => {
  it('offers only services with manual confirmation; unavailable modules cannot be mistaken for active add-ons', () => {
    const offers=getAddOnsCatalog();
    expect(offers.length).toBeGreaterThan(0);
    expect(offers.every(a=>a.availability==='manual_request')).toBe(true);
    expect(offers.some(a=>a.code==='addon_extra_quota_250'||a.code==='addon_extend_retention_30d'||a.code==='addon_souvenir_counter_module')).toBe(false);
    expect(getAddOnsCatalog({includeUnavailable:true}).find(a=>a.code==='addon_extra_quota_250')?.availability).toBe('unavailable');
  });
  it('keeps plan limits when an unavailable extra-quota price changes', () => {
    const before=getPlansCatalog().free.limits.maxInvitationGroups;
    updatePlatformPricingAndRetention({proPriceIdr:1490000,proPlusPriceIdr:3490000,gracePeriodDaysAfterEvent:14,addOnsPrices:{addon_extra_quota_250:0}});
    expect(getPlansCatalog().free.limits.maxInvitationGroups).toBe(before);
    expect(canAddInvitationGroup('free',before).allowed).toBe(false);
    expect(getAddOnsCatalog().some(a=>a.code==='addon_extra_quota_250')).toBe(false);
  });
  it('shares a full pairing portal URL instead of a six-digit code masquerading as a display session', () => {
    const text=buildTvOperatorMessage({appOrigin:'https://app.example.com',eventTitle:'Acara Uji',brideName:'Mempelai A',groomName:'Mempelai B',pairingCode:'123456'});
    expect(text).toContain('https://app.example.com/tv?code=123456');
    expect(text).not.toContain('/display/123456');
    expect(text).toContain('15 menit');
    expect(()=>buildTvOperatorMessage({appOrigin:'https://app.example.com',eventTitle:'Uji',brideName:'A',groomName:'B',pairingCode:'invalid'})).toThrow();
  });
});
