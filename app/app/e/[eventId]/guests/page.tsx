import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAuthenticatedUser } from '@/lib/auth/session';
import {
  getAuthorizedWorkspacesForUser,
  getEventIfAuthorized,
  getWorkspaceIfAuthorized,
  listInvitationGroupsForEvent,
} from '@/lib/db/repository';
import { AppShell } from '@/components/app/app-shell';
import { Badge, EmptyState } from '@/components/ui/primitives';
import { getPlansCatalog } from '@/lib/plans';
import { BatchImportBox } from '@/components/guests/batch-import-box';

export const dynamic = 'force-dynamic';

export default async function EventGuestsPage({
  params,
  searchParams,
}: {
  params: { eventId: string };
  searchParams?: {
    q?: string;
    category?: string;
    added?: string;
    imported?: string;
    reset_notice?: string;
    error?: string;
  };
}) {
  const user = await requireAuthenticatedUser(`/app/e/${params.eventId}/guests`);
  const event = getEventIfAuthorized(user.userId, params.eventId);

  if (!event) {
    notFound();
  }

  const allWorkspaces = getAuthorizedWorkspacesForUser(user.userId);
  const activeWorkspace = getWorkspaceIfAuthorized(user.userId, event.workspaceId);
  const groups =
    listInvitationGroupsForEvent(user.userId, event.id, {
      query: searchParams?.q,
      category: searchParams?.category,
    }) ?? [];
  const plan = getPlansCatalog()[event.planCode];

  return (
    <AppShell
      user={user}
      activeWorkspace={activeWorkspace}
      allWorkspaces={allWorkspaces}
      effectiveRole={event.myEffectiveRole}
      eventId={event.id}
      eventTitle={event.title}
    >
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="gold">
                Kuota Terpakai: {event.metrics.invitationGroupsCount} /{' '}
                {plan.limits.maxInvitationGroups} Grup Undangan
              </Badge>
              <Badge variant="outline">
                Total Kapasitas: {event.metrics.invitedCapacityTotal} Orang
              </Badge>
            </div>
            <h1 className="mt-2 font-serif text-3xl font-bold text-navy">
              Daftar Tamu &amp; Kuota Keluarga (S08 / S09)
            </h1>
            <p className="text-xs text-ink/70 mt-1">
              Kelola daftar penerima undangan (Individu, Pasangan, Keluarga), atur kategori
              VIP/VVIP, dan tentukan privasi layar sambutan.
            </p>
          </div>

          <form action={`/api/events/${event.id}/testing-reset`} method="POST">
            <input type="hidden" name="mode" value="delete_all_test_guests" />
            <input type="hidden" name="returnTo" value={`/app/e/${event.id}/guests`} />
            <button
              type="submit"
              className="min-h-[40px] rounded-button border border-danger/40 bg-danger/10 px-4 py-2 text-xs font-bold text-danger hover:bg-danger hover:text-white transition"
            >
              🗑️ Bersihkan Semua Tamu Testing
            </button>
          </form>
        </div>

        {searchParams?.added && (
          <div className="rounded-button border border-success/40 bg-success/10 p-3.5 text-xs font-bold text-success">
            ✓ Grup undangan baru beserta kode QR unik berhasil ditambahkan!
          </div>
        )}

        {searchParams?.imported && (
          <div className="rounded-button border border-success/40 bg-success/10 p-3.5 text-xs font-bold text-success">
            ✓ Berhasil mengimpor {searchParams.imported} baris grup undangan sekaligus!
          </div>
        )}

        {searchParams?.reset_notice && (
          <div className="rounded-button border border-success/40 bg-success/10 p-3.5 text-xs font-bold text-success">
            ✓ {searchParams.reset_notice}
          </div>
        )}

        {searchParams?.error && (
          <div className="rounded-button border border-danger/40 bg-danger/10 p-3.5 text-xs font-bold text-danger">
            {searchParams.error}
          </div>
        )}

        {/* Form Tambah Tamu & Import Cepat CSV */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="lg:col-span-2 rounded-card border border-gold/30 bg-surface p-6 shadow-sm">
            <h2 className="font-serif text-xl font-bold text-navy">
              Tambah Grup Undangan Baru
            </h2>
            <form
              action={`/api/events/${event.id}/guests`}
              method="POST"
              className="mt-4 space-y-4"
            >
              <input type="hidden" name="action" value="create" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-navy mb-1">
                    Nama Penerima Undangan (Tampil di Undangan)
                  </label>
                  <input
                    name="displayName"
                    type="text"
                    required
                    minLength={2}
                    placeholder="Contoh: Bapak H. Sudirman & Keluarga"
                    className="w-full min-h-[42px] rounded-button border border-border bg-ivory/60 px-3.5 py-2 text-sm text-ink"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-navy mb-1">
                    Tipe Undangan
                  </label>
                  <select
                    name="type"
                    defaultValue="couple"
                    className="w-full min-h-[42px] rounded-button border border-border bg-ivory/60 px-3 py-2 text-sm text-ink"
                  >
                    <option value="individual">Individu (1 Orang)</option>
                    <option value="couple">Pasangan (2 Orang)</option>
                    <option value="family">Keluarga / Rombongan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-navy mb-1">
                    Kuota Maksimal Orang Hadir (1–20)
                  </label>
                  <input
                    name="capacity"
                    type="number"
                    min={1}
                    max={20}
                    required
                    defaultValue={2}
                    className="w-full min-h-[42px] rounded-button border border-border bg-ivory/60 px-3.5 py-2 text-sm text-ink tabular-nums"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-navy mb-1">
                    Kategori Tamu
                  </label>
                  <select
                    name="guestCategory"
                    defaultValue="regular"
                    className="w-full min-h-[42px] rounded-button border border-border bg-ivory/60 px-3 py-2 text-sm text-ink"
                  >
                    <option value="regular">Reguler</option>
                    <option value="vip">VIP</option>
                    <option value="vvip">VVIP (Tamu Kehormatan)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-navy mb-1">
                    Nomor / Nama Meja (Opsional)
                  </label>
                  <input
                    name="tableLabelOptional"
                    type="text"
                    placeholder="Contoh: Meja VVIP 02 / Meja Anggrek"
                    className="w-full min-h-[42px] rounded-button border border-border bg-ivory/60 px-3.5 py-2 text-sm text-ink"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-navy mb-1">
                    Nomor WhatsApp (Opsional)
                  </label>
                  <input
                    name="phoneOptional"
                    type="text"
                    placeholder="0812xxxxxxxx"
                    className="w-full min-h-[42px] rounded-button border border-border bg-ivory/60 px-3.5 py-2 text-sm text-ink"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-navy mb-1">
                    Catatan Internal WO/Usher (Tidak Dilihat Tamu)
                  </label>
                  <input
                    name="notesPrivateOptional"
                    type="text"
                    placeholder="Contoh: Jemput dengan kursi roda / Pimpinan Klien"
                    className="w-full min-h-[42px] rounded-button border border-border bg-ivory/60 px-3.5 py-2 text-sm text-ink"
                  />
                </div>
              </div>

              <label className="flex items-start gap-2.5 text-xs text-ink/80 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  name="allowedPublicDisplay"
                  className="mt-0.5 h-4 w-4 rounded border-border text-navy"
                />
                <span>
                  <strong>Izinkan nama tamu ini tampil di Layar Sambutan TV Publik</strong> saat
                  check-in (Default tidak dicentang demi menjaga privasi tamu VIP).
                </span>
              </label>

              <button
                type="submit"
                className="min-h-[44px] rounded-button bg-navy border border-gold/40 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-gold-light hover:bg-navy-light transition"
              >
                + Simpan Tamu &amp; Buat QR Unik
              </button>
            </form>
          </section>

          {/* Import Massal CSV / Excel Copy-Paste & File Upload */}
          <section className="rounded-card border border-gold/30 bg-surface p-6 shadow-sm flex flex-col justify-between">
            <div>
              <Badge variant="gold">IMPORT CEPAT (S09)</Badge>
              <h2 className="mt-2 font-serif text-xl font-bold text-navy">
                Import Batch dari Excel / CSV
              </h2>
              <p className="mt-1 text-xs text-ink/65 leading-relaxed">
                Unduh template resmi di bawah ini, isi daftar tamu di Microsoft Excel, lalu upload
                kembali file <code>.csv</code> Anda:
              </p>

              <BatchImportBox
                eventId={event.id}
                maxGroupsLimit={plan.limits.maxInvitationGroups}
              />
            </div>
          </section>
        </div>

        {/* Filter & Tabel Daftar Tamu */}
        <section className="rounded-card border border-gold/30 bg-surface p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
            <h2 className="font-serif text-xl font-bold text-navy">
              Daftar Undangan Terdaftar ({groups.length} Grup)
            </h2>

            <form method="GET" className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                name="q"
                defaultValue={searchParams?.q ?? ''}
                placeholder="Cari nama / meja / kode QR..."
                className="min-h-[38px] rounded-button border border-border bg-ivory/60 px-3 py-1.5 text-xs text-ink"
              />
              <select
                name="category"
                defaultValue={searchParams?.category ?? 'all'}
                className="min-h-[38px] rounded-button border border-border bg-ivory/60 px-3 py-1.5 text-xs text-ink"
              >
                <option value="all">Semua Kategori</option>
                <option value="vvip">VVIP</option>
                <option value="vip">VIP</option>
                <option value="regular">Reguler</option>
              </select>
              <button
                type="submit"
                className="min-h-[38px] rounded-button bg-navy px-4 py-1.5 text-xs font-semibold text-white"
              >
                Filter
              </button>
            </form>
          </div>

          {groups.length === 0 ? (
            <EmptyState
              title="Belum ada undangan. Tambahkan satu tamu atau import Excel."
              description="Gunakan formulir di atas untuk menambahkan tamu pertama Anda."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-border text-[11px] uppercase text-ink/60">
                    <th className="py-3 pr-3">Nama Penerima &amp; Catatan</th>
                    <th className="py-3 px-3">Kategori &amp; Meja</th>
                    <th className="py-3 px-3">Kuota</th>
                    <th className="py-3 px-3">RSVP</th>
                    <th className="py-3 px-3">Hadir / Sisa</th>
                    <th className="py-3 px-3">Layar Publik</th>
                    <th className="py-3 pl-3 text-right">Tautan &amp; QR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {groups.map((g) => (
                    <tr key={g.id} className="hover:bg-ivory/50">
                      <td className="py-3.5 pr-3">
                        <p className="font-bold text-navy">{g.displayName}</p>
                        {g.notesPrivateOptional && (
                          <p className="text-[11px] text-ink/60">
                            🔒 Catatan WO: {g.notesPrivateOptional}
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 px-3">
                        <Badge
                          variant={
                            g.guestCategory === 'vvip' || g.guestCategory === 'vip'
                              ? 'gold'
                              : 'outline'
                          }
                        >
                          {g.guestCategory.toUpperCase()}
                        </Badge>
                        {g.tableLabelOptional && (
                          <span className="block text-xs text-ink/70 mt-1">
                            {g.tableLabelOptional}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 tabular-nums font-bold text-navy">
                        {g.capacity} org
                      </td>
                      <td className="py-3.5 px-3 text-xs tabular-nums">
                        {g.rsvpStatus === 'attending' ? (
                          <span className="font-semibold text-success">
                            Hadir ({g.rsvpCount})
                          </span>
                        ) : g.rsvpStatus === 'declined' ? (
                          <span className="text-danger">Tidak Hadir</span>
                        ) : (
                          <span className="text-ink/50">Belum RSVP</span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 tabular-nums">
                        <strong className="text-navy">{g.checkedInCount}</strong> hadir ·{' '}
                        <span className="text-ink/65">Sisa {g.remainingCapacity}</span>
                      </td>
                      <td className="py-3.5 px-3 text-xs">
                        {g.allowedPublicDisplay ? (
                          <Badge variant="success">Tampil TV</Badge>
                        ) : (
                          <Badge variant="outline">Privat (Off)</Badge>
                        )}
                      </td>
                      <td className="py-3.5 pl-3 text-right space-x-2">
                        <Link
                          href={`/i/${g.publicTokenPreview}`}
                          className="inline-flex items-center rounded border border-gold/40 bg-gold/10 px-2.5 py-1 text-xs font-bold text-navy hover:bg-gold/25"
                        >
                          Lihat Undangan
                        </Link>
                        <Link
                          href={`/app/e/${event.id}/checkin?prefill=${encodeURIComponent(
                            g.qrTokenPreview
                          )}`}
                          className="inline-flex items-center rounded bg-navy px-2.5 py-1 text-xs font-bold text-gold-light hover:bg-navy-light"
                        >
                          Simulasi Scan ({g.qrTokenPreview})
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
