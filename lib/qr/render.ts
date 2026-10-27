import QRCode from 'qrcode';

/**
 * Menghasilkan SVG string matriks QR Code 2D standar ISO/IEC 18004 yang nyata
 * dan dapat langsung dipindai oleh kamera HP maupun barcode scanner 2D.
 */
export async function generateQrCodeSvg(payload: string): Promise<string> {
  const cleanPayload = payload.trim() || 'SANSTECH-QR';
  return QRCode.toString(cleanPayload, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 240,
    color: {
      dark: '#15263F', // Royal Navy
      light: '#FFFFFF', // Pure White untuk kontras kamera maksimal
    },
  });
}

/**
 * Menghasilkan Data URL PNG untuk diunduh atau dicetak pada kartu fisik.
 */
export async function generateQrCodeDataUrl(payload: string): Promise<string> {
  const cleanPayload = payload.trim() || 'SANSTECH-QR';
  return QRCode.toDataURL(cleanPayload, {
    errorCorrectionLevel: 'H',
    margin: 2,
    width: 480,
    color: {
      dark: '#15263F',
      light: '#FFFFFF',
    },
  });
}

