import multer from 'multer';
import path from 'path';
import fs from 'fs';

const createStorage = (dir) => multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed!'), false);
  }
};

export const uploadPensionSk = multer({
  storage: createStorage('uploads/pension-sk'),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

export const uploadKontrakArsip = multer({
  storage: createStorage('uploads/kontrak-arsip'),
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

const docxFilter = (req, file, cb) => {
  const allowed = [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword'
  ];
  if (allowed.includes(file.mimetype) || file.originalname.endsWith('.docx')) {
    cb(null, true);
  } else {
    cb(new Error('Only Word (.docx) files are allowed!'), false);
  }
};

export const uploadTemplateKontrak = multer({
  storage: createStorage('uploads/template-kontrak'),
  fileFilter: docxFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

const imageFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

export const uploadUserPhoto = multer({
  storage: createStorage('uploads/user-photo'),
  fileFilter: imageFilter,
  limits: { fileSize: 2 * 1024 * 1024 } // 2MB limit
});

export const uploadUsulanFinal = multer({
  storage: createStorage('uploads/final-pk'),
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});
