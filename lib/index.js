const Joi = require('joi');
const S = require('string');
const sanitizeHtml = require('sanitize-html');

const displayString = function(string) {
  return S(string).stripTags().decodeHTMLEntities().s
};

const getErrorMessage = function(errors) {
  const firstError = errors.details.pop().message;
  return firstError.replace('"value" ', '');
};

module.exports = {
  name: 'htmlInput',
  base: Joi.string(),
  language: {
    displayLength: '{{error}}',
    displayMin: '{{error}}',
    displayMax: '{{error}}'
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
      },
      validate(params, value, state, options) {
        return sanitizeHtml(value, params.format);
      }
    },
    {
      name: 'displayLength',
      params: {
        expectedLength: Joi.number().positive().required(),
        encoding: Joi.string().only('utf8')
      },
      validate(params, value, state, options) {
        const decodedString = displayString(value);
        const result = Joi.validate(decodedString, Joi.string().length(params.expectedLength, params.encoding));
        if(result.error) {
          return this.createError('htmlInput.displayLength', { error: getErrorMessage(result.error) }, state, options);
        }
        return value;
      }
    },
    {
      name: 'displayMin',
      params: {
        minLength: Joi.number().positive().required(),
        encoding: Joi.string().only('utf8')
      },
      validate(params, value, state, options) {
        const decodedString = displayString(value);
        const result = Joi.validate(decodedString, Joi.string().min(params.minLength, params.encoding));
        if(result.error) {
          return this.createError('htmlInput.displayMax', { error: getErrorMessage(result.error) }, state, options);
        }
        return value;
      }
    },
    {
      name: 'displayMax',
      params: {
        maxLength: Joi.number().positive().required(),
        encoding: Joi.string().only('utf8')
      },
      validate(params, value, state, options) {
        const decodedString = displayString(value);
        const result = Joi.validate(decodedString, Joi.string().max(params.maxLength, params.encoding));
        if(result.error) {
          return this.createError('htmlInput.displayMax', { error: getErrorMessage(result.error) }, state, options);
        }
        return value;
      }
    }
  ]
};
