import type {InvitationGroupDetail} from '@/lib/types';
export function EditGuestForm({group}:{group:InvitationGroupDetail}) {
 const inputClass='block w-full rounded border border-border bg-surface px-3 py-2 text-sm';
 return <details className="mt-2 text-sm"><summary className="cursor-pointer font-medium underline">Ubah data tamu</summary>
  <form action={`/api/events/${group.eventId}/guests`} method="POST" className="mt-3 space-y-3 min-w-64">
   <input type="hidden" name="action" value="update"/><input type="hidden" name="groupId" value={group.id}/>
   <label className="block">Nama penerima<input className={inputClass} name="displayName" required minLength={2} maxLength={160} defaultValue={group.displayName}/></label>
   <label className="block">Nomor WhatsApp<input className={inputClass} name="phoneOptional" maxLength={40} defaultValue={group.phoneOptional??''}/></label>
   <label className="block">Jenis undangan<select className={inputClass} name="type" defaultValue={group.type}><option value="individual">Individu</option><option value="couple">Pasangan</option><option value="family">Keluarga</option></select></label>
   <label className="block">Kapasitas<input className={inputClass} name="capacity" type="number" required min={Math.max(1,group.checkedInCount,group.rsvpCount)} max={20} defaultValue={group.capacity}/></label>
   <label className="block">Kategori<select className={inputClass} name="guestCategory" defaultValue={group.guestCategory}><option value="regular">Reguler</option><option value="vip">VIP</option><option value="vvip">VVIP</option></select></label>
   <label className="block">Meja<input className={inputClass} name="tableLabelOptional" maxLength={80} defaultValue={group.tableLabelOptional??''}/></label>
   <label className="block">Catatan internal<textarea className={inputClass} name="notesPrivateOptional" maxLength={500} defaultValue={group.notesPrivateOptional??''}/></label>
   <label className="flex gap-2"><input type="checkbox" name="allowedPublicDisplay" defaultChecked={group.allowedPublicDisplay}/>Nama boleh ditampilkan di layar publik</label>
   <button className="rounded bg-navy px-4 py-2 text-white">Simpan perubahan</button>
  </form>
 </details>;
}
