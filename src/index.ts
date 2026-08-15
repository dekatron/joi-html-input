import { decode } from 'html-entities'
import sanitizeHtml from 'sanitize-html'

import type {
  CustomHelpers,
  Extension,
  ExtensionFactory,
  Root,
  StringSchema,
} from 'joi'

/** Options accepted by the `allowedTags` rule, passed straight through to `sanitize-html`. */
export type AllowedTagsOptions = sanitizeHtml.IOptions

/**
 * Encoding accepted by the display length rules. Matches the encoding argument
 * of Joi's own `string.length` / `string.min` / `string.max` rules, where
 * supplying `'utf8'` switches the comparison from characters to bytes.
 */
export type DisplayEncoding = 'utf8'

/** A `Joi.string()` schema extended with the html input rules. */
export interface HtmlInputSchema extends StringSchema {
  /**
   * Strips any tags and attributes that are not explicitly allowed. With no
   * options the `sanitize-html` defaults apply.
   */
  allowedTags(options?: AllowedTagsOptions): this

  /** Requires the rendered text — tags stripped, entities decoded — to be exactly `limit` long. */
  displayLength(limit: number, encoding?: DisplayEncoding): this

  /** Requires the rendered text — tags stripped, entities decoded — to be at least `limit` long. */
  displayMin(limit: number, encoding?: DisplayEncoding): this

  /** Requires the rendered text — tags stripped, entities decoded — to be at most `limit` long. */
  displayMax(limit: number, encoding?: DisplayEncoding): this
}

/** The Joi root returned by `Joi.extend(htmlInput)`. */
export interface HtmlInputRoot extends Root {
  htmlInput(): HtmlInputSchema
}

interface AllowedTagsArgs { options?: AllowedTagsOptions }
interface LengthArgs { expectedLength: number, encoding?: DisplayEncoding }
interface MinArgs { minLength: number, encoding?: DisplayEncoding }
interface MaxArgs { maxLength: number, encoding?: DisplayEncoding }

/** Strip every tag, then decode entities, to get the text a user actually sees. */
const displayString = (value: string): string => {
  const withoutTags = sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} })
  return decode(withoutTags, { level: 'html5' })
}

/**
 * Joi extension adding an `htmlInput` type for values that are allowed to
 * contain html.
 *
 * @example
 * ```ts
 * import BaseJoi from 'joi'
 * import { htmlInput, type HtmlInputRoot } from 'joi-html-input'
 *
 * const Joi = BaseJoi.extend(htmlInput) as HtmlInputRoot
 * const schema = Joi.htmlInput().allowedTags().displayMax(280)
 * ```
 */
export const htmlInput: ExtensionFactory = (joi: Root): Extension => ({
  type: 'htmlInput',
  base: joi.string(),
  messages: {
    'htmlInput.displayLength': '{{#label}} length must be {{#expectedLength}} characters long',
    'htmlInput.displayMin': '{{#label}} length must be at least {{#minLength}} characters long',
    'htmlInput.displayMax': '{{#label}} length must be less than or equal to {{#maxLength}} characters long',
  },
  rules: {
    allowedTags: {
      method (options?: AllowedTagsOptions) {
        return this.$_addRule({ name: 'allowedTags', args: { options } })
      },
      args: [
        {
          name: 'options',
          // The options object is handed straight to sanitize-html, so anything
          // it accepts has to be allowed through. The two most commonly used
          // keys are still shape-checked to catch typos early; sanitize-html
          // validates the rest itself.
          assert: joi
            .object()
            .keys({
              allowedTags: joi.alternatives().try(joi.array().items(joi.string()), joi.valid(false)),
              allowedAttributes: joi.alternatives().try(joi.object(), joi.valid(false)),
            })
            .unknown(true),
        },
      ],
      validate (value: string, _helpers: CustomHelpers, args: AllowedTagsArgs) {
        return sanitizeHtml(value, args.options)
      },
    },

    displayLength: {
      method (expectedLength: number, encoding?: DisplayEncoding) {
        return this.$_addRule({ name: 'displayLength', args: { expectedLength, encoding } })
      },
      args: [
        { name: 'expectedLength', assert: joi.number().positive().required() },
        { name: 'encoding', assert: joi.string().valid('utf8') },
      ],
      validate (value: string, helpers: CustomHelpers, args: LengthArgs) {
        const { error } = joi
          .string()
          .length(args.expectedLength, args.encoding)
          .validate(displayString(value))

        if (error) {
          return helpers.error('htmlInput.displayLength', { expectedLength: args.expectedLength })
        }
        return value
      },
    },

    displayMin: {
      method (minLength: number, encoding?: DisplayEncoding) {
        return this.$_addRule({ name: 'displayMin', args: { minLength, encoding } })
      },
      args: [
        { name: 'minLength', assert: joi.number().positive().required() },
        { name: 'encoding', assert: joi.string().valid('utf8') },
      ],
      validate (value: string, helpers: CustomHelpers, args: MinArgs) {
        const { error } = joi
          .string()
          .min(args.minLength, args.encoding)
          .validate(displayString(value))

        if (error) {
          return helpers.error('htmlInput.displayMin', { minLength: args.minLength })
        }
        return value
      },
    },

    displayMax: {
      method (maxLength: number, encoding?: DisplayEncoding) {
        return this.$_addRule({ name: 'displayMax', args: { maxLength, encoding } })
      },
      args: [
        { name: 'maxLength', assert: joi.number().positive().required() },
        { name: 'encoding', assert: joi.string().valid('utf8') },
      ],
      validate (value: string, helpers: CustomHelpers, args: MaxArgs) {
        const { error } = joi
          .string()
          .max(args.maxLength, args.encoding)
          .validate(displayString(value))

        if (error) {
          return helpers.error('htmlInput.displayMax', { maxLength: args.maxLength })
        }
        return value
      },
    },
  },
})

export default htmlInput
