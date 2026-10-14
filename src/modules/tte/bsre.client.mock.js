import fs from 'fs';
import path from 'path';
import tteStampService from './tte-stamp.service.js';
import { PDFDocument, rgb } from 'pdf-lib';

export const bsreMockClient = {
  async cekStatusUser(nik) {
    if (!nik || nik.length < 10) {
      throw new Error('Format NIK tidak valid');
    }
    if (nik === '0000000000000000') {
      return {
        status: 'TIDAK_AKTIF',
        keterangan: 'Sertifikat elektronik BSrE belum diterbitkan atau telah kadaluarsa',
        issuer: null
      };
    }
    return {
      status: 'AKTIF',
      nik,
      namaSubjek: 'Pemilik Sertifikat BSrE BSSN',
      issuer: 'Balai Sertifikasi Elektronik - Badan Siber dan Sandi Negara',
      expiredAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
    };
  },

  async signPdf({ nik, passphrase, draftPdfUrl, jenis, tampilan, usulan }) {
    if (!passphrase) {
      throw new Error('Passphrase sertifikat BSrE wajib diisi');
    }
    if (passphrase === 'wrong' || passphrase === 'salah') {
      const err = new Error('Passphrase sertifikat elektronik BSrE tidak cocok / salah');
      err.status = 400;
      throw err;
    }

    const dir = path.join(process.cwd(), 'uploads', 'tte-signed');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const filename = `signed_${jenis.toLowerCase()}_${Date.now()}_${Math.round(Math.random() * 1e6)}.pdf`;
    const targetPath = path.join(dir, filename);

    // Salin dan stempel PDF riil jika berkas draft tersedia
    let stampedSuccessfully = false;
    if (draftPdfUrl && usulan) {
      try {
        const cleanPath = draftPdfUrl.replace(/^\//, '');
        const resolvedInput = path.resolve(cleanPath);
        if (fs.existsSync(resolvedInput)) {
          await tteStampService.stampContractPdf({
            inputPdf: resolvedInput,
            outputPdfPath: targetPath,
            usulan
          });
          stampedSuccessfully = true;
        }
      } catch (stampErr) {
        console.warn('Gagal menstempel PDF saat signing mock:', stampErr.message);
      }
    }

    // Fallback PDF jika input belum tersedia
    if (!stampedSuccessfully) {
      const dummyDoc = await PDFDocument.create();
      const page = dummyDoc.addPage([612, 936]);
      page.drawText(`DOKUMEN TTE RESMI BSrE BSSN - ${jenis}`, { x: 50, y: 880, size: 12 });
      page.drawText(`NIK Penandatangan: ${nik}`, { x: 50, y: 860, size: 10 });
      page.drawText(`Waktu Penandatanganan: ${new Date().toLocaleString('id-ID')}`, { x: 50, y: 840, size: 10 });
      const dummyBytes = await dummyDoc.save();
      fs.writeFileSync(targetPath, dummyBytes);
    }

    const signedUrl = `/uploads/tte-signed/${filename}`;
    const idDokumenBsre = `BSRE-ID-${Date.now()}-${Math.round(Math.random() * 1e5)}`;

    return {
      success: true,
      idDokumenBsre,
      signedFileUrl: signedUrl,
      timestamp: new Date().toISOString(),
      signerNik: nik,
      jenisTandaTangan: jenis
    };
  },

  async verifyPdf(fileUrl) {
    return {
      isValid: true,
      dokumenUtuh: true,
      status: 'VALID',
      keterangan: 'Dokumen terverifikasi sah ditandatangani secara elektronik melalui BSrE BSSN',
      daftarPenandatangan: [
        {
          subjek: 'Balai Sertifikasi Elektronik (BSrE)',
          waktuPenandatanganan: new Date().toISOString()
        }
      ]
    };
  }
};
