import Joi from 'joi';

export const createUserSchema = Joi.object({
  username: Joi.string().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  namaLengkap: Joi.string().max(100).required(),
  role: Joi.string().valid('admin', 'user').default('user')
});

export const loginUserSchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required()
});

export const updateUserSchema = Joi.object({
  namaLengkap: Joi.string().max(100).allow('', null),
  email: Joi.string().email().allow('', null),
  password: Joi.string().min(6).allow('', null),
  role: Joi.string().valid('admin', 'user').allow('', null)
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
