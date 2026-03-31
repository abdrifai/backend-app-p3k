import Joi from 'joi';

export class P3kCsvImportValidation {
  static uploadCsv = (req, res, next) => {
    const schema = Joi.object({
      file: Joi.object({
        mimetype: Joi.string().valid('text/csv', 'application/vnd.ms-excel', 'text/x-csv', 'application/csv').required(),
        originalname: Joi.string().regex(/\.csv$/i).required()
      }).required().unknown(true)
    });

    const { error } = schema.validate({ file: req.file });

    if (error) {
      const err = new Error("File CSV tidak valid atau tidak ditemukan. Harap unggah file .csv.");
      err.statusCode = 400;
      return next(err);
    }

    next();
  };
}
