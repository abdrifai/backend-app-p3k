import Joi from 'joi';

export const autoAssignSchema = Joi.object({
  userIds: Joi.array().items(Joi.string().uuid()).min(1).required(),
  amountPerUser: Joi.number().integer().min(1).required()
});

export const manualAssignSchema = Joi.object({
  assignments: Joi.array().items(
    Joi.object({
      userId: Joi.string().uuid().required(),
      amount: Joi.number().integer().min(1).required()
    })
  ).min(1).required()
});

export const completeTaskSchema = Joi.object({
  // Only validating fields that exist in DataP3k that are expected to be updated
  nama: Joi.string().allow('', null),
  nik: Joi.string().allow('', null),
  nomorHp: Joi.string().allow('', null),
  email: Joi.string().email().allow('', null),
  alamat: Joi.string().allow('', null),
  unorIndukId: Joi.string().uuid().allow('', null),
  // Additional fields can be added depending on what users are allowed to edit
}).unknown(true); // Allow other fields to pass through, handled by service
