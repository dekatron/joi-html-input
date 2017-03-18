const Joi = require('joi');
const S = require('string');
const sanitizeHtml = require('sanitize-html');

const displayString = function(string) {
  return S(string).stripTags().decodeHTMLEntities().s
}

module.exports = {
  name: 'htmlInput',
  base: Joi.string(),
  language: {
    displayLength: 'Must be exactly {{expected}} characters long but it was actually {{actual}} characters long',
    displayMin: 'Must be a minimum of {{expected}} characters long but it was actually {{actual}} characters long',
    displayMax: 'Must be a maximum of {{expected}} characters long but it was actually {{actual}} characters long'
  },
  rules: [
    {
      name: 'allowedTags',
      params: {
        format: Joi
          .object()
          .keys({
            allowedTags: Joi
              .array()
              .items(Joi.string()),
            allowedAttributes: Joi
              .object()
          })
          .required()
      },
      validate(params, value, state, options) {
        return sanitizeHtml(value, params.format);
      }
    },
    {
      name: 'displayLength',
      params: {
        format: Joi.number().positive().required()
      },
      validate(params, value, state, options) {
        const decodedString = displayString(value);
        if(decodedString.length !== params.format) {
          const errorParams = {
            actual: decodedString.length,
            expected: params.format
          }
          return this.createError('htmlInput.displayLength', errorParams, state, options);
        }
        return value;
      }
    },
    {
      name: 'displayMin',
      params: {
        format: Joi.number().positive().required()
      },
      validate(params, value, state, options) {
        const decodedString = displayString(value);
        if(decodedString.length < params.format) {
          const errorParams = {
            actual: decodedString.length,
            expected: params.format
          }
          return this.createError('htmlInput.displayMin', errorParams, state, options);
        }
        return value;
      }
    },
    {
      name: 'displayMax',
      params: {
        format: Joi.number().positive().required()
      },
      validate(params, value, state, options) {
        const decodedString = displayString(value);
        if(decodedString.length > params.format) {
          const errorParams = {
            actual: decodedString.length,
            expected: params.format
          }
          return this.createError('htmlInput.displayMax', errorParams, state, options);
        }
        return value;
      }
    }
  ]
};
