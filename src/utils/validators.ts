import Joi from 'joi';

export const validateUrl = (url: string): { valid: boolean, message: string } => {
  const schema = Joi.string()
    .pattern(/^https?:\/\/www\..+\..+/)
    .required();

  const { error } = schema.validate(url);

  if (error) {
    return { valid: false, message: 'Please provide a valid URL that starts with http or https: and includes www. in the domain.' };
  }

  return { valid: true, message: 'URL is valid' };
};
