import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create a transporter using environment variables or a default simple configuration
// For development, we can test using Ethereal email or just log to console
const port = parseInt(process.env.SMTP_PORT || '587');
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: port,
  secure: port === 465, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendPasswordResetEmail = async (toEmail, resetUrl) => {
  const mailOptions = {
    from: process.env.SMTP_FROM || '"E-Kinerja P3K" <noreply@ekinerja.p3k.id>',
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
    // If SMTP_USER is not provided, we just log the URL to console for local testing
    if (!process.env.SMTP_USER) {
      console.log('================ EMAIL PREVIEW ================');
      console.log(`To: ${toEmail}`);
      console.log(`Subject: ${mailOptions.subject}`);
      console.log(`Reset URL: ${resetUrl}`);
      console.log('==============================================');
      return { success: true, message: 'Simulated email sent locally' };
    }

    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent: %s', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Gagal mengirim email reset password');
  }
};
