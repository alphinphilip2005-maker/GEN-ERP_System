const Joi = require('joi');

module.exports = (req, res, next) => {
  const schema = Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    employee_id: Joi.string().required(),
    designation: Joi.string().allow('', null),
    department: Joi.string().allow('', null),
    phone: Joi.string().allow('', null),
    rights: Joi.array().items(
      Joi.object({
        module_id: Joi.number().required(),
        can_view: Joi.boolean().default(false),
        can_edit: Joi.boolean().default(false),
        can_delete: Joi.boolean().default(false),
        can_approve: Joi.boolean().default(false),
        can_create: Joi.boolean().default(false)
      })
    ).optional()
  }).unknown(true);

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(422).json({ message: error.details[0].message });
  }
  next();
};
