import { describe, expect, it } from 'vitest'

import htmlInputDefault, { htmlInput, type DisplayEncoding } from '../src/index.js'
import { joiVersions } from './joi-versions.js'

describe('package exports', () => {
  it('exposes the extension as both a named and a default export', () => {
    expect(htmlInputDefault).toBe(htmlInput)
  })

  it('keeps DisplayEncoding in step with Node BufferEncoding', () => {
    // DisplayEncoding is spelled out rather than aliased to BufferEncoding so
    // the published declarations stay self contained. These two assignments
    // check the unions are identical: the first that ours contains nothing Node
    // does not, the second that Node contains nothing we are missing — which is
    // the alarm for Node gaining an encoding.
    //
    // NOTE: this is a compile time check, not a runtime one. Vitest strips
    // types without checking them, so `npm test` will still report this as
    // passing even when the unions have diverged. `npm run typecheck` is what
    // actually catches it, and that runs in `npm run verify` and in CI. The
    // expect() below is only here so the test body is not empty; at runtime
    // both values are null and it asserts nothing of substance.
    const _toNode: BufferEncoding = null as unknown as DisplayEncoding
    const _fromNode: DisplayEncoding = null as unknown as BufferEncoding
    expect([_toNode, _fromNode]).toHaveLength(2)
  })
})

describe.each(joiVersions)('Joi.htmlInput on $name', ({ Joi }) => {
  describe('Joi.htmlInput.allowedTags', () => {
    const sanitizeConfig = {
      allowedTags: ['p', 'span'],
      allowedAttributes: { span: ['style'] },
    }

    it('should not strip allowed tags', () => {
      const htmlString = '<p>This is a <span>string</span></p>'
      const joiSchema = Joi.htmlInput().allowedTags(sanitizeConfig)
      const joiValidation = joiSchema.validate(htmlString)

      expect(joiValidation.error).toBe(undefined)
      expect(joiValidation.value).toBe(htmlString)
    })

    it('should strip any other tags', () => {
      const dirtyHtmlString = '<div><p>This is <span>bad</span><script>alert(\'hiya\')</script></p></div>'
      const joiSchema = Joi.htmlInput().allowedTags(sanitizeConfig)
      const joiValidation = joiSchema.validate(dirtyHtmlString)
      const cleanHtmlString = '<p>This is <span>bad</span></p>'

      expect(joiValidation.error).toBe(undefined)
      expect(joiValidation.value).toBe(cleanHtmlString)
    })

    it('should not strip allowed attributes', () => {
      const htmlString = '<p>This is a <span style="color:red">string</span></p>'
      const joiSchema = Joi.htmlInput().allowedTags(sanitizeConfig)
      const joiValidation = joiSchema.validate(htmlString)

      expect(joiValidation.error).toBe(undefined)
      expect(joiValidation.value).toBe(htmlString)
    })

    it('should strip any other attributes', () => {
      const dirtyHtmlString = '<p id="test">This is a <span class="italic" style="color:red">string</span></p>'
      const joiSchema = Joi.htmlInput().allowedTags(sanitizeConfig)
      const joiValidation = joiSchema.validate(dirtyHtmlString)
      const cleanHtmlString = '<p>This is a <span style="color:red">string</span></p>'

      expect(joiValidation.error).toBe(undefined)
      expect(joiValidation.value).toBe(cleanHtmlString)
    })

    it('should accept any option sanitize-html supports, not just the two common ones', () => {
      // These are all valid sanitize-html options and are documented as being
      // passed straight through, so building the schema must not reject them.
      expect(() => Joi.htmlInput().allowedTags({ allowedTags: ['a'], allowedSchemes: ['https'] })).not.toThrow()
      expect(() => Joi.htmlInput().allowedTags({ allowedTags: ['a'], transformTags: { a: 'span' } })).not.toThrow()
      expect(() => Joi.htmlInput().allowedTags({ allowedTags: ['p'], disallowedTagsMode: 'escape' })).not.toThrow()
      expect(() => Joi.htmlInput().allowedTags({ allowedTags: false })).not.toThrow()
      expect(() => Joi.htmlInput().allowedTags({ allowedAttributes: false })).not.toThrow()
    })

    it('should apply a pass-through option rather than silently ignoring it', () => {
      const joiSchema = Joi.htmlInput().allowedTags({
        allowedTags: ['p'],
        disallowedTagsMode: 'escape',
      })
      const joiValidation = joiSchema.validate('<p>Keep</p><b>escape</b>')

      expect(joiValidation.error).toBe(undefined)
      expect(joiValidation.value).toBe('<p>Keep</p>&lt;b&gt;escape&lt;/b&gt;')
    })

    it('should still reject a malformed value for a known option', () => {
      expect(() => Joi.htmlInput().allowedTags({ allowedTags: [1, 2] as unknown as string[] })).toThrow()
    })

    it('should strip tags based on defaults if no parameters are provided', () => {
      const htmlString = '<p>This is a <span>string</span><script>alert(\'test\')</script></p>'
      const joiSchema = Joi.htmlInput().allowedTags()
      const joiValidation = joiSchema.validate(htmlString)
      const cleanHtmlString = '<p>This is a <span>string</span></p>'

      expect(joiValidation.error).toBe(undefined)
      expect(joiValidation.value).toBe(cleanHtmlString)
    })
  })

  describe('Joi.htmlInput.displayLength', () => {
    it('should accept strings matching the desired length', () => {
      const htmlString = '<p>This is an <span style="color:red">html string</span></p>'
      const joiSchema = Joi.htmlInput().displayLength(22)
      const joiValidation = joiSchema.validate(htmlString)

      expect(joiValidation.error).toBe(undefined)
      expect(joiValidation.value).toBe(htmlString)
    })

    it('should reject strings that are less than the desired length', () => {
      const htmlString = '<p>This is an <span style="color:red">html string</span></p>'
      const joiSchema = Joi.htmlInput().displayLength(23)
      const joiValidation = joiSchema.validate(htmlString)
      const joiErrorMsg = '"value" length must be 23 characters long'

      expect(joiValidation.error).not.toBe(undefined)
      expect(joiValidation.error?.details.pop()?.message).toBe(joiErrorMsg)
      expect(joiValidation.value).toBe(htmlString)
    })

    it('should reject strings that are greater than the desired length', () => {
      const htmlString = '<p>This is an <span style="color:red">html string</span></p>'
      const joiSchema = Joi.htmlInput().displayLength(21)
      const joiValidation = joiSchema.validate(htmlString)
      const joiErrorMsg = '"value" length must be 21 characters long'

      expect(joiValidation.error).not.toBe(undefined)
      expect(joiValidation.error?.details.pop()?.message).toBe(joiErrorMsg)
      expect(joiValidation.value).toBe(htmlString)
    })

    it('should account for html entities', () => {
      const htmlString = '<p>This&nbsp;is&nbsp;an&nbsp;<span style="color:red">html&nbsp;string</span></p>'
      const joiSchema = Joi.htmlInput().displayLength(22)
      const joiValidation = joiSchema.validate(htmlString)

      expect(joiValidation.error).toBe(undefined)
      expect(joiValidation.value).toBe(htmlString)
    })

    it('should enforce a limit using byte count', () => {
      const htmlString = '<p>Test ©</p>'
      const joiSchema = Joi.htmlInput().displayLength(7, 'utf8')
      const joiValidation = joiSchema.validate(htmlString)

      expect(joiValidation.error).toBe(undefined)
      expect(joiValidation.value).toBe(htmlString)
    })
  })

  describe('encoding argument', () => {
    // The display text of this value is 'Test ©', which is 6 characters and a
    // different number of bytes in each encoding.
    const htmlString = '<p>Test ©</p>'

    const encodings: DisplayEncoding[] = [
      'ascii', 'base64', 'base64url', 'binary', 'hex',
      'latin1', 'ucs-2', 'ucs2', 'utf-8', 'utf-16le', 'utf8', 'utf16le',
    ]

    describe('every encoding Node supports is accepted', () => {
      it.each(encodings)('%s measures in bytes of that encoding', (encoding) => {
        const expected = Buffer.byteLength('Test ©', encoding)

        expect(Joi.htmlInput().displayLength(expected, encoding).validate(htmlString).error).toBe(undefined)
        expect(Joi.htmlInput().displayMin(expected, encoding).validate(htmlString).error).toBe(undefined)
        expect(Joi.htmlInput().displayMax(expected, encoding).validate(htmlString).error).toBe(undefined)
        // One byte under the real length must fail the exact and max forms.
        expect(Joi.htmlInput().displayLength(expected - 1, encoding).validate(htmlString).error).not.toBe(undefined)
        expect(Joi.htmlInput().displayMax(expected - 1, encoding).validate(htmlString).error).not.toBe(undefined)
      })

      it('measures characters rather than bytes when no encoding is given', () => {
        expect(Joi.htmlInput().displayLength(6).validate(htmlString).error).toBe(undefined)
        expect(Joi.htmlInput().displayLength(7).validate(htmlString).error).not.toBe(undefined)
      })

      it('distinguishes encodings that differ in width', () => {
        // utf16le is 2 bytes per character where latin1 is 1.
        expect(Joi.htmlInput().displayLength(12, 'utf16le').validate(htmlString).error).toBe(undefined)
        expect(Joi.htmlInput().displayLength(6, 'latin1').validate(htmlString).error).toBe(undefined)
      })
    })

    describe('encodings Node does not support are rejected', () => {
      // Real encodings that Buffer has no support for, plus outright nonsense.
      // All of these must fail when the schema is built rather than being
      // carried as far as the first value someone validates.
      const unsupported = ['utf32', 'iso-8859-1', 'windows-1252', 'shift_jis', 'nonsense']

      it.each(unsupported)('%s throws when the schema is built', (encoding) => {
        expect(Buffer.isEncoding(encoding)).toBe(false)

        expect(() => Joi.htmlInput().displayLength(5, encoding as DisplayEncoding)).toThrow()
        expect(() => Joi.htmlInput().displayMin(5, encoding as DisplayEncoding)).toThrow()
        expect(() => Joi.htmlInput().displayMax(5, encoding as DisplayEncoding)).toThrow()
      })
    })
  })

  describe('Joi.htmlInput.displayMin', () => {
    it('should accept strings matching the desired length', () => {
      const htmlString = '<p>This is an <span style="color:red">html string</span></p>'
      const joiSchema = Joi.htmlInput().displayMin(22)
      const joiValidation = joiSchema.validate(htmlString)

      expect(joiValidation.error).toBe(undefined)
      expect(joiValidation.value).toBe(htmlString)
    })

    it('should reject strings that are less than the desired length', () => {
      const htmlString = '<p>This is an <span style="color:red">html string</span></p>'
      const joiSchema = Joi.htmlInput().displayMin(23)
      const joiValidation = joiSchema.validate(htmlString)
      const joiErrorMsg = '"value" length must be at least 23 characters long'

      expect(joiValidation.error).not.toBe(undefined)
      expect(joiValidation.error?.details.pop()?.message).toBe(joiErrorMsg)
      expect(joiValidation.value).toBe(htmlString)
    })

    it('should accept strings that are greater than the desired length', () => {
      const htmlString = '<p>This is an <span style="color:red">html string</span></p>'
      const joiSchema = Joi.htmlInput().displayMin(21)
      const joiValidation = joiSchema.validate(htmlString)

      expect(joiValidation.error).toBe(undefined)
      expect(joiValidation.value).toBe(htmlString)
    })

    it('should account for html entities', () => {
      const htmlString = '<p>This&nbsp;is&nbsp;an&nbsp;<span style="color:red">html&nbsp;string</span></p>'
      const joiSchema = Joi.htmlInput().displayMin(23)
      const joiValidation = joiSchema.validate(htmlString)
      const joiErrorMsg = '"value" length must be at least 23 characters long'

      expect(joiValidation.error).not.toBe(undefined)
      expect(joiValidation.error?.details.pop()?.message).toBe(joiErrorMsg)
      expect(joiValidation.value).toBe(htmlString)
    })

    it('should enforce a minimum using byte count', () => {
      const htmlString = '<p>Test ©</p>'
      const joiSchema = Joi.htmlInput().displayMin(8, 'utf8')
      const joiValidation = joiSchema.validate(htmlString)
      const joiErrorMsg = '"value" length must be at least 8 characters long'

      expect(joiValidation.error).not.toBe(undefined)
      expect(joiValidation.error?.details.pop()?.message).toBe(joiErrorMsg)
      expect(joiValidation.value).toBe(htmlString)
    })
  })

  describe('Joi.htmlInput.displayMax', () => {
    it('should accept strings matching the desired length', () => {
      const htmlString = '<p>This is an <span style="color:red">html string</span></p>'
      const joiSchema = Joi.htmlInput().displayMax(22)
      const joiValidation = joiSchema.validate(htmlString)

      expect(joiValidation.error).toBe(undefined)
      expect(joiValidation.value).toBe(htmlString)
    })

    it('should accept strings that are less than the desired length', () => {
      const htmlString = '<p>This is an <span style="color:red">html string</span></p>'
      const joiSchema = Joi.htmlInput().displayMax(23)
      const joiValidation = joiSchema.validate(htmlString)

      expect(joiValidation.error).toBe(undefined)
      expect(joiValidation.value).toBe(htmlString)
    })

    it('should reject strings that are greater than the desired length', () => {
      const htmlString = '<p>This is an <span style="color:red">html string</span></p>'
      const joiSchema = Joi.htmlInput().displayMax(21)
      const joiValidation = joiSchema.validate(htmlString)
      const joiErrorMsg = '"value" length must be less than or equal to 21 characters long'

      expect(joiValidation.error).not.toBe(undefined)
      expect(joiValidation.error?.details.pop()?.message).toBe(joiErrorMsg)
      expect(joiValidation.value).toBe(htmlString)
    })

    it('should account for html entities', () => {
      const htmlString = '<p>This&nbsp;is&nbsp;an&nbsp;<span style="color:red">html&nbsp;string</span></p>'
      const joiSchema = Joi.htmlInput().displayMax(22)
      const joiValidation = joiSchema.validate(htmlString)

      expect(joiValidation.error).toBe(undefined)
      expect(joiValidation.value).toBe(htmlString)
    })

    it('should enforce a maximum using byte count', () => {
      // 'Test ©' is 6 characters but 7 bytes in utf8.
      const htmlString = '<p>Test ©</p>'

      expect(Joi.htmlInput().displayMax(7, 'utf8').validate(htmlString).error).toBe(undefined)

      const joiValidation = Joi.htmlInput().displayMax(6, 'utf8').validate(htmlString)
      const joiErrorMsg = '"value" length must be less than or equal to 6 characters long'

      expect(joiValidation.error).not.toBe(undefined)
      expect(joiValidation.error?.details.pop()?.message).toBe(joiErrorMsg)
      expect(joiValidation.value).toBe(htmlString)
    })
  })

  describe('rule chaining', () => {
    it('should apply sanitisation before the length rules see the value', () => {
      const dirtyHtmlString = '<p>Hello <script>alert(1)</script></p>'
      const joiSchema = Joi.htmlInput().allowedTags().displayMax(6)
      const joiValidation = joiSchema.validate(dirtyHtmlString)

      expect(joiValidation.error).toBe(undefined)
      expect(joiValidation.value).toBe('<p>Hello </p>')
    })

    it('should reject a non-string value using the base string type', () => {
      const joiValidation = Joi.htmlInput().validate(42)

      expect(joiValidation.error).not.toBe(undefined)
      expect(joiValidation.error?.details.pop()?.message).toBe('"value" must be a string')
    })
  })
})
