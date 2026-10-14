import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import QRCode from 'qrcode';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import logger from '../../config/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Format tanggal dan waktu standar Indonesia (WIB)
 */
const formatWib = (dateValue) => {
  if (!dateValue) return '-';
  try {
    const d = new Date(dateValue);
    if (isNaN(d.getTime())) return String(dateValue);
    const dateStr = d.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    const timeStr = d.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    });
    return `${dateStr} ${timeStr} WIB`;
  } catch {
    return String(dateValue);
  }
};

/**
 * Sanitasi string agar aman digambar pada PDF WinAnsi / ASCII
 */
const sanitizePdfText = (str) => {
  if (!str) return '';
  return String(str)
    .replace(/[^\x20-\x7E]/g, '')
    .trim();
};

/**
 * Gambar logo Kabupaten di titik tengah QR Code secara presisi
 * Menggunakan errorCorrectionLevel 'H' sehingga 30% area tengah aman dipasangi logo
 */
const drawQrLogo = (page, logoImg, qrX, qrY, qrW, qrH, isSigned, scaleX, scaleY) => {
  if (!logoImg) return;
  const qrCenterX = qrX + qrW / 2;
  const qrCenterY = qrY + qrH / 2;

  // Ukuran logo proporsional (~25% QR Code) mempertahankan aspek rasio asli (883x1024)
  const logoH = 14 * scaleY;
  const logoW = logoH * (883 / 1024);

  const padW = logoW + 3 * scaleX;
  const padH = logoH + 3 * scaleY;
  const padX = qrCenterX - padW / 2;
  const padY = qrCenterY - padH / 2;

  // Kotak putih pelindung agar logo tidak bertabrakan dengan pola titik QR
  page.drawRectangle({
    x: padX,
    y: padY,
    width: padW,
    height: padH,
    color: rgb(1, 1, 1),
    borderColor: isSigned ? rgb(0.09, 0.64, 0.29) : rgb(0.8, 0.83, 0.88),
    borderWidth: 0.6
  });

  // Gambar logo Kabupaten di titik tengah
  page.drawImage(logoImg, {
    x: qrCenterX - logoW / 2,
    y: qrCenterY - logoH / 2,
    width: logoW,
    height: logoH
  });
};

export const tteStampService = {
  /**
   * Stempel Visual TTE & Paraf Koordinasi ke Halaman Terakhir Dokumen PDF
   * @param {Object} params
   * @param {string|Buffer} params.inputPdf - Path absolut/relatif file PDF atau Buffer PDF
   * @param {string} [params.outputPdfPath] - Path target simpan PDF hasil stempel (opsional)
   * @param {Object} params.usulan - Data usulan perpanjangan lengkap (termasuk dataP3k dan logTandaTangan)
   * @param {string} [params.baseUrl] - Base URL portal verifikasi (opsional)
   * @returns {Promise<{ pdfBuffer: Buffer, outputPath?: string }>}
   */
  async stampContractPdf({ inputPdf, outputPdfPath, usulan, baseUrl }) {
    try {
      // 1. Baca buffer PDF input
      let pdfBytes;
      if (Buffer.isBuffer(inputPdf)) {
        pdfBytes = inputPdf;
      } else if (typeof inputPdf === 'string' && fs.existsSync(inputPdf)) {
        pdfBytes = fs.readFileSync(inputPdf);
      } else {
        throw new Error(`File PDF sumber tidak valid atau tidak ditemukan: ${inputPdf}`);
      }

      const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
      const pageCount = pdfDoc.getPageCount();
      if (pageCount === 0) {
        throw new Error('Dokumen PDF tidak memiliki halaman.');
      }

      const lastPage = pdfDoc.getPage(pageCount - 1);
      const { width, height } = lastPage.getSize();

      // Skala responsif terhadap acuan Folio (612 x 936)
      const scaleX = width / 612;
      const scaleY = height / 936;

      const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      // 2. Evaluasi status log penandatanganan
      const logs = Array.isArray(usulan.logTandaTangan) ? usulan.logTandaTangan : [];

      const kabanLog = logs.find(
        (l) => l.tahap === 'PARAF_KABAN' && (l.status === 'SUKSES' || l.status === 'APPROVED')
      );
      const sekdaLog = logs.find(
        (l) => l.tahap === 'PARAF_SEKDA' && (l.status === 'SUKSES' || l.status === 'APPROVED')
      );
      const pegawaiLog = logs.find(
        (l) => l.tahap === 'TTE_PEGAWAI' && (l.status === 'SUKSES' || l.status === 'APPROVED')
      );
      const bupatiLog = logs.find(
        (l) => l.tahap === 'TTE_BUPATI' && (l.status === 'SUKSES' || l.status === 'APPROVED')
      );

      const statusTte = usulan.statusTte || '';

      const isKabanParaf = Boolean(
        kabanLog ||
        ['MENUNGGU_PARAF_SEKDA', 'MENUNGGU_TTE_PEGAWAI', 'MENUNGGU_TTE_BUPATI', 'TTE_SELESAI'].includes(statusTte)
      );

      const isSekdaParaf = Boolean(
        sekdaLog ||
        ['MENUNGGU_TTE_PEGAWAI', 'MENUNGGU_TTE_BUPATI', 'TTE_SELESAI'].includes(statusTte)
      );

      const isPegawaiSigned = Boolean(
        pegawaiLog ||
        ['MENUNGGU_TTE_BUPATI', 'TTE_SELESAI'].includes(statusTte)
      );

      const isBupatiSigned = Boolean(
        bupatiLog ||
        statusTte === 'TTE_SELESAI'
      );

      // Data Pegawai
      const pegawai = usulan.dataP3k || {};
      const namaPegawai = sanitizePdfText(pegawai.nama || 'Pegawai PPPK');
      const nipPegawai = sanitizePdfText(pegawai.nipBaru || '-');
      const tglPegawaiStr = formatWib(pegawaiLog?.createdAt || (isPegawaiSigned ? usulan.updatedAt : null));

      // Data Bupati
      const namaBupati = sanitizePdfText(bupatiLog?.user?.namaLengkap || 'Dr. H. Fulan, S.H., M.Si.');
      const tglBupatiStr = formatWib(bupatiLog?.createdAt || (isBupatiSigned ? usulan.updatedAt : null));

      // Data Paraf Kaban & Sekda
      const namaKaban = sanitizePdfText(kabanLog?.user?.namaLengkap || 'Kepala BKPSDM');
      const tglKabanStr = formatWib(kabanLog?.createdAt || null);

      const namaSekda = sanitizePdfText(sekdaLog?.user?.namaLengkap || 'Sekretaris Daerah');
      const tglSekdaStr = formatWib(sekdaLog?.createdAt || null);

      // 3. Buat URL Verifikasi
      const origin = baseUrl || process.env.APP_PUBLIC_URL || process.env.CORS_ORIGIN || 'http://localhost:5173';
      const cleanOrigin = origin.replace(/\/+$/, '');
      const verifyBupatiUrl = `${cleanOrigin}/portal/verifikasi/${usulan.id}?signer=bupati`;
      const verifyPegawaiUrl = `${cleanOrigin}/portal/verifikasi/${usulan.id}?signer=pegawai`;

      // 4. Generate QR Code Image Buffer (PNG, Level H)
      const bupatiQrBuf = await QRCode.toBuffer(verifyBupatiUrl, {
        type: 'png',
        errorCorrectionLevel: 'H',
        width: 140,
        margin: 1,
        color: {
          dark: isBupatiSigned ? '#15803d' : '#64748b',
          light: '#ffffff'
        }
      });

      const pegawaiQrBuf = await QRCode.toBuffer(verifyPegawaiUrl, {
        type: 'png',
        errorCorrectionLevel: 'H',
        width: 140,
        margin: 1,
        color: {
          dark: isPegawaiSigned ? '#15803d' : '#64748b',
          light: '#ffffff'
        }
      });

      const bupatiQrImg = await pdfDoc.embedPng(bupatiQrBuf);
      const pegawaiQrImg = await pdfDoc.embedPng(pegawaiQrBuf);

      // Load & Embed Logo Kabupaten Tojo Una-Una di tengah QR Code jika tersedia
      let logoTounaImg = null;
      try {
        const possibleLogoPaths = [
          path.resolve(__dirname, '../../assets/logo-touna.png'),
          path.resolve(process.cwd(), 'src/assets/logo-touna.png'),
          path.resolve(process.cwd(), '../frontend/static/logo-touna.png')
        ];
        const foundLogoPath = possibleLogoPaths.find((p) => fs.existsSync(p));
        if (foundLogoPath) {
          const logoBuffer = fs.readFileSync(foundLogoPath);
          logoTounaImg = await pdfDoc.embedPng(logoBuffer);
        }
      } catch (logoErr) {
        logger.warn(`Logo Kabupaten tidak dapat dimuat untuk QR Code: ${logoErr.message}`);
      }

      // ==========================================
      // A. KOTAK TTE PIHAK KESATU (Bupati - Kiri)
      // ==========================================
      const boxBupatiX = 75 * scaleX;
      const boxBupatiY = 148 * scaleY;
      const boxBupatiW = 200 * scaleX;
      const boxBupatiH = 62 * scaleY;

      if (!isBupatiSigned) {
        // TAMPILAN BELUM TTE (DRAFT)
        lastPage.drawRectangle({
          x: boxBupatiX,
          y: boxBupatiY,
          width: boxBupatiW,
          height: boxBupatiH,
          color: rgb(0.97, 0.98, 0.99),
          borderColor: rgb(0.8, 0.83, 0.88),
          borderWidth: 1,
          borderDashArray: [3, 2]
        });
        lastPage.drawImage(bupatiQrImg, {
          x: boxBupatiX + 4 * scaleX,
          y: boxBupatiY + 4 * scaleY,
          width: 54 * scaleX,
          height: 54 * scaleY
        });
        drawQrLogo(
          lastPage,
          logoTounaImg,
          boxBupatiX + 4 * scaleX,
          boxBupatiY + 4 * scaleY,
          54 * scaleX,
          54 * scaleY,
          false,
          scaleX,
          scaleY
        );
        lastPage.drawText('[ BELUM TTE ]', {
          x: boxBupatiX + 63 * scaleX,
          y: boxBupatiY + 47 * scaleY,
          size: 7 * Math.min(scaleX, scaleY),
          font: fontBold,
          color: rgb(0.85, 0.4, 0.1)
        });
        lastPage.drawText('BUPATI TOJO UNA-UNA', {
          x: boxBupatiX + 63 * scaleX,
          y: boxBupatiY + 35 * scaleY,
          size: 7.5 * Math.min(scaleX, scaleY),
          font: fontBold,
          color: rgb(0.2, 0.25, 0.3)
        });
        lastPage.drawText('Status: Menunggu TTE', {
          x: boxBupatiX + 63 * scaleX,
          y: boxBupatiY + 24 * scaleY,
          size: 6.5 * Math.min(scaleX, scaleY),
          font: fontRegular,
          color: rgb(0.4, 0.45, 0.5)
        });
        lastPage.drawText('Belum Sah Secara Hukum', {
          x: boxBupatiX + 63 * scaleX,
          y: boxBupatiY + 13 * scaleY,
          size: 6 * Math.min(scaleX, scaleY),
          font: fontRegular,
          color: rgb(0.6, 0.65, 0.7)
        });
      } else {
        // TAMPILAN SUDAH TTE (SAH)
        lastPage.drawRectangle({
          x: boxBupatiX,
          y: boxBupatiY,
          width: boxBupatiW,
          height: boxBupatiH,
          color: rgb(0.95, 0.99, 0.96),
          borderColor: rgb(0.09, 0.64, 0.29),
          borderWidth: 1.5
        });
        lastPage.drawImage(bupatiQrImg, {
          x: boxBupatiX + 4 * scaleX,
          y: boxBupatiY + 4 * scaleY,
          width: 54 * scaleX,
          height: 54 * scaleY
        });
        drawQrLogo(
          lastPage,
          logoTounaImg,
          boxBupatiX + 4 * scaleX,
          boxBupatiY + 4 * scaleY,
          54 * scaleX,
          54 * scaleY,
          true,
          scaleX,
          scaleY
        );
        lastPage.drawText('[ SUDAH TTE SAH ]', {
          x: boxBupatiX + 63 * scaleX,
          y: boxBupatiY + 47 * scaleY,
          size: 7 * Math.min(scaleX, scaleY),
          font: fontBold,
          color: rgb(0.09, 0.64, 0.29)
        });
        lastPage.drawText('BUPATI TOJO UNA-UNA', {
          x: boxBupatiX + 63 * scaleX,
          y: boxBupatiY + 35 * scaleY,
          size: 7.5 * Math.min(scaleX, scaleY),
          font: fontBold,
          color: rgb(0.1, 0.15, 0.2)
        });
        lastPage.drawText(namaBupati.substring(0, 24), {
          x: boxBupatiX + 63 * scaleX,
          y: boxBupatiY + 24 * scaleY,
          size: 6.5 * Math.min(scaleX, scaleY),
          font: fontRegular,
          color: rgb(0.2, 0.25, 0.3)
        });
        lastPage.drawText(tglBupatiStr !== '-' ? tglBupatiStr : 'Sertifikasi BSrE BSSN', {
          x: boxBupatiX + 63 * scaleX,
          y: boxBupatiY + 13 * scaleY,
          size: 6 * Math.min(scaleX, scaleY),
          font: fontRegular,
          color: rgb(0.1, 0.5, 0.2)
        });
      }

      // ==========================================
      // B. KOTAK TTE PIHAK KEDUA (Pegawai - Kanan)
      // ==========================================
      const boxPegawaiX = 335 * scaleX;
      const boxPegawaiY = 148 * scaleY;
      const boxPegawaiW = 200 * scaleX;
      const boxPegawaiH = 62 * scaleY;

      if (!isPegawaiSigned) {
        // TAMPILAN BELUM TTE (DRAFT)
        lastPage.drawRectangle({
          x: boxPegawaiX,
          y: boxPegawaiY,
          width: boxPegawaiW,
          height: boxPegawaiH,
          color: rgb(0.97, 0.98, 0.99),
          borderColor: rgb(0.8, 0.83, 0.88),
          borderWidth: 1,
          borderDashArray: [3, 2]
        });
        lastPage.drawImage(pegawaiQrImg, {
          x: boxPegawaiX + 4 * scaleX,
          y: boxPegawaiY + 4 * scaleY,
          width: 54 * scaleX,
          height: 54 * scaleY
        });
        drawQrLogo(
          lastPage,
          logoTounaImg,
          boxPegawaiX + 4 * scaleX,
          boxPegawaiY + 4 * scaleY,
          54 * scaleX,
          54 * scaleY,
          false,
          scaleX,
          scaleY
        );
        lastPage.drawText('[ BELUM TTE ]', {
          x: boxPegawaiX + 63 * scaleX,
          y: boxPegawaiY + 47 * scaleY,
          size: 7 * Math.min(scaleX, scaleY),
          font: fontBold,
          color: rgb(0.85, 0.4, 0.1)
        });
        lastPage.drawText('PIHAK KEDUA (PEGAWAI)', {
          x: boxPegawaiX + 63 * scaleX,
          y: boxPegawaiY + 35 * scaleY,
          size: 7.5 * Math.min(scaleX, scaleY),
          font: fontBold,
          color: rgb(0.2, 0.25, 0.3)
        });
        lastPage.drawText('Status: Menunggu TTE', {
          x: boxPegawaiX + 63 * scaleX,
          y: boxPegawaiY + 24 * scaleY,
          size: 6.5 * Math.min(scaleX, scaleY),
          font: fontRegular,
          color: rgb(0.4, 0.45, 0.5)
        });
        lastPage.drawText('Belum Sah Secara Hukum', {
          x: boxPegawaiX + 63 * scaleX,
          y: boxPegawaiY + 13 * scaleY,
          size: 6 * Math.min(scaleX, scaleY),
          font: fontRegular,
          color: rgb(0.6, 0.65, 0.7)
        });
      } else {
        // TAMPILAN SUDAH TTE (SAH)
        lastPage.drawRectangle({
          x: boxPegawaiX,
          y: boxPegawaiY,
          width: boxPegawaiW,
          height: boxPegawaiH,
          color: rgb(0.95, 0.99, 0.96),
          borderColor: rgb(0.09, 0.64, 0.29),
          borderWidth: 1.5
        });
        lastPage.drawImage(pegawaiQrImg, {
          x: boxPegawaiX + 4 * scaleX,
          y: boxPegawaiY + 4 * scaleY,
          width: 54 * scaleX,
          height: 54 * scaleY
        });
        drawQrLogo(
          lastPage,
          logoTounaImg,
          boxPegawaiX + 4 * scaleX,
          boxPegawaiY + 4 * scaleY,
          54 * scaleX,
          54 * scaleY,
          true,
          scaleX,
          scaleY
        );
        lastPage.drawText('[ SUDAH TTE SAH ]', {
          x: boxPegawaiX + 63 * scaleX,
          y: boxPegawaiY + 47 * scaleY,
          size: 7 * Math.min(scaleX, scaleY),
          font: fontBold,
          color: rgb(0.09, 0.64, 0.29)
        });
        lastPage.drawText(namaPegawai.substring(0, 24), {
          x: boxPegawaiX + 63 * scaleX,
          y: boxPegawaiY + 35 * scaleY,
          size: 7.5 * Math.min(scaleX, scaleY),
          font: fontBold,
          color: rgb(0.1, 0.15, 0.2)
        });
        lastPage.drawText(`NIP: ${nipPegawai}`, {
          x: boxPegawaiX + 63 * scaleX,
          y: boxPegawaiY + 24 * scaleY,
          size: 6.5 * Math.min(scaleX, scaleY),
          font: fontRegular,
          color: rgb(0.25, 0.3, 0.35)
        });
        lastPage.drawText(tglPegawaiStr !== '-' ? tglPegawaiStr : 'Sertifikasi Elektronik', {
          x: boxPegawaiX + 63 * scaleX,
          y: boxPegawaiY + 13 * scaleY,
          size: 6 * Math.min(scaleX, scaleY),
          font: fontRegular,
          color: rgb(0.1, 0.5, 0.2)
        });
      }

      // ==========================================
      // C. KOTAK CATATAN PARAF KOORDINASI (Bawah)
      // ==========================================
      const boxParafX = 75 * scaleX;
      const boxParafY = 65 * scaleY;
      const boxParafW = 460 * scaleX;
      const boxParafH = 52 * scaleY;

      lastPage.drawRectangle({
        x: boxParafX,
        y: boxParafY,
        width: boxParafW,
        height: boxParafH,
        color: rgb(0.98, 0.99, 1.0),
        borderColor: rgb(0.75, 0.8, 0.85),
        borderWidth: 0.8
      });

      lastPage.drawText('CATATAN PARAF KOORDINASI (TATA NASKAH DINAS ELEKTRONIK)', {
        x: boxParafX + 8 * scaleX,
        y: boxParafY + 38 * scaleY,
        size: 6.5 * Math.min(scaleX, scaleY),
        font: fontBold,
        color: rgb(0.2, 0.25, 0.3)
      });

      // Baris Paraf Kaban
      const kabanText = isKabanParaf
        ? `1. Kepala BKPSDM    : [ SUDAH PARAF ELEKTRONIK ] ${tglKabanStr !== '-' ? `- ${namaKaban} (${tglKabanStr})` : ''}`
        : '1. Kepala BKPSDM    : [ MENUNGGU PARAF ]';
      lastPage.drawText(kabanText.substring(0, 95), {
        x: boxParafX + 8 * scaleX,
        y: boxParafY + 25 * scaleY,
        size: 6.5 * Math.min(scaleX, scaleY),
        font: fontRegular,
        color: isKabanParaf ? rgb(0.09, 0.55, 0.25) : rgb(0.45, 0.5, 0.55)
      });

      // Baris Paraf Sekda
      const sekdaText = isSekdaParaf
        ? `2. Sekretaris Daerah: [ SUDAH PARAF ELEKTRONIK ] ${tglSekdaStr !== '-' ? `- ${namaSekda} (${tglSekdaStr})` : ''}`
        : '2. Sekretaris Daerah: [ MENUNGGU PARAF ]';
      lastPage.drawText(sekdaText.substring(0, 95), {
        x: boxParafX + 8 * scaleX,
        y: boxParafY + 12 * scaleY,
        size: 6.5 * Math.min(scaleX, scaleY),
        font: fontRegular,
        color: isSekdaParaf ? rgb(0.09, 0.55, 0.25) : rgb(0.45, 0.5, 0.55)
      });

      // Catatan Footer Penjelasan Verifikasi
      lastPage.drawText('* Keaslian dan keabsahan dokumen ini dapat diverifikasi dengan memindai QR Code di atas.', {
        x: boxParafX,
        y: boxParafY - 13 * scaleY,
        size: 5.5 * Math.min(scaleX, scaleY),
        font: fontRegular,
        color: rgb(0.5, 0.55, 0.6)
      });

      // 5. Simpan hasil PDF
      const finalPdfBytes = await pdfDoc.save();
      const finalBuffer = Buffer.from(finalPdfBytes);

      if (outputPdfPath) {
        const resolvedOut = path.resolve(outputPdfPath);
        const outDir = path.dirname(resolvedOut);
        if (!fs.existsSync(outDir)) {
          fs.mkdirSync(outDir, { recursive: true });
        }
        fs.writeFileSync(resolvedOut, finalBuffer);
        logger.info(`Stempel TTE & Paraf berhasil disematkan ke PDF: ${resolvedOut}`);
        return { pdfBuffer: finalBuffer, outputPath: resolvedOut };
      }

      return { pdfBuffer: finalBuffer };
    } catch (err) {
      logger.error(`Gagal menyematkan stempel TTE pada PDF: ${err.message}`);
      throw err;
    }
  }
};

export default tteStampService;
