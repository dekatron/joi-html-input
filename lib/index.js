const Joi = require('joi')
const htmlEntities = require('html-entities')
const sanitizeHtml = require('sanitize-html')

const displayString = function (string) {
  const sanitizeConfig = {
    allowedTags: [],
    allowedAttributes: {}
  }
  const htmlEntitiesConfig = {
    level: 'html5'
  }
  let cleanString = string
  cleanString = sanitizeHtml(cleanString, sanitizeConfig)
  cleanString = htmlEntities.decode(cleanString, htmlEntitiesConfig)
  return cleanString
}

module.exports = {
  type: 'htmlInput',
  base: Joi.string(),
  messages: {
    'htmlInput.displayLength': '{{#label}} length must be {{#expectedLength}} characters long',
    'htmlInput.displayMin': '{{#label}} length must be at least {{#minLength}} characters long',
    'htmlInput.displayMax': '{{#label}} length must be less than or equal to {{#maxLength}} characters long'
  },
  rules: {
    allowedTags: {
      method (options) {
        return this.$_addRule({ name: 'allowedTags', args: { options } })
      },
      args: [
        {
          name: 'options',
          assert: Joi
            .object()
            .keys({
              allowedTags: Joi
                .array()
                .items(Joi.string()),
              allowedAttributes: Joi
                .object()
            })
        }
      ],
      validate (value, helpers, args) {
        return sanitizeHtml(value, args.options)
      }
    },
    displayLength: {
      method (expectedLength, encoding) {
        return this.$_addRule({ name: 'displayLength', args: { expectedLength, encoding } })
      },
      args: [
        {
          name: 'expectedLength',
          assert: Joi.number().positive().required()
        },
        {
          name: 'encoding',
          assert: Joi.string().valid('utf8')
        }
      ],
      validate (value, helpers, args) {
        const decodedString = displayString(value)
        const joiSchema = Joi.string().length(args.expectedLength, args.encoding)
        const result = joiSchema.validate(decodedString)
        if (result.error) {
          return helpers.error('htmlInput.displayLength', { expectedLength: args.expectedLength })
        }
        return value
      }
    },
    displayMin: {
      method (minLength, encoding) {
        return this.$_addRule({ name: 'displayMin', args: { minLength, encoding } })
      },
      args: [
        {
          name: 'minLength',
          assert: Joi.number().positive().required()
        },
        {
          name: 'encoding',
          assert: Joi.string().valid('utf8')
        }
      ],
      validate (value, helpers, args) {
        const decodedString = displayString(value)
        const joiSchema = Joi.string().min(args.minLength, args.encoding)
        const result = joiSchema.validate(decodedString)
        if (result.error) {
          return helpers.error('htmlInput.displayMin', { minLength: args.minLength })
        }
        return value
      }
    },
    displayMax: {
      method (maxLength, encoding) {
        return this.$_addRule({ name: 'displayMax', args: { maxLength, encoding } })
      },
      args: [
        {
          name: 'maxLength',
          assert: Joi.number().positive().required()
        },
        {
          name: 'encoding',
          assert: Joi.string().valid('utf8')
        }
      ],
      validate (value, helpers, args) {
        const decodedString = displayString(value)
        const joiSchema = Joi.string().max(args.maxLength, args.encoding)
        const result = joiSchema.validate(decodedString)
        if (result.error) {
          return helpers.error('htmlInput.displayMax', { maxLength: args.maxLength })
        }
        return value
      }
    }
  }
}
