import Link from 'next/link';
import {PrintHandbookButton} from '@/components/app/print-handbook-button';
import {BRAND_NAME} from '@/lib/types';

const chapters = [
  {id:'akun',title:'1. Masuk menggunakan Google',intro:'Setiap orang memakai akun sendiri. Aplikasi tidak memakai kata sandi terpisah.',steps:[
    'Buka halaman Masuk, tekan Lanjutkan dengan Google, lalu pilih akun yang akan digunakan. Untuk menerima undangan tim, email akun harus sama dengan email penerima undangan.',
    'Pada pemakaian pertama, Google dapat meminta persetujuan membaca identitas dasar: nama, email dan profil. Login petugas tidak meminta akses Drive pribadinya.',
    'Jika muncul tombol Lanjutkan ke SANSTECH, tekan tombol tersebut. Selesaikan segera; kode kembali ke aplikasi berlaku dua menit.',
    'Akun baru dimulai tanpa workspace atau acara. Jika keluar, masuk kembali dengan akun Google yang sama.',
  ],expected:'Daftar workspace atau formulir penyiapan workspace terbuka, tanpa permintaan kata sandi aplikasi.'},
  {id:'workspace',title:'2. Buat workspace dan acara',intro:'Workspace adalah ruang kerja WO atau pasangan. Satu workspace dapat berisi beberapa acara.',steps:[
    'Buka penyiapan workspace jika belum ada ruang kerja. Pilih WO atau pribadi/pengantin, lalu isi nama dan slug yang belum digunakan. Slug adalah nama singkat untuk mengenali workspace.',
    'Buka workspace yang benar, masuk ke daftar acara, lalu isi formulir acara: judul, nama kedua mempelai, tanggal, jam mulai/selesai, zona waktu, tempat, alamat dan kota.',
    'Periksa zona waktu WIB, WITA atau WIT. Untuk mencoba alur hari-H sekarang, gunakan tanggal hari ini agar tidak masuk masa setelah acara.',
    'Simpan dan tunggu ringkasan acara. Acara produksi dimulai dengan Free; memilih kebutuhan Pro tidak berarti lisensi berbayar atau pembayaran langsung aktif.',
  ],expected:'Judul dan tanggal sesuai isian. Acara baru mempunyai nol tamu dan nol kehadiran.'},
  {id:'paket',title:'3. Paket, harga dan kuota',intro:'Batas Free/Pro tetap berlaku. Satu grup undangan dapat mencakup beberapa orang.',steps:[
    'Free menyediakan maksimal 50 grup dan satu scanner aktif: input tamu manual, undangan dasar, RSVP dan ringkasan CSV. Gunakan ini untuk memulai uji alur dasar tanpa membeli paket.',
    'Pro menyediakan maksimal 500 grup dan tiga scanner aktif, impor CSV/Excel, layar sambutan dan ekspor detail. Pro Plus menyediakan maksimal 2.000 grup dan sepuluh scanner aktif serta notifikasi internal Usher.',
    'Periksa harga, paket aktif dan status lisensi di Paket & Layanan. Aktivasi Pro/Pro Plus dilakukan administrator platform setelah konfirmasi manual. Pemilik workspace tidak otomatis menjadi administrator platform.',
    'Extra Quota +250, perpanjangan arsip tambahan dan modul souvenir belum tersedia untuk pemesanan. Mengubah harga layanan atau menghubungi pengelola tidak menambah kuota.',
    'Perangkat, kru, cetak dan pendampingan pengiriman adalah permintaan manual. Ketersediaan, jadwal, pelaksanaan dan harga akhir dikonfirmasi sebelum pembayaran.',
  ],expected:'Paket yang benar-benar aktif dan sisa kuota diketahui sebelum memasukkan data.'},
  {id:'tim',title:'4. Undang tim dan atur peran',intro:'Berikan hak sesuai pekerjaan. Keanggotaan satu acara tidak membuka acara lainnya.',steps:[
    'Pengelola membuka Tim & Akses Pasangan, mengisi email Google penerima dan memilih peran.',
    'Buat tautan undangan lalu kirim sendiri secara pribadi. Undangan berlaku 72 jam. Penerima membuka tautan, masuk dengan email yang sama, lalu menerima undangan.',
    'Receptionist bertugas check-in. Supervisor dapat menangani koreksi. Usher melihat koordinasi VIP. Viewer membaca ringkasan/laporan yang diizinkan.',
    'Jika email berbeda, undangan kedaluwarsa atau sudah dicabut, minta undangan baru yang benar. Cabut keanggotaan petugas yang selesai bertugas; jangan berbagi satu akun untuk seluruh pintu.',
  ],expected:'Penerima membuka acara dan menu sesuai perannya. Akun tanpa keanggotaan tidak mendapat akses.'},
  {id:'tamu',title:'5. Isi daftar tamu tanpa data contoh',intro:'Satu grup adalah satu undangan. Kapasitas menunjukkan jumlah orang yang boleh datang, bukan jumlah kartu.',steps:[
    'Buka Daftar Tamu. Isi nama penerima dan kapasitas bilangan bulat 1–20 orang. Pilih tipe individu, pasangan atau keluarga.',
    'Pilih kategori Reguler, VIP atau VVIP. Meja, nomor kontak dan catatan internal boleh kosong. Masukkan data pribadi seperlunya.',
    'Izin tampil nama di TV awalnya tidak aktif. Aktifkan hanya setelah persetujuan tamu dipastikan. Nomor kontak dan catatan internal tidak tampil pada layar publik.',
    'Tekan Simpan Tamu & Buat QR Unik. Tunggu hasil, lalu pastikan nama muncul dan jumlah grup bertambah. Gunakan Ubah data tamu untuk memperbarui.',
    'Kapasitas tidak dapat diturunkan di bawah jumlah RSVP atau orang yang sudah hadir. Periksa riwayat sebelum mengubahnya.',
  ],expected:'Nama yang dimasukkan muncul satu kali dengan QR sendiri, sementara kehadiran tetap nol.'},
  {id:'impor',title:'6. Impor CSV/Excel pada Pro atau Pro Plus',intro:'Template diunduh dari aplikasi dan hanya berisi header. Tidak ada tamu contoh yang ikut diimpor.',steps:[
    'Buka Daftar Tamu, bagian Import Batch. Pada Free, gunakan input manual atau minta aktivasi paket yang sesuai.',
    'Unduh template Excel/CSV. Isi sheet Data Tamu mulai baris kedua. Pertahankan tujuh header dan urutannya pada tabel di bawah. Sheet Petunjuk tidak perlu diubah.',
    'Isi kapasitas setiap baris dan jangan menambah kolom. Gunakan satu sel untuk setiap nilai. Jika memakai CSV dengan pemisah di dalam nama/catatan, gunakan tanda kutip CSV yang benar.',
    'Simpan sebagai .xlsx atau .csv lalu pilih file di aplikasi. Format .xls lama harus disimpan ulang sebagai .xlsx. Maksimal file 5 MB; tunggu pembacaan selesai.',
    'Periksa pratinjau, jumlah grup, sisa kuota dan semua pesan validasi. Perbaiki dahulu jika ada kesalahan. File gagal dibaca tidak dapat diteruskan menjadi impor.',
    'Tekan Import Semua Baris Sekaligus setelah benar. Maksimal 2.000 baris per batch, mengikuti sisa kuota. Pengiriman maksimal 4 MB setelah pengodean formulir; pecah batch jika diminta.',
    'Data tidak valid, calon duplikat atau kuota tidak cukup membatalkan seluruh batch. Jika nama sama memang orang berbeda, tambahkan manual dengan identitas undangan yang jelas.',
  ],expected:'Seluruh batch tersimpan bersama atau ditolak bersama dengan pesan perbaikan.'},
  {id:'undangan',title:'7. Bagikan undangan dan periksa RSVP',intro:'Tautan undangan dan QR check-in adalah akses pribadi penerima dengan kegunaan berbeda.',steps:[
    'Buka Undangan Digital & QR. Atur desain sesuai paket, simpan dan periksa dari ponsel: nama pasangan, tanggal, lokasi, alamat dan penerima.',
    'Bagikan tautan grup yang benar. Tombol WhatsApp menyiapkan pesan; Anda tetap memilih penerima dan menekan Kirim. Tidak ada pengiriman massal otomatis.',
    'Penerima membuka tautan, mengisi status RSVP dan jumlah yang direncanakan datang sesuai kapasitas undangan.',
    'RSVP tidak menambah kehadiran hari-H. Kehadiran hanya berubah setelah check-in berhasil tersimpan.',
    'Jika tautan atau QR salah tersebar, rotasi token melalui menu undangan. Token lama berhenti berlaku; bagikan ulang yang baru kepada penerima yang benar.',
  ],expected:'RSVP tercatat, tetapi jumlah hadir masih nol sebelum ada check-in.'},
  {id:'checkin',title:'8. Check-in dan kedatangan bertahap',intro:'Aplikasi membutuhkan internet. Konfirmasikan jumlah yang datang pada transaksi itu.',steps:[
    'Petugas masuk pada acara yang benar, lalu membuka Check-in. Pastikan kamera diizinkan, baterai cukup dan internet tersambung.',
    'Pindai QR, unggah gambar QR atau cari nama secara manual. Periksa nama, kategori, meja dan sisa kapasitas.',
    'Atur jumlah orang yang benar-benar datang, lalu konfirmasi. Undangan empat orang boleh datang dua orang dahulu dan dua orang berikutnya pada transaksi berbeda.',
    'Tunggu konfirmasi server. Setelah berhasil, hadir bertambah dan sisa kapasitas berkurang. QR yang sama dapat dipakai untuk sisa kapasitas; total tidak boleh melampaui kuota.',
    'Jika koneksi terputus, jangan langsung menganggap berhasil atau membuat transaksi baru. Periksa riwayat/jumlah hadir. Pengulangan transaksi yang sama dilindungi kunci idempotensi.',
    'Batas scanner aktif mengikuti paket. Pengelola dapat mencabut sesi perangkat. Perangkat dihitung aktif selama dua menit setelah transaksi terakhir.',
  ],expected:'Jumlah sesuai orang yang datang dan pengiriman ulang transaksi yang sama tidak dihitung dua kali.'},
  {id:'koreksi',title:'9. Koreksi jumlah yang salah',intro:'Koreksi dilakukan pengelola berizin atau Supervisor. Transaksi lama tetap tersimpan.',steps:[
    'Periksa riwayat grup dan cocokkan dengan keadaan di lokasi. Hubungi Supervisor jika peran Anda tidak memiliki hak koreksi.',
    'Masukkan perubahan bertanda: negatif untuk mengurangi, positif untuk menambah. Tulis alasan yang jelas.',
    'Simpan dan tunggu hasil. Total akhir harus tetap antara nol dan kapasitas grup.',
    'Periksa entri koreksi pada laporan. Jangan mereset atau menghapus ledger produksi untuk menghilangkan kekeliruan.',
  ],expected:'Jumlah akhir benar; transaksi awal beserta koreksinya tetap dapat ditelusuri.'},
  {id:'layar',title:'10. Hubungkan TV/LED pada Pro atau Pro Plus',intro:'TV menerima sesi layar terbatas. Operator tidak perlu memakai akun pengelola.',steps:[
    'Pengelola berizin membuka Layar Sambutan dan mengambil kode enam angka atau pesan untuk operator. Kode berlaku 15 menit dan hanya dapat dipakai sekali.',
    'Pada laptop operator atau browser Smart TV, buka portal TV dari tautan yang diberikan. Bila menggunakan laptop, hubungkan HDMI dan pilih sumber HDMI yang sesuai pada TV.',
    'Isi kode dan tekan Hubungkan Layar. Tautan dengan kode terisi tetap memerlukan tombol Hubungkan; kode bukan alamat sesi langsung.',
    'Aktifkan layar penuh melalui F11 atau menu perangkat. Sesi berlaku 24 jam. Untuk perangkat kedua, minta kode baru.',
    'Nama muncul setelah check-in tersimpan dan hanya jika diizinkan tampil publik. Sambutan diantrekan sekitar delapan detik per grup. Pembaruan mengikuti internet, bukan jaminan waktu tertentu.',
    'Jika kode kedaluwarsa/sudah dipakai, ambil yang baru. Cabut sesi saat perangkat berpindah tangan atau acara selesai.',
  ],expected:'Layar tunggu acara terbuka; check-in dengan izin tampil menghasilkan sambutan sesuai antrean.'},
  {id:'vip',title:'11. Koordinasikan VIP dan Usher',intro:'Tampilan publik berbeda dari koordinasi internal yang dibatasi peran.',steps:[
    'Usher atau pengelola berizin membuka panel VIP untuk melihat tamu yang tiba dan masih ditunggu.',
    'Pada Pro Plus, kedatangan VIP menghasilkan notifikasi internal. Setelah didampingi, tekan Tandai sudah dijemput.',
    'Panel aktif diperbarui berkala. Jika koneksi lambat, koordinasikan langsung dengan Supervisor.',
    'VIP yang menolak tampil di TV tetap dapat ditangani internal sesuai hak petugas. Jangan menyebarkan tangkapan layar daftar tamu ke kanal umum.',
  ],expected:'Tim mengetahui tamu yang tiba dan sudah ditangani tanpa memaksa namanya tampil publik.'},
  {id:'laporan',title:'12. Unduh laporan dan tutup acara',intro:'Jumlah grup, kapasitas orang, RSVP dan kehadiran adalah angka yang berbeda.',steps:[
    'Buka Laporan. Bandingkan RSVP, orang hadir, grup yang datang dan koreksi. Cocokkan hasil dengan Supervisor.',
    'Free menyediakan ringkasan CSV. Pro/Pro Plus menyediakan detail CSV/Excel bagi peran berizin. Buka dan periksa isi file hasil unduhan.',
    'Setelah tanggal acara, perubahan tamu/check-in dibatasi. Free memberi akses laporan tiga hari setelah acara; paket berbayar mengikuti masa pada Paket & Layanan.',
    'Unduh arsip sebelum masa akses berakhir. Cabut sesi TV/scanner yang selesai, keluarkan petugas yang tidak lagi bertugas dan keluar dari perangkat bersama.',
  ],expected:'Arsip dapat dibuka dan akses perangkat yang selesai tidak dibiarkan aktif.'},
  {id:'penyimpanan',title:'13. Penyimpanan, biaya dan integrasi',intro:'Paket aplikasi dan paket penyedia hosting adalah dua hal terpisah.',steps:[
    'Data utama disimpan terenkripsi di Google Drive pemilik aplikasi. Spreadsheet berisi status koneksi, header dan kamus kolom; data tamu tidak disalin otomatis baris demi baris ke setiap tab Sheet.',
    'Untuk melihat data dalam bentuk tabel, gunakan Daftar Tamu atau laporan CSV/Excel sesuai paket. Jangan mengedit file snapshot database di Drive.',
    'Free bernilai Rp0. Pro/Pro Plus dan layanan manual mengikuti katalog serta konfirmasi pengelola. Membuka halaman paket atau WhatsApp tidak membuat pembayaran otomatis.',
    'Vercel Hobby gratis dengan kuota dan ketentuan penggunaan pribadi/nonkomersial. Akun Google mengikuti kuota paketnya; kuota gratis bawaan 15 GB dibagi untuk Drive, Gmail dan Photos. Kuota habis dapat menghentikan layanan.',
    'Login, penyimpanan dan pembaruan mengikuti ketersediaan Google serta internet. Upgrade layanan penyedia menjadi berbayar diputuskan pemilik akun secara terpisah.',
  ],expected:'Anda mengetahui letak data, cara mengunduhnya dan perbedaan harga aplikasi dengan biaya penyedia.'},
];
const importFields = [
  ['Nama Penerima','Wajib; 2–160 karakter. Nama untuk satu grup undangan.'],
  ['Kuota','Wajib; bilangan bulat 1–20. Jangan dikosongkan.'],
  ['Kategori','regular, vip atau vvip. Jika kosong dipakai regular.'],
  ['Meja','Opsional; maksimal 80 karakter.'],
  ['TampilTV','ya atau tidak. Kosong berarti tidak. Isi ya hanya setelah ada persetujuan.'],
  ['NoWA','Opsional; maksimal 40 karakter. Tidak memicu pengiriman otomatis.'],
  ['CatatanWO','Opsional; maksimal 500 karakter. Digunakan internal sesuai hak akses.'],
];
const troubleshooting = [
  ['Masuk kembali ke halaman login','Ulangi dari tombol aplikasi dengan akun Google yang benar. Selesaikan halaman Google dan tombol Lanjutkan ke SANSTECH segera. Jika berulang, laporkan waktu kejadian; jangan kirim kode login/cookie.'],
  ['Acara tidak terlihat atau akses ditolak','Periksa akun dan workspace. Untuk anggota tim, cocokkan email dengan undangan, masa berlaku 72 jam dan status penerimaannya. Minta pengelola memeriksa peran.'],
  ['Impor atau TV terkunci','Periksa paket dan lisensi acara. Free tidak menyediakan impor dan TV. Permintaan upgrade belum berarti paket sudah aktif.'],
  ['File gagal atau tombol impor tidak aktif','Gunakan .xlsx/.csv, isi header dan kapasitas, tunggu pembacaan dan perbaiki semua pesan. Jangan sekadar mengganti ekstensi .xls menjadi .xlsx tanpa menyimpan ulang di Excel.'],
  ['Nama tidak tampil di TV','Periksa paket, sesi layar, internet, check-in yang sudah tersimpan dan izin TampilTV. Tunggu antrean. Nama tanpa izin tidak ditampilkan.'],
  ['Kuota grup/scanner penuh','Periksa batas dan pemakaian acara. Cabut scanner yang tidak digunakan. Extra Quota belum tersedia; tidak ada penambahan otomatis.'],
  ['QR lama ditolak','Gunakan QR undangan terbaru; rotasi membatalkan token lama. Pastikan petugas membuka acara yang tepat.'],
  ['Internet terputus atau hasil transaksi tidak jelas','Hentikan konfirmasi baru sementara, periksa koneksi dan riwayat. Gunakan SOP manual yang disepakati Supervisor lalu rekonsiliasi; aplikasi tidak mencatat check-in offline otomatis.'],
];

export default function PrintableOperationalHandbookPage() {
  return <main className="min-h-screen bg-ivory px-4 py-8 text-base leading-relaxed sm:px-8"><div className="mx-auto max-w-5xl space-y-8">
    <div className="no-print flex flex-wrap items-center justify-between gap-4"><Link className="underline text-navy" href="/">Kembali ke beranda</Link><PrintHandbookButton/></div>
    <header className="rounded-card bg-navy p-6 text-ivory sm:p-9"><p className="text-sm text-gold-light">Panduan penggunaan · 26 November 2026</p><h1 className="mt-2 font-serif text-3xl font-bold sm:text-4xl">{BRAND_NAME}</h1><p className="mt-4">Ikuti urutan dari masuk Google sampai laporan. Periksa hasil setiap langkah; gunakan checklist dan bantuan di bawah saat mencoba.</p><Link href="/auth/login" className="no-print mt-5 inline-block rounded-button bg-gold px-5 py-3 font-semibold text-navy">Mulai dari Masuk Google</Link></header>
    <nav aria-label="Daftar isi" className="no-print grid gap-2 sm:grid-cols-2">{chapters.map(chapter=><a key={chapter.id} className="rounded border bg-surface p-3 text-navy" href={`#${chapter.id}`}>{chapter.title}</a>)}<a className="rounded border bg-surface p-3 text-navy" href="#uji-coba">Checklist uji coba</a><a className="rounded border bg-surface p-3 text-navy" href="#bantuan">Masalah dan penyelesaian</a></nav>
    {chapters.map(chapter=><section id={chapter.id} key={chapter.id} className="scroll-mt-6 rounded-card border bg-surface p-5 sm:p-8"><h2 className="font-serif text-2xl font-bold text-navy">{chapter.title}</h2><p className="mt-3 text-ink/80">{chapter.intro}</p><ol className="mt-5 list-decimal space-y-4 pl-6">{chapter.steps.map(step=><li key={step} className="pl-1">{step}</li>)}</ol>
      {chapter.id==='impor'&&<div className="mt-6 overflow-x-auto"><table className="w-full text-left text-sm"><caption className="mb-3 text-left font-semibold">Tujuh kolom template impor</caption><thead><tr className="border-b"><th className="p-3">Kolom</th><th className="p-3">Cara mengisi</th></tr></thead><tbody>{importFields.map(([name,help])=><tr key={name} className="border-b"><th scope="row" className="p-3 font-semibold">{name}</th><td className="p-3">{help}</td></tr>)}</tbody></table></div>}
      {chapter.id==='penyimpanan'&&<p className="mt-4 text-sm">Sumber penyedia: <a className="underline" href="https://vercel.com/legal/terms" rel="noreferrer">ketentuan Vercel</a>, <a className="underline" href="https://one.google.com/about/plans" rel="noreferrer">kuota Google</a>, <a className="underline" href="https://developers.google.com/apps-script/guides/services/quotas" rel="noreferrer">batas Apps Script</a>.</p>}
      <p className="mt-6 rounded-button border border-success/30 bg-success/5 p-4"><strong>Hasil yang diperiksa:</strong> {chapter.expected}</p>
    </section>)}
    <section id="uji-coba" className="rounded-card border border-gold bg-surface p-5 sm:p-8"><h2 className="font-serif text-2xl font-bold text-navy">Checklist uji coba</h2><p className="mt-3">Pakai data milik tim yang memang diizinkan untuk pengujian. Aplikasi tidak mengisi contoh otomatis. Labeli acara sebagai uji coba agar tidak tertukar dengan operasional.</p><ol className="mt-5 list-decimal space-y-3 pl-6">
      <li>Masuk Google, buat workspace dan acara. Periksa judul, tanggal, zona waktu dan angka awal nol.</li>
      <li>Tambahkan satu grup tim uji berkapasitas dua. Periksa satu grup, kapasitas dua dan hadir nol.</li>
      <li>Buka undangan dari browser lain, isi RSVP dua orang dan pastikan hadir tetap nol.</li>
      <li>Catat kedatangan satu orang: hadir satu, sisa satu. Catat orang kedua pada transaksi baru. Penambahan berikutnya harus ditolak karena kapasitas penuh.</li>
      <li>Jika berizin Supervisor, lakukan koreksi beralasan dan periksa jumlah akhir serta riwayat.</li>
      <li>Unduh CSV Free dan cocokkan angka. Pada Pro/Pro Plus, uji impor dan laporan detail; pada Pro Plus, uji notifikasi Usher.</li>
      <li>Pada paket pendukung TV, hubungkan operator, izinkan tampil untuk grup uji dan periksa nama tanpa izin tidak muncul.</li>
      <li>Keluar lalu masuk lagi; pastikan data tetap ada. Coba akun tanpa keanggotaan; acara privat harus ditolak.</li>
      <li>Cabut sesi/peran uji yang tidak dibutuhkan. Jika sudah ada check-in, pertahankan riwayat dan gunakan koreksi beralasan; jangan mereset ledger produksi.</li>
    </ol></section>
    <section id="bantuan" className="rounded-card border bg-surface p-5 sm:p-8"><h2 className="font-serif text-2xl font-bold text-navy">Masalah dan penyelesaian</h2><div className="mt-5 space-y-4">{troubleshooting.map(([title,answer])=><details key={title} className="rounded-button border p-4" open><summary className="cursor-pointer font-semibold text-navy">{title}</summary><p className="mt-3">{answer}</p></details>)}</div><p className="mt-6">Saat meminta bantuan, siapkan email akun, nama acara, waktu kejadian dan pesan kesalahan. Gunakan kanal pribadi pengelola. Jangan mengirim kata sandi, cookie, kode login atau daftar tamu lengkap ke kanal umum.</p></section>
  </div></main>;
}
