'use client';

export function PrintManualButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print min-h-[46px] inline-flex items-center justify-center rounded-button bg-gold px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-navy-dark shadow-md hover:bg-gold-light transition"
    >
      🖨️ Cetak Buku Pedoman / Simpan PDF (A4)
    </button>
  );
}

