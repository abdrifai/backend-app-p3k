import { bsreMockClient } from './bsre.client.mock.js';

class BsreClientAdapter {
  constructor() {
    this.mode = process.env.BSRE_MODE || 'mock';
  }

  getClient() {
    if (this.mode === 'live') {
      // Implementasi live HTTP request ke gateway BSrE
      return {
        async cekStatusUser(nik) {
          throw new Error('BSrE Live Client belum dikonfigurasi gateway IP/PKS Pemda');
        },
        async signPdf(payload) {
          throw new Error('BSrE Live Client belum dikonfigurasi gateway IP/PKS Pemda');
        },
        async verifyPdf(fileUrl) {
          throw new Error('BSrE Live Client belum dikonfigurasi gateway IP/PKS Pemda');
        }
      };
    }
    return bsreMockClient;
  }

  async cekStatusUser(nik) {
    return this.getClient().cekStatusUser(nik);
  }

  async signPdf(payload) {
    return this.getClient().signPdf(payload);
  }

  async verifyPdf(fileUrl) {
    return this.getClient().verifyPdf(fileUrl);
  }
}

export const bsreClient = new BsreClientAdapter();
export default bsreClient;
