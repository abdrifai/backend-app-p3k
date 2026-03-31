import Joi from 'joi';

export const autoAssignSchema = Joi.object({
  userIds: Joi.array().items(Joi.string().uuid()).min(1).required(),
  amountPerUser: Joi.number().integer().min(1).required(),
  tmtFilters: Joi.array().items(Joi.string()).optional()
});

export const manualAssignSchema = Joi.object({
  assignments: Joi.array().items(
    Joi.object({
      userId: Joi.string().uuid().required(),
      amount: Joi.number().integer().min(1).required()
    })
  ).min(1).required(),
  tmtFilters: Joi.array().items(Joi.string()).optional()
});

export const completeTaskSchema = Joi.object({}).unknown(true);
