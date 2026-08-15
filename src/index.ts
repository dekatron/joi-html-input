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
 * of Joi's own `string.length` / `string.min` / `string.max` rules, which
 * accept anything `Buffer.isEncoding()` does. Supplying one switches the
 * comparison from characters to bytes in that encoding.
 *
 * Spelled out rather than aliased to Node's `BufferEncoding` so the published
 * declarations stay self contained. `test/index.spec.ts` asserts the two stay
 * in step.
 */
export type DisplayEncoding
  = 'ascii' | 'base64' | 'base64url' | 'binary' | 'hex' | 'latin1'
    | 'ucs-2' | 'ucs2' | 'utf-8' | 'utf-16le' | 'utf8' | 'utf16le'

/** A `Joi.string()` schema extended with the html input rules. */
export interface HtmlInputSchema extends StringSchema {
  /**
   * Strips any tags and attributes that are not explicitly allowed. With no
   * options the `sanitize-html` defaults apply.
   */
  allowedTags(options?: AllowedTagsOptions): this

  /**
   * Requires the rendered text — tags stripped, entities decoded — to be exactly `limit` long.
   *
   * Measures only. The value this returns is the original input, still
   * unsanitized; chain `allowedTags()` if you need a safe value out.
   */
  displayLength(limit: number, encoding?: DisplayEncoding): this

  /**
   * Requires the rendered text — tags stripped, entities decoded — to be at least `limit` long.
   *
   * Measures only. The value this returns is the original input, still
   * unsanitized; chain `allowedTags()` if you need a safe value out.
   */
  displayMin(limit: number, encoding?: DisplayEncoding): this

  /**
   * Requires the rendered text — tags stripped, entities decoded — to be at most `limit` long.
   *
   * Measures only. The value this returns is the original input, still
   * unsanitized; chain `allowedTags()` if you need a safe value out.
   */
  displayMax(limit: number, encoding?: DisplayEncoding): this
}

/** The Joi root returned by `Joi.extend(htmlInput)`. */
export interface HtmlInputRoot extends Root {
  htmlInput(): HtmlInputSchema
}

/**
 * Every option sanitize-html accepts. The `allowedTags` rule hands its options
 * object straight to sanitize-html, so all of these have to be allowed through
 * — but validating against the list still catches a misspelled key, which
 * would otherwise silently fall back to the defaults and drop whatever
 * restriction the caller meant to apply.
 *
 * Keep this in step with sanitize-html itself rather than with
 * `@types/sanitize-html`, which lags the runtime package. `test/index.spec.ts`
 * cross checks it against `sanitizeHtml.defaults`, which covers every option
 * that ships with a default; the rest are callbacks and have to be added by
 * hand when sanitize-html gains one.
 */
const SANITIZE_HTML_OPTION_KEYS = [
  'allowIframeRelativeUrls',
  'allowProtocolRelative',
  'allowVulnerableTags',
  'allowedAttributes',
  'allowedClasses',
  'allowedEmptyAttributes',
  'allowedIframeDomains',
  'allowedIframeHostnames',
  'allowedSchemes',
  'allowedSchemesAppliedToAttributes',
  'allowedSchemesByTag',
  'allowedScriptDomains',
  'allowedScriptHostnames',
  'allowedStyles',
  'allowedTags',
  'disallowedTagsMode',
  'enforceHtmlBoundary',
  'exclusiveFilter',
  'nestingLimit',
  'nonBooleanAttributes',
  'nonTextTags',
  'onCloseTag',
  'onOpenTag',
  'parseStyleAttributes',
  'parser',
  'preserveEscapedAttributes',
  'selfClosing',
  'textFilter',
  'transformTags',
] as const

interface AllowedTagsArgs { options?: AllowedTagsOptions }
interface LengthArgs { expectedLength: number, encoding?: DisplayEncoding }
interface MinArgs { minLength: number, encoding?: DisplayEncoding }
interface MaxArgs { maxLength: number, encoding?: DisplayEncoding }

/**
 * Assertion for the optional `encoding` argument of the display length rules.
 *
 * Joi's own length rules accept any encoding `Buffer.isEncoding()` accepts, so
 * defer to the same check rather than hardcoding a list that would drift as
 * Node gains encodings. Doing it here rather than letting Joi's internal assert
 * fire means a bad encoding is caught when the schema is built, not on the
 * first value that happens to be validated.
 */
const encodingArg = (joi: Root) =>
  joi.string().custom((value: string, helpers) => {
    if (!Buffer.isEncoding(value)) {
      return helpers.error('any.invalid')
    }
    return value
  })

/** Strip every tag, then decode entities, to get the text a user actually sees. */
const displayString = (value: string): string => {
  const withoutTags = sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} })
  return decode(withoutTags, { level: 'html5' })
}

/**
 * Length of the display text, in characters or in bytes of the given encoding.
 * The same measurement Joi's own length rules make.
 *
 * Measuring here rather than round tripping through `joi.string().length()`
 * keeps a limit of zero meaningful: `joi.string()` rejects the empty string
 * before any limit is considered, so markup with no text in it — `<p></p>`,
 * what an empty editor submits — could never satisfy a rule however the limit
 * was set.
 */
const measure = (text: string, encoding?: DisplayEncoding): number =>
  encoding ? Buffer.byteLength(text, encoding) : text.length

/** Limit argument shared by all three display rules. */
const limitArg = (joi: Root) => joi.number().integer().min(0).required()

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
          // Every sanitize-html option is allowed through, but an unrecognised
          // key is rejected rather than ignored: a misspelled option would
          // otherwise fail open, silently reverting to the defaults and
          // dropping the restriction the caller intended.
          assert: joi
            .object()
            .keys({
              allowedTags: joi.alternatives().try(joi.array().items(joi.string()), joi.valid(false)),
              allowedAttributes: joi.alternatives().try(joi.object(), joi.valid(false)),
            })
            .pattern(joi.string().valid(...SANITIZE_HTML_OPTION_KEYS), joi.any()),
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
        { name: 'expectedLength', assert: limitArg(joi) },
        { name: 'encoding', assert: encodingArg(joi) },
      ],
      validate (value: string, helpers: CustomHelpers, args: LengthArgs) {
        if (measure(displayString(value), args.encoding) !== args.expectedLength) {
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
        { name: 'minLength', assert: limitArg(joi) },
        { name: 'encoding', assert: encodingArg(joi) },
      ],
      validate (value: string, helpers: CustomHelpers, args: MinArgs) {
        if (measure(displayString(value), args.encoding) < args.minLength) {
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
        { name: 'maxLength', assert: limitArg(joi) },
        { name: 'encoding', assert: encodingArg(joi) },
      ],
      validate (value: string, helpers: CustomHelpers, args: MaxArgs) {
        if (measure(displayString(value), args.encoding) > args.maxLength) {
          return helpers.error('htmlInput.displayMax', { maxLength: args.maxLength })
        }
        return value
      },
    },
  },
})

export default htmlInput
