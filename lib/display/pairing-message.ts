export function buildTvOperatorMessage(input: {
  appOrigin: string; eventTitle: string; brideName: string; groomName: string; pairingCode: string;
}): string {
  if (!/^\d{6}$/.test(input.pairingCode)) throw new Error('Kode layar tidak valid.');
  const portal = new URL('/tv', input.appOrigin);
  portal.searchParams.set('code', input.pairingCode);
  return `Halo Operator TV/LED untuk acara *${input.eventTitle}* (${input.brideName} & ${input.groomName}).\n\n1. Buka tautan ini pada browser Smart TV atau laptop yang tersambung HDMI:\n${portal.href}\n2. Kode *${input.pairingCode}* sudah terisi. Tekan Hubungkan Layar. Kode berlaku 15 menit dan hanya dapat digunakan sekali.\n3. Aktifkan layar penuh pada perangkat. Nama ditampilkan setelah check-in tersimpan dan tamu mengizinkan tampil publik.\n\nInternet harus tetap terhubung. Jika kode kedaluwarsa atau sudah dipakai, minta kode baru kepada pengelola acara.`;
}
