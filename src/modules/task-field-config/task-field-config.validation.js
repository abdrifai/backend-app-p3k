import Joi from 'joi';

export const batchUpdateSchema = Joi.object({
  configs: Joi.array()
    .items(
      Joi.object({
        id: Joi.string().uuid().required(),
        isActive: Joi.boolean().required(),
        sortOrder: Joi.number().integer().min(0).required(),
        label: Joi.string().max(150).required(),
        inputType: Joi.string().valid('text', 'date', 'search', 'select').required(),
        groupName: Joi.string().max(50).allow('', null),
      })
    )
    .min(1)
    .required(),
});
