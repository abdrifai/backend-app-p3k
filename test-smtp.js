import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

console.log('--- TESTING SMTP CONFIGURATION ---');
console.log('Host    :', process.env.SMTP_HOST || 'smtp.gmail.com');
console.log('Port    :', process.env.SMTP_PORT || '465');
console.log('User    :', process.env.SMTP_USER ? process.env.SMTP_USER : '(Belum diatur)');
console.log('Pass    :', process.env.SMTP_PASS ? '****** (Panjang: ' + process.env.SMTP_PASS.replace(/\s+/g, '').length + ' karakter)' : '(Belum diatur)');

const port = parseInt(process.env.SMTP_PORT || '465');
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: port,
  secure: port === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS ? String(process.env.SMTP_PASS).replace(/\s+/g, '') : '',
  },
  family: 4,               // Paksa IPv4
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000,
});

async function testConnection() {
  try {
    console.log('\nMenghubungi SMTP server...');
    const verifyResult = await transporter.verify();
    console.log('✅ BERHASIL! Transporter SMTP terhubung dan autentikasi berhasil.');
  } catch (error) {
    console.error('❌ GAGAL menghubungkan SMTP:');
    console.error('Kode Error :', error.code);
    console.error('Pesan Error:', error.message);
  }
}

testConnection();

