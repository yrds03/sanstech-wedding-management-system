import Link from 'next/link';
import { requireAuthenticatedUser } from '@/lib/auth/session';
import { getPlansCatalog, getPostEventRetentionConfig } from '@/lib/plans';
import { getAllAuthorizedEventsForUser } from '@/lib/db/repository';
import { AppShell } from '@/components/app/app-shell';
import { Badge } from '@/components/ui/primitives';

export const dynamic = 'force-dynamic';

export default async function PlatformAdminPage({
  searchParams,
}: {
  searchParams?: { notice?: string; error?: string };
}) {
  const user = await requireAuthenticatedUser('/admin');
  const catalog = getPlansCatalog();
  const retention = getPostEventRetentionConfig();
  const events = getAllAuthorizedEventsForUser(user.userId);

  return (
    <AppShell user={user} effectiveRole="platform_admin">
      <div className="space-y-8">
        <div className="rounded-card border-2 border-gold/40 bg-gradient-to-r from-navy-dark via-navy to-navy-light text-ivory p-7 shadow-md">
          <Badge variant="gold">PANEL KONTROL PEMILIK SISTEM (SUPER ADMIN)</Badge>
          <h1 className="mt-2 font-serif text-3xl font-bold text-white">
            Pengaturan Harga Paket, Masa Aktif Akun &amp; Aktivasi Lisensi Acara
          </h1>
          <p className="mt-1.5 text-sm text-ivory/80 max-w-3xl">
            Atur harga jual paket per acara sesuai nilai pasar Wedding Organizer Anda, tentukan
            berapa hari akun klien tetap aktif setelah acara selesai (masa unduh laporan), dan
            aktifkan paket acara klien secara manual.
          </p>
        </div>

        {searchParams?.notice && (
          <div className="rounded-button border border-success/40 bg-success/10 p-4 text-xs font-bold text-success">
            ✓ {searchParams.notice}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-7">
          {/* 1. Pengaturan Harga Paket & Masa Aktif Pasca-Acara */}
          <section className="rounded-card border border-gold/30 bg-surface p-6 sm:p-7 shadow-sm">
            <h2 className="font-serif text-2xl font-bold text-navy">
              1. Atur Harga Paket &amp; Masa Aktif Akun Pasca-Acara
            </h2>
            <p className="mt-1 text-xs text-ink/65 leading-relaxed">
              Perubahan harga di bawah ini langsung memperbarui tampilan harga di Landing Page
              depan dan halaman Paket seluruh acara.
            </p>

            <form action="/api/admin/pricing" method="POST" className="mt-5 space-y-4">
              <input type="hidden" name="action" value="update_pricing" />

              <div>
                <label
                  htmlFor="proPriceIdr"
                  className="block text-xs font-bold uppercase tracking-wider text-navy mb-1.5"
                >
                  Harga Paket Signature Pro (IDR / Acara) — Saat ini: {catalog.pro.priceLabel}
                </label>
                <input
                  id="proPriceIdr"
                  name="proPriceIdr"
                  type="number"
                  min={0}
                  step={50000}
                  defaultValue={catalog.pro.priceIdr}
                  className="w-full min-h-[44px] rounded-button border border-border bg-ivory/60 px-3.5 py-2 text-sm font-bold text-navy tabular-nums"
                />
                <p className="mt-1 text-[11px] text-ink/55">
                  Contoh: <code>1490000</code> (Rp1.490.000) atau <code>2500000</code>{' '}
                  (Rp2.500.000).
                </p>
              </div>

              <div>
                <label
                  htmlFor="proPlusPriceIdr"
                  className="block text-xs font-bold uppercase tracking-wider text-navy mb-1.5"
                >
                  Harga Paket Royal Grand / Pro Plus (IDR / Acara) — Saat ini:{' '}
                  {catalog.pro_plus.priceLabel}
                </label>
                <input
                  id="proPlusPriceIdr"
                  name="proPlusPriceIdr"
                  type="number"
                  min={0}
                  step={50000}
                  defaultValue={catalog.pro_plus.priceIdr}
                  className="w-full min-h-[44px] rounded-button border border-border bg-ivory/60 px-3.5 py-2 text-sm font-bold text-navy tabular-nums"
                />
                <p className="mt-1 text-[11px] text-ink/55">
                  Contoh: <code>3490000</code> (Rp3.490.000) atau <code>5000000</code>{' '}
                  (Rp5.000.000).
                </p>
              </div>

              <div className="pt-2 border-t border-border">
                <label
                  htmlFor="gracePeriodDaysAfterEvent"
                  className="block text-xs font-bold uppercase tracking-wider text-navy mb-1.5"
                >
                  Masa Aktif Akun Setelah Tanggal Acara Selesai (Hari)
                </label>
                <input
                  id="gracePeriodDaysAfterEvent"
                  name="gracePeriodDaysAfterEvent"
                  type="number"
                  min={1}
                  max={365}
                  defaultValue={retention.gracePeriodDaysAfterEvent}
                  className="w-full min-h-[44px] rounded-button border border-border bg-ivory/60 px-3.5 py-2 text-sm font-bold text-navy tabular-nums"
                />
                <p className="mt-1.5 text-xs text-ink/70 leading-relaxed">
                  <strong>Cara Kerja Siklus Akun Pasca-Acara:</strong>
                  <br />• <strong>Sebelum &amp; Saat Hari-H:</strong> Seluruh fitur edit tamu &amp;
                  scanner check-in aktif penuh.
                  <br />• <strong>H+1 s/d H+{retention.gracePeriodDaysAfterEvent} Hari:</strong>{' '}
                  Scanner dikunci otomatis; akun Pengantin &amp; WO masih bisa masuk untuk{' '}
                  <strong>melihat &amp; mengunduh laporan Excel/CSV</strong>.
                  <br />• <strong>Setelah H+{retention.gracePeriodDaysAfterEvent} Hari:</strong>{' '}
                  Akses acara untuk pengantin/staf otomatis dinonaktifkan (archived/locked) demi
                  keamanan data pribadi tamu.
                </p>
              </div>

              <button
                type="submit"
                className="w-full min-h-[46px] rounded-button bg-navy border border-gold/40 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-gold-light hover:bg-navy-light transition"
              >
                Simpan Harga &amp; Kebijakan Masa Aktif
              </button>
            </form>
          </section>

          {/* 2. Aktivasi Manual Lisensi Paket Per Acara */}
          <section className="rounded-card border border-gold/30 bg-surface p-6 sm:p-7 shadow-sm flex flex-col justify-between">
            <div>
              <h2 className="font-serif text-2xl font-bold text-navy">
                2. Aktivasi / Ubah Paket Lisensi Acara Klien
              </h2>
              <p className="mt-1 text-xs text-ink/65 leading-relaxed">
                Ketika klien WO atau pengantin telah melunasi pembayaran kepada Anda, aktifkan
                paket <strong>Signature Pro</strong> atau <strong>Royal Grand (Pro Plus)</strong>{' '}
                untuk acara mereka di sini:
              </p>

              <div className="mt-5 space-y-3">
                {events.map((ev) => (
                  <div
                    key={ev.id}
                    className="rounded-button border border-border bg-ivory/60 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <p className="font-bold text-navy text-sm">{ev.title}</p>
                      <p className="text-xs text-ink/60">
                        Tanggal: {ev.eventDate} · Paket Saat Ini:{' '}
                        <strong className="text-gold-dark">{ev.planCode.toUpperCase()}</strong>
                      </p>
                    </div>

                    <form
                      action="/api/admin/pricing"
                      method="POST"
                      className="flex items-center gap-2"
                    >
                      <input type="hidden" name="action" value="activate_event_plan" />
                      <input type="hidden" name="eventId" value={ev.id} />
                      <select
                        name="planCode"
                        defaultValue={ev.planCode}
                        className="min-h-[38px] rounded-button border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-navy"
                      >
                        <option value="free">Free (50 Undangan)</option>
                        <option value="pro">Signature Pro (500 Undangan)</option>
                        <option value="pro_plus">Royal Grand / Pro Plus (2.000)</option>
                      </select>
                      <button
                        type="submit"
                        className="min-h-[38px] rounded-button bg-navy px-3.5 py-1.5 text-xs font-semibold text-gold-light hover:bg-navy-light transition"
                      >
                        Aktifkan
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 rounded-button bg-gold/10 border border-gold/30 p-4 text-xs text-ink/80">
              <strong>Catatan Keamanan (PRD 4.1):</strong> Sesuai aturan pelindungan data pribadi,
              Panel Super Admin hanya menampilkan nama acara dan lisensi tanpa mengizinkan pembacaan
              bebas terhadap catatan pribadi tamu.
            </div>
          </section>
        </div>

        <div className="flex items-center justify-between pt-2">
          <Link
            href="/app/workspaces"
            className="text-xs font-semibold text-navy hover:underline"
          >
            &larr; Kembali ke Daftar Workspace
          </Link>
          <Link
            href="/panduan"
            className="text-xs font-bold text-gold-dark hover:underline"
          >
            Buka Buku Pedoman Penggunaan (Siap Cetak) &rarr;
          </Link>
        </div>
      </div>
    </AppShell>
  );
}

