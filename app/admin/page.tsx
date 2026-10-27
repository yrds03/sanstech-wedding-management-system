import Link from 'next/link';
import { requireAuthenticatedUser } from '@/lib/auth/session';
import { getAddOnsCatalog, getPlansCatalog, getPostEventRetentionConfig } from '@/lib/plans';
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

  if (!user.isPlatformAdmin) {
    return (
      <AppShell user={user} effectiveRole="workspace_owner">
        <div className="max-w-2xl mx-auto my-12 rounded-card border-2 border-danger/30 bg-surface p-8 text-center shadow-lg">
          <Badge variant="danger">403 / AKSES KHUSUS PEMILIK SISTEM (SUPER ADMIN)</Badge>
          <h1 className="mt-3 font-serif text-3xl font-bold text-navy">
            Halaman Pengaturan Harga Disembunyikan dari Klien &amp; WO
          </h1>
          <p className="mt-2 text-sm text-ink/75 leading-relaxed">
            Saat ini Anda sedang masuk menggunakan akun klien/WO (<strong>{user.email}</strong>).
            Sesuai standar keamanan, klien dan WO reguler tidak dapat melihat atau mengubah harga
            paket maupun harga Add-On.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <form action="/api/auth/session" method="POST">
              <input type="hidden" name="userId" value="user-platform-admin" />
              <input type="hidden" name="redirectTo" value="/admin" />
              <button
                type="submit"
                className="min-h-[44px] rounded-button bg-navy border border-gold/50 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-gold-light hover:bg-navy-light transition"
              >
                🔐 Masuk Sebagai Super Admin (superadmin@sanstech.id)
              </button>
            </form>
            <Link
              href="/app/workspaces"
              className="min-h-[44px] inline-flex items-center rounded-button border border-border bg-ivory px-5 py-2.5 text-xs font-semibold text-navy"
            >
              Kembali ke Workspace
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  const catalog = getPlansCatalog();
  const addOnsCatalog = getAddOnsCatalog();
  const retention = getPostEventRetentionConfig();
  const events = getAllAuthorizedEventsForUser(user.userId);

  return (
    <AppShell user={user} effectiveRole="platform_admin">
      <div className="space-y-8">
        <div className="rounded-card border-2 border-gold/40 bg-gradient-to-r from-navy-dark via-navy to-navy-light text-ivory p-7 shadow-md">
          <Badge variant="gold">PANEL KONTROL PEMILIK SISTEM (SUPER ADMIN — TERSEMBUNYI DARI KLIEN)</Badge>
          <h1 className="mt-2 font-serif text-3xl font-bold text-white">
            Pengaturan Harga Paket, Katalog Add-On, Masa Aktif Akun &amp; Lisensi Acara
          </h1>
          <p className="mt-1.5 text-sm text-ivory/80 max-w-3xl">
            Panel ini hanya dapat diakses oleh akun <code>superadmin@sanstech.id</code> dan telah
            disembunyikan sepenuhnya dari Landing Page publik serta akun Klien/Pengantin.
          </p>
        </div>

        {searchParams?.notice && (
          <div className="rounded-button border border-success/40 bg-success/10 p-4 text-xs font-bold text-success">
            ✓ {searchParams.notice}
          </div>
        )}

        <form action="/api/admin/pricing" method="POST" className="space-y-8">
          <input type="hidden" name="action" value="update_pricing" />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-7">
            {/* 1. Pengaturan Harga Paket & Masa Aktif Pasca-Acara */}
            <section className="rounded-card border border-gold/30 bg-surface p-6 sm:p-7 shadow-sm space-y-4">
              <div>
                <h2 className="font-serif text-2xl font-bold text-navy">
                  1. Harga Paket Utama &amp; Masa Aktif Akun Pasca-Acara
                </h2>
                <p className="mt-1 text-xs text-ink/65 leading-relaxed">
                  Perubahan harga di bawah ini langsung memperbarui tampilan harga di Landing Page
                  depan dan halaman Paket seluruh acara.
                </p>
              </div>

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
                  <strong>Siklus Akun Pasca-Acara:</strong> H+1 s/d H+
                  {retention.gracePeriodDaysAfterEvent} hari akun masih bisa login untuk unduh
                  laporan Excel/CSV (scanner terkunci). Setelah H+
                  {retention.gracePeriodDaysAfterEvent} hari akun otomatis diarsipkan.
                </p>
              </div>
            </section>

            {/* 2. Pengaturan Harga 10 Katalog Add-On */}
            <section className="rounded-card border border-gold/30 bg-surface p-6 sm:p-7 shadow-sm space-y-4">
              <div>
                <h2 className="font-serif text-2xl font-bold text-navy">
                  2. Pengaturan Harga 10 Layanan Tambahan (Add-Ons)
                </h2>
                <p className="mt-1 text-xs text-ink/65 leading-relaxed">
                  Sesuaikan tarif sewa perangkat keras, kru lapangan, maupun kuota tambahan:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
                {addOnsCatalog.map((addon) => (
                  <div
                    key={addon.code}
                    className="rounded-button border border-border bg-ivory/50 p-3"
                  >
                    <label
                      htmlFor={`addon_${addon.code}`}
                      className="block text-[11px] font-bold text-navy leading-snug"
                    >
                      {addon.name}
                    </label>
                    <p className="text-[10px] text-ink/55 mb-1.5">
                      Saat ini: {addon.priceFormatted} ({addon.unitLabel})
                    </p>
                    <input
                      id={`addon_${addon.code}`}
                      name={`addon_${addon.code}`}
                      type="number"
                      min={0}
                      step={25000}
                      defaultValue={addon.priceIdr}
                      className="w-full min-h-[36px] rounded-button border border-border bg-surface px-2.5 py-1 text-xs font-bold text-navy tabular-nums"
                    />
                  </div>
                ))}
              </div>
            </section>
          </div>

          <button
            type="submit"
            className="w-full min-h-[48px] rounded-button bg-navy border border-gold/50 px-6 py-3 text-xs font-bold uppercase tracking-widest text-gold-light shadow-md hover:bg-navy-light transition"
          >
            💾 Simpan Seluruh Harga Paket, Harga 10 Add-On &amp; Masa Aktif Akun
          </button>
        </form>

        {/* 3. Aktivasi Manual Lisensi Paket Per Acara */}
        <section className="rounded-card border border-gold/30 bg-surface p-6 sm:p-7 shadow-sm">
          <h2 className="font-serif text-2xl font-bold text-navy">
            3. Aktivasi / Ubah Paket Lisensi Acara Klien
          </h2>
          <p className="mt-1 text-xs text-ink/65 leading-relaxed">
            Ketika klien WO atau pengantin telah melunasi pembayaran kepada Anda, aktifkan paket{' '}
            <strong>Signature Pro</strong> atau <strong>Royal Grand (Pro Plus)</strong> untuk acara
            mereka di sini:
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
        </section>
      </div>
    </AppShell>
  );
}
