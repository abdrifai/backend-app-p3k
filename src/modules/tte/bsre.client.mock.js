import fs from 'fs';
import path from 'path';

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

  async signPdf({ nik, passphrase, draftPdfUrl, jenis, tampilan }) {
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

    // Buat file dummy signed pdf bila belum ada
    fs.writeFileSync(targetPath, `%PDF-1.4\n%Mock BSrE Signed PDF\n%NIK: ${nik}\n%Jenis: ${jenis}\n%Timestamp: ${new Date().toISOString()}\n%%EOF`);

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
