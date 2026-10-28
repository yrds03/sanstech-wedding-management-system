'use client';

import { useState } from 'react';
import {
  INVITATION_THEMES,
  getInvitationFeatureAccess,
  planAtLeast,
} from '@/lib/invitation/config';
import type { InvitationConfig, InvitationThemeStyle, PlanCode } from '@/lib/types';

const PLAN_LABEL: Record<PlanCode, string> = {
  free: 'Free',
  pro: 'Signature Pro',
  pro_plus: 'Royal Grand (Pro Plus)',
};

interface InvitationStudioProps {
  eventId: string;
  plan: PlanCode;
  initialConfig: InvitationConfig;
  brideName: string;
  groomName: string;
  eventDate: string;
  venue: string;
  canEdit: boolean;
}

function LockBadge({ label }: { label: string }) {
  return (
    <span className="ml-2 rounded-full bg-gold/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold-dark">
      🔒 {label}
    </span>
  );
}

export function InvitationStudio({
  eventId,
  plan,
  initialConfig,
  brideName,
  groomName,
  eventDate,
  venue,
  canEdit,
}: InvitationStudioProps) {
  const [cfg, setCfg] = useState<InvitationConfig>(initialConfig);
  const access = getInvitationFeatureAccess(plan);
  const theme = INVITATION_THEMES[cfg.themeStyle];

  function update<K extends keyof InvitationConfig>(key: K, value: InvitationConfig[K]) {
    setCfg((prev) => ({ ...prev, [key]: value }));
  }

  const fieldClass =
    'w-full rounded-button border border-border bg-ivory/60 px-3.5 py-2.5 text-sm text-ink disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <section className="rounded-card border border-gold/40 bg-surface p-6 shadow-sm space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl font-bold text-navy">Studio Desain &amp; Konten Undangan Digital</h2>
          <p className="text-xs text-ink/70 mt-1 max-w-2xl">
            Atur tema, salam, kutipan, dress code, lokasi peta, dan amplop digital. Perubahan langsung terlihat
            di pratinjau dan di semua tautan undangan tamu.
          </p>
        </div>
        <span className="rounded-full border border-gold/50 bg-gold/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-navy">
          Paket acara: {PLAN_LABEL[plan]}
        </span>
      </div>

      {!access.customTheme && (
        <div className="rounded-button border border-gold/40 bg-gold/10 p-3 text-xs text-navy">
          <strong>Paket Free</strong> hanya memakai tema Classic Ivory dengan watermark SANSTECH. Upgrade ke{' '}
          <strong>Signature Pro</strong> untuk 4 tema premium, teks kustom, tautan peta &amp; tanpa watermark; atau{' '}
          <strong>Royal Grand</strong> untuk amplop digital &amp; white-label brand WO. Hubungi admin SANSTECH untuk upgrade.
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
        <form
          action={`/api/events/${eventId}/invitation-design`}
          method="POST"
          className="space-y-5"
        >
          {/* Tema */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-navy mb-2">1. Pilih Tema</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(Object.values(INVITATION_THEMES)).map((t) => {
                const unlocked = planAtLeast(plan, t.minPlan);
                const selected = cfg.themeStyle === t.id;
                return (
                  <label
                    key={t.id}
                    className={`relative rounded-button border-2 p-3 cursor-pointer transition ${
                      selected ? 'border-gold bg-gold/10' : 'border-border bg-ivory/50'
                    } ${!unlocked || !canEdit ? 'opacity-55 cursor-not-allowed' : 'hover:border-gold/60'}`}
                  >
                    <input
                      type="radio"
                      name="themeStyle"
                      value={t.id}
                      checked={selected}
                      disabled={!unlocked || !canEdit}
                      onChange={() => update('themeStyle', t.id as InvitationThemeStyle)}
                      className="sr-only"
                    />
                    <div className="flex items-center gap-2">
                      <span
                        className="h-8 w-8 rounded-full border border-black/10"
                        style={{ background: `linear-gradient(135deg, ${t.swatch[0]} 55%, ${t.swatch[1]} 55%)` }}
                      />
                      <span className="text-sm font-bold text-navy">{t.label}</span>
                    </div>
                    <p className="mt-1.5 text-[11px] text-ink/65">{t.description}</p>
                    {!unlocked && <LockBadge label="Signature Pro" />}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Teks */}
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-navy">
              2. Teks Undangan
              {!access.customTexts && <LockBadge label="Signature Pro" />}
            </p>
            <div>
              <label className="block text-[11px] font-semibold text-ink/70 mb-1">Salam pembuka</label>
              <textarea
                name="customGreeting"
                rows={2}
                maxLength={280}
                value={cfg.customGreeting}
                disabled={!access.customTexts || !canEdit}
                onChange={(e) => update('customGreeting', e.target.value)}
                className={fieldClass}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-ink/70 mb-1">
                Kutipan ayat / doa (opsional)
              </label>
              <textarea
                name="quoteText"
                rows={2}
                maxLength={360}
                value={cfg.quoteText}
                disabled={!access.customTexts || !canEdit}
                onChange={(e) => update('quoteText', e.target.value)}
                placeholder="Dan di antara tanda-tanda kekuasaan-Nya ialah Dia menciptakan untukmu pasangan..."
                className={fieldClass}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-ink/70 mb-1">Dress code</label>
                <input
                  name="dressCode"
                  maxLength={120}
                  value={cfg.dressCode}
                  disabled={!access.customTexts || !canEdit}
                  onChange={(e) => update('dressCode', e.target.value)}
                  placeholder="Formal — nuansa navy & emas"
                  className={fieldClass}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-ink/70 mb-1">
                  Tautan Google Maps / Waze gedung
                  {!access.mapsLink && <LockBadge label="Pro" />}
                </label>
                <input
                  name="mapsUrl"
                  type="url"
                  maxLength={500}
                  value={cfg.mapsUrl}
                  disabled={!access.mapsLink || !canEdit}
                  onChange={(e) => update('mapsUrl', e.target.value)}
                  placeholder="https://maps.app.goo.gl/..."
                  className={fieldClass}
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-ink/70 mb-1">Pesan penutup</label>
              <textarea
                name="closingMessage"
                rows={2}
                maxLength={320}
                value={cfg.closingMessage}
                disabled={!access.customTexts || !canEdit}
                onChange={(e) => update('closingMessage', e.target.value)}
                className={fieldClass}
              />
            </div>
          </div>

          {/* Pro Plus */}
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-navy">
              3. Eksklusif Royal Grand (Pro Plus)
              {!access.digitalGift && <LockBadge label="Pro Plus" />}
            </p>
            <div>
              <label className="block text-[11px] font-semibold text-ink/70 mb-1">
                Amplop digital — nama bank, nomor rekening &amp; atas nama
              </label>
              <textarea
                name="digitalGiftBank"
                rows={3}
                maxLength={220}
                value={cfg.digitalGiftBank}
                disabled={!access.digitalGift || !canEdit}
                onChange={(e) => update('digitalGiftBank', e.target.value)}
                placeholder={'BCA 1234567890 a.n. Nama Mempelai\nDANA 0812xxxxxxx'}
                className={fieldClass}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-ink/70 mb-1">
                Nama brand WO (white-label, menggantikan watermark SANSTECH)
              </label>
              <input
                name="whiteLabelBrandName"
                maxLength={60}
                value={cfg.whiteLabelBrandName}
                disabled={!access.whiteLabel || !canEdit}
                onChange={(e) => update('whiteLabelBrandName', e.target.value)}
                placeholder="Contoh: Aurora Wedding Organizer"
                className={fieldClass}
              />
            </div>
          </div>

          {canEdit ? (
            <button
              type="submit"
              className="w-full min-h-[46px] rounded-button bg-navy border border-gold/50 px-5 py-3 text-xs font-bold uppercase tracking-widest text-gold-light hover:bg-navy-light transition shadow"
            >
              Simpan Desain Undangan
            </button>
          ) : (
            <p className="text-xs font-semibold text-danger">
              Peran Anda hanya dapat melihat desain undangan.
            </p>
          )}
        </form>

        {/* Pratinjau langsung */}
        <div className="xl:sticky xl:top-4 self-start">
          <p className="text-xs font-bold uppercase tracking-wider text-navy mb-2">Pratinjau Langsung</p>
          <div className={`rounded-[24px] border ${theme.accentBorderClass} ${theme.pageClass} p-4`}>
            <div className={`rounded-[20px] border ${theme.accentBorderClass} ${theme.cardClass} overflow-hidden`}>
              <div className={`${theme.headerClass} px-5 py-7 text-center`}>
                <p className={`text-[10px] uppercase tracking-[0.3em] ${theme.accentTextClass}`}>Undangan Pernikahan</p>
                <p className="mt-3 font-serif text-2xl font-bold leading-tight">
                  {brideName}
                  <span className={`block text-lg font-normal ${theme.accentTextClass}`}>&amp;</span>
                  {groomName}
                </p>
                <p className={`mt-3 text-[11px] ${theme.accentTextClass}`}>{eventDate}</p>
                <p className="text-[11px] opacity-85">{venue}</p>
              </div>
              <div className="px-5 py-5 space-y-3 text-center">
                <p className="text-[11px] leading-relaxed opacity-90">{cfg.customGreeting}</p>
                {cfg.quoteText && (
                  <p className={`font-serif italic text-[11px] ${theme.accentTextClass}`}>&ldquo;{cfg.quoteText}&rdquo;</p>
                )}
                {cfg.dressCode && (
                  <p className="text-[11px]">
                    <span className={`block uppercase tracking-widest text-[10px] ${theme.accentTextClass}`}>Dress Code</span>
                    {cfg.dressCode}
                  </p>
                )}
                {cfg.mapsUrl && access.mapsLink && (
                  <span className={`inline-block rounded-full px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest ${theme.buttonClass}`}>
                    Buka Lokasi di Peta
                  </span>
                )}
                {access.digitalGift && cfg.digitalGiftBank && (
                  <p className={`whitespace-pre-line rounded-xl border ${theme.accentBorderClass} p-3 text-[11px]`}>
                    <span className={`block uppercase tracking-widest text-[10px] ${theme.accentTextClass}`}>Amplop Digital</span>
                    {cfg.digitalGiftBank}
                  </p>
                )}
                <p className="text-[10px] opacity-75">{cfg.closingMessage}</p>
              </div>
              {(access.showSanstechWatermark || (access.whiteLabel && cfg.whiteLabelBrandName)) && (
                <p className="border-t border-black/10 py-2 text-center text-[10px] opacity-70">
                  {access.whiteLabel && cfg.whiteLabelBrandName
                    ? `Disajikan oleh ${cfg.whiteLabelBrandName}`
                    : 'Powered by SANSTECH Wedding Management System'}
                </p>
              )}
            </div>
          </div>
          <p className="mt-2 text-[11px] text-ink/60">
            Pratinjau disederhanakan. Klik &ldquo;Buka Undangan&rdquo; pada daftar tamu di bawah untuk melihat tampilan penuh
            setelah menyimpan.
          </p>
        </div>
      </div>
    </section>
  );
}

