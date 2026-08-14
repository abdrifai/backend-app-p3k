import Joi from 'joi';

export const updateRolePermissionsSchema = Joi.object({
  role: Joi.string().required().trim().messages({
    'string.empty': 'Role tidak boleh kosong',
    'any.required': 'Role wajib disertakan'
  }),
  permissions: Joi.array().items(
    Joi.object({
      menuKey: Joi.string().required().trim(),
      isAllowed: Joi.boolean().required()
    })
  ).min(1).required().messages({
    'array.min': 'Daftar permissions tidak boleh kosong',
    'any.required': 'Daftar permissions wajib disertakan'
  })
});
