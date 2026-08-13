import Joi from 'joi';

export const createUserSchema = Joi.object({
  username: Joi.string().min(3).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  namaLengkap: Joi.string().max(150).allow('', null).default(''),
  role: Joi.string().valid('admin', 'user', 'pensiun', 'operator_pensiun').default('user')
});

export const loginUserSchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required()
});

export const updateUserSchema = Joi.object({
  namaLengkap: Joi.string().max(100).allow('', null),
  email: Joi.string().email().allow('', null),
  password: Joi.string().min(6).allow('', null),
  role: Joi.string().valid('admin', 'user', 'pensiun', 'operator_pensiun').allow('', null)
});

export const updateProfileSchema = Joi.object({
  namaLengkap: Joi.string().max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).allow('', null)
});

export const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required()
});

export const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  password: Joi.string().min(6).required()
});
