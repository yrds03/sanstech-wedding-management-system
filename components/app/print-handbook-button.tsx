'use client';

export function PrintHandbookButton() {
  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== 'undefined') {
          window.print();
        }
      }}
      className="min-h-[44px] inline-flex items-center justify-center rounded-button bg-navy border border-gold/50 px-5 py-2 text-xs font-bold uppercase tracking-widest text-gold-light shadow hover:bg-navy-light transition"
    >
      🖨️ Cetak Buku Pedoman / Simpan PDF (A4)
    </button>
  );
}

