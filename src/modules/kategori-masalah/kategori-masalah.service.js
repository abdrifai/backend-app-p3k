import { KategoriMasalahRepository } from './kategori-masalah.repository.js';

export class KategoriMasalahService {
  static async getAllKategori(queryParams) {
    const onlyActive = queryParams?.onlyActive === 'true' || queryParams?.active === 'true';
    return await KategoriMasalahRepository.findAll({ onlyActive });
  }

  static async getKategoriById(id) {
    const kategori = await KategoriMasalahRepository.findById(id);
    if (!kategori) {
      const err = new Error('Kategori masalah tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }
    return kategori;
  }

  static generateKodeFromName(nama) {
    if (!nama) return `KAT_${Date.now()}`;
    const clean = nama
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 40);
    return clean || `KAT_${Date.now()}`;
  }

  static async createKategori(data) {
    let kode = (data.kode && data.kode.trim())
      ? data.kode.trim().toUpperCase()
      : this.generateKodeFromName(data.nama);

    // Ensure uniqueness
    let finalKode = kode;
    let counter = 1;
    while (await KategoriMasalahRepository.findByKode(finalKode)) {
      finalKode = `${kode.slice(0, 35)}_${counter}`;
      counter++;
    }

    return await KategoriMasalahRepository.create({
      ...data,
      kode: finalKode
    });
  }

  static async updateKategori(id, data) {
    await this.getKategoriById(id);

    if (data.kode) {
      const existing = await KategoriMasalahRepository.findByKode(data.kode, id);
      if (existing) {
        const err = new Error(`Kategori dengan kode '${data.kode}' sudah digunakan`);
        err.statusCode = 400;
        throw err;
      }
    }

    return await KategoriMasalahRepository.update(id, data);
  }

  static async deleteKategori(id) {
    await this.getKategoriById(id);
    return await KategoriMasalahRepository.softDelete(id);
  }
}
