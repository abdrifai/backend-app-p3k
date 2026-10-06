import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create a transporter using environment variables or a default simple configuration
// For development, we can test using Ethereal email or just log to console
const port = parseInt(process.env.SMTP_PORT || '587');
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: port,
  secure: port === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS ? String(process.env.SMTP_PASS).replace(/\s+/g, '') : '',
  },
});

export const sendPasswordResetEmail = async (toEmail, resetUrl) => {
  const mailOptions = {
    from: process.env.SMTP_FROM || '"SIPPPK BKPSDM" <noreply@sipppk.tojouanuna.go.id>',
    to: toEmail,
    subject: 'Request Reset Password - Aplikasi SIPPPK',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="color: #333; text-align: center;">Reset Password</h2>
        <p style="color: #555; line-height: 1.5;">Halo,</p>
        <p style="color: #555; line-height: 1.5;">Kami menerima permintaan untuk mereset password akun Anda di Aplikasi SIPPPK.</p>
        <p style="color: #555; line-height: 1.5;">Silakan klik tombol di bawah ini untuk mengatur ulang password Anda. Tautan ini hanya berlaku selama 1 jam.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Atur Ulang Password</a>
        </div>
        <p style="color: #555; line-height: 1.5;">Jika Anda merasa tidak melakukan permintaan ini, silakan abaikan email ini dan akun Anda akan tetap aman.</p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />
        <p style="color: #888; font-size: 12px; text-align: center;">Tim Administrator SIPPPK</p>
      </div>
    `,
  };

  try {
    if (process.env.NODE_ENV === 'test' || !process.env.SMTP_USER) {
      console.log('================ EMAIL PREVIEW (TEST) ================');
      console.log(`To: ${toEmail}`);
      console.log(`Reset URL: ${resetUrl}`);
      console.log('======================================================');
      return { success: true, message: 'Simulated email sent locally in test mode' };
    }

    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent: %s', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending reset email via SMTP:', error.message);
    const err = new Error('Gagal mengirimkan email reset password. Periksa koneksi/server email.');
    err.statusCode = 502;
    throw err;
  }
};

export const sendOtpActivationEmail = async (toEmail, otpCode, namaPegawai = 'Pegawai') => {
  const mailOptions = {
    from: process.env.SMTP_FROM || '"SIPPPK BKPSDM" <noreply@sipppk.tojouanuna.go.id>',
    to: toEmail,
    subject: 'Kode OTP Aktivasi Akun Portal Pegawai SIPPPK',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #1e293b; margin-bottom: 4px;">Aktivasi Akun Pegawai</h2>
          <p style="color: #64748b; font-size: 14px; margin-top: 0;">Sistem Informasi Pegawai P3K BKPSDM</p>
        </div>
        <p style="color: #334155; line-height: 1.6;">Halo, <strong>${namaPegawai}</strong>,</p>
        <p style="color: #334155; line-height: 1.6;">Gunakan kode OTP berikut untuk menyelesaikan proses aktivasi akun Portal Pegawai SIPPPK Anda:</p>
        <div style="text-align: center; margin: 28px 0;">
          <div style="display: inline-block; background-color: #f1f5f9; border: 2px dashed #0284c7; border-radius: 10px; padding: 14px 32px;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #0369a1; font-family: monospace;">${otpCode}</span>
          </div>
        </div>
        <p style="color: #e11d48; font-size: 13px; font-weight: 600; text-align: center;">Kode OTP ini berlaku selama 10 menit. Jangan bagikan kode ini kepada siapapun.</p>
        <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin-top: 24px;">Jika Anda tidak merasa melakukan pendaftaran atau aktivasi akun ini, abaikan email ini.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0 16px 0;" />
        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">BKPSDM Kabupaten Tojo Una-Una — SIPPPK</p>
      </div>
    `,
  };

  try {
    if (process.env.NODE_ENV === 'test' || !process.env.SMTP_USER) {
      console.log('================ OTP ACTIVATION EMAIL (TEST) ================');
      console.log(`To: ${toEmail}`);
      console.log(`Nama: ${namaPegawai}`);
      console.log(`Kode OTP: ${otpCode}`);
      console.log('=============================================================');
      return { success: true, message: 'Simulated OTP email logged locally in test mode' };
    }

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending OTP email via SMTP:', error.message);
    const err = new Error('Gagal mengirimkan email kode OTP aktivasi. Periksa koneksi/kredensial server email SMTP.');
    err.statusCode = 502;
    throw err;
  }
};
