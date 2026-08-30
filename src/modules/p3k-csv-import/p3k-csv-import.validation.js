import Joi from 'joi';

export class P3kCsvImportValidation {
  static uploadCsv = (req, res, next) => {
    if (!req.file) {
      const err = new Error("File CSV tidak ditemukan. Harap unggah file .csv.");
      err.statusCode = 400;
      return next(err);
    }

    const originalname = req.file.originalname || '';
    if (!originalname.toLowerCase().endsWith('.csv')) {
      const err = new Error("Format file harus berupa .csv");
      err.statusCode = 400;
      return next(err);
    }

    next();
  };
}
