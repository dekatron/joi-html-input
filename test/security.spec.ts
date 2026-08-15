import { describe, expect, it } from 'vitest'

import { joiVersions } from './joi-versions.js'

/**
 * Security regression suite.
 *
 * These tests pin the sanitisation guarantees the package actually makes, and
 * — just as importantly — the places where it deliberately makes none. A
 * change that quietly turns one of the "does not sanitise" cases into a
 * "sanitises" case is welcome, but it should be a conscious decision that
 * updates these tests, not a silent behaviour drift.
 */

/** Markup that must never survive `allowedTags()` with its default options. */
const xssVectors: [name: string, payload: string][] = [
  ['script tag', '<script>alert(1)</script>'],
  ['uppercase script tag', '<ScRiPt>alert(1)</ScRiPt>'],
  ['img with onerror', '<img src=x onerror=alert(1)>'],
  ['svg with onload', '<svg onload=alert(1)>'],
  ['body with onload', '<body onload=alert(1)>'],
  ['iframe with srcdoc', '<iframe srcdoc="<script>alert(1)</script>"></iframe>'],
  ['object with data url', '<object data="javascript:alert(1)"></object>'],
  ['meta refresh', '<meta http-equiv="refresh" content="0;url=javascript:alert(1)">'],
  ['base tag hijack', '<base href="http://evil.example/">'],
  ['form with javascript action', '<form action="javascript:alert(1)"><button>go</button></form>'],
  ['noscript mutation xss', '<noscript><p title="</noscript><img src=x onerror=alert(1)>">'],
  ['script inside malformed nesting', '<div><p>a<script>alert(1)</script></div>'],
  ['comment wrapped payload', '<!--<img src=x onerror=alert(1)>-->'],
]

/** Anything matching this in an output value would mean the sanitiser let something live through. */
const executableMarkup = /<script|<iframe|<object|<embed|<base|<meta|onerror|onload|onclick|javascript:|srcdoc/i

describe.each(joiVersions)('security: $name', ({ Joi }) => {
  describe('allowedTags() with default options', () => {
    it.each(xssVectors)('strips %s', (_name, payload) => {
      const result = Joi.htmlInput().allowedTags().validate(payload)

      expect(result.error).toBe(undefined)
      expect(result.value).not.toMatch(executableMarkup)
    })

    it('strips javascript: urls from an allowed anchor', () => {
      const result = Joi.htmlInput().allowedTags().validate('<a href="javascript:alert(1)">click</a>')

      expect(result.value).toBe('<a>click</a>')
      expect(result.value).not.toMatch(/javascript:/i)
    })

    it('strips event handler attributes from an otherwise allowed tag', () => {
      const result = Joi.htmlInput().allowedTags().validate('<p onclick="alert(1)" onmouseover="alert(2)">text</p>')

      expect(result.value).toBe('<p>text</p>')
    })

    it('leaves entity encoded markup encoded rather than reviving it', () => {
      // The decode step exists only to measure display length. It must never
      // turn encoded text back into live markup in the returned value.
      const result = Joi.htmlInput().allowedTags().validate('&lt;script&gt;alert(1)&lt;/script&gt;')

      expect(result.value).toBe('&lt;script&gt;alert(1)&lt;/script&gt;')
      expect(result.value).not.toMatch(/<script/i)
    })
  })

  describe('entity decoding cannot revive markup', () => {
    // The display rules sanitize and THEN decode entities in order to measure
    // the value. That decode step genuinely produces live markup:
    //
    //   input           &lt;script&gt;alert(&quot;fail&quot;)&lt;/script&gt;   52 chars
    //   after sanitize  &lt;script&gt;alert("fail")&lt;/script&gt;                42 chars
    //   after decode    <script>alert("fail")</script>                            30 chars
    //
    // Sanitizing cannot strip an encoded tag, because at that point it is text
    // rather than markup — and correctly so. The value is safe purely because
    // the decoded form is measured and discarded, never returned. These tests
    // pin that, so reordering the two steps or returning the decoded string
    // fails loudly instead of shipping a live script tag to the caller.
    const encoded = '&lt;script&gt;alert(&quot;fail&quot;)&lt;/script&gt;'
    const RAW_LENGTH = 52
    const DECODED_LENGTH = 30

    it('measures the decoded form, not the raw one', () => {
      // Guards against this whole block passing vacuously: if the decode step
      // stopped running, the measured length would be the raw 52 instead.
      expect(encoded).toHaveLength(RAW_LENGTH)
      expect(Joi.htmlInput().displayLength(DECODED_LENGTH).validate(encoded).error).toBe(undefined)
      expect(Joi.htmlInput().displayLength(RAW_LENGTH).validate(encoded).error).not.toBe(undefined)
    })

    it.each(['displayLength', 'displayMin', 'displayMax'] as const)(
      '%s returns the value still encoded, never the decoded live form',
      (rule) => {
        const schema = rule === 'displayLength'
          ? Joi.htmlInput().displayLength(DECODED_LENGTH)
          : rule === 'displayMin'
            ? Joi.htmlInput().displayMin(1)
            : Joi.htmlInput().displayMax(DECODED_LENGTH)

        const result = schema.validate(encoded)

        expect(result.error).toBe(undefined)
        expect(result.value).toBe(encoded)
        expect(result.value).not.toMatch(executableMarkup)
      },
    )

    it('does not leak the decoded live form into a validation error', () => {
      const result = Joi.htmlInput().displayLength(999).validate(encoded)
      const serialised = JSON.stringify(result.error?.details) + String(result.error?.message)

      expect(result.error).not.toBe(undefined)
      expect(serialised).not.toMatch(executableMarkup)
      expect(result.value).toBe(encoded)
    })

    it('stays inert when sanitizing and measuring are chained', () => {
      const result = Joi.htmlInput().allowedTags().displayMax(DECODED_LENGTH).validate(encoded)

      // sanitize-html decodes &quot; to a bare quote in text content, but the
      // angle brackets stay encoded, so the result is still not live markup.
      expect(result.error).toBe(undefined)
      expect(result.value).toBe('&lt;script&gt;alert("fail")&lt;/script&gt;')
      expect(result.value).not.toMatch(executableMarkup)
    })

    it('decodes one level only, so double encoding cannot become live', () => {
      const result = Joi.htmlInput().displayMax(500).validate('&amp;lt;script&amp;gt;alert(1)&amp;lt;/script&amp;gt;')

      expect(result.error).toBe(undefined)
      expect(result.value).not.toMatch(executableMarkup)
    })
  })

  describe('option pass-through keeps sanitize-html defaults for unspecified keys', () => {
    it('still blocks javascript: urls when only allowedTags is supplied', () => {
      const result = Joi.htmlInput()
        .allowedTags({ allowedTags: ['a'] })
        .validate('<a href="javascript:alert(1)">x</a>')

      expect(result.value).not.toMatch(/javascript:/i)
    })

    it('rejects a misspelled option instead of silently ignoring it', () => {
      // A typo must not fail open: allowedScheme (singular) would otherwise be
      // dropped, reverting to the default schemes and losing the restriction.
      expect(() => Joi.htmlInput().allowedTags({ allowedTags: ['a'], allowedScheme: ['https'] } as never)).toThrow()
      expect(() => Joi.htmlInput().allowedTags({ allowedTag: ['p'] } as never)).toThrow()
      expect(() => Joi.htmlInput().allowedTags({ nonTextTag: ['script'] } as never)).toThrow()
    })

    it('accepts every real sanitize-html option', () => {
      expect(() => Joi.htmlInput().allowedTags({
        allowedTags: ['a', 'p'],
        allowedAttributes: { a: ['href'] },
        allowedSchemes: ['https'],
        allowedSchemesByTag: { a: ['https'] },
        allowedClasses: { p: ['intro'] },
        allowedStyles: {},
        disallowedTagsMode: 'escape',
        nonTextTags: ['script', 'style'],
        enforceHtmlBoundary: true,
        nestingLimit: 10,
        parseStyleAttributes: false,
        selfClosing: ['br'],
        transformTags: { a: 'span' },
        textFilter: (text: string) => text,
      })).not.toThrow()
    })

    it('honours a narrowed allowedSchemes', () => {
      const schema = Joi.htmlInput().allowedTags({ allowedTags: ['a'], allowedSchemes: ['https'] })

      expect(schema.validate('<a href="https://ok.example">x</a>').value).toMatch(/https:\/\/ok\.example/)
      expect(schema.validate('<a href="http://x.example">x</a>').value).toBe('<a>x</a>')
    })
  })

  describe('rule order does not change the safety of the returned value', () => {
    const payload = '<p>hi</p><script>alert(1)</script>'

    it('sanitises when allowedTags is declared first', () => {
      expect(Joi.htmlInput().allowedTags().displayMax(50).validate(payload).value).toBe('<p>hi</p>')
    })

    it('sanitises when allowedTags is declared last', () => {
      expect(Joi.htmlInput().displayMax(50).allowedTags().validate(payload).value).toBe('<p>hi</p>')
    })
  })

  describe('documented non-guarantees — these rules do NOT sanitise', () => {
    const payload = '<p>hi</p><script>alert(1)</script>'

    it.each(['displayLength', 'displayMin', 'displayMax'] as const)(
      '%s returns the original unsanitised value',
      (rule) => {
        // The display rules strip tags only to MEASURE the value. Callers that
        // need a safe value must also call allowedTags().
        const schema = rule === 'displayMin'
          ? Joi.htmlInput().displayMin(1)
          : Joi.htmlInput()[rule](500)

        expect(schema.validate(payload).value).toBe(payload)
      },
    )

    it('a bare htmlInput() performs no sanitisation at all', () => {
      expect(Joi.htmlInput().validate(payload).value).toBe(payload)
    })

    it('allowedTags: false disables tag filtering entirely', () => {
      // sanitize-html treats `false` as "allow everything" and, unlike an
      // explicit allowedTags: ['script'], issues no warning. Pinned here so the
      // danger of this option is visible in the test suite.
      expect(Joi.htmlInput().allowedTags({ allowedTags: false }).validate(payload).value).toBe(payload)
    })

    it('allowedAttributes: false lets event handlers through', () => {
      const result = Joi.htmlInput()
        .allowedTags({ allowedTags: ['img'], allowedAttributes: false })
        .validate('<img src=x onerror=alert(1)>')

      expect(result.value).toMatch(/onerror/)
    })
  })

  describe('length rules and stored value size', () => {
    it('does not count markup toward the display length, so pair with .max() to bound storage', () => {
      const padded = '<p></p>'.repeat(500) + 'short'

      // Passes the display limit despite being thousands of characters long...
      expect(Joi.htmlInput().displayMax(10).validate(padded).error).toBe(undefined)
      // ...which is why a plain joi .max() is the thing that bounds storage.
      expect(Joi.htmlInput().displayMax(10).max(100).validate(padded).error).not.toBe(undefined)
    })

    it('does not count the contents of script or style tags toward display length', () => {
      const schema = Joi.htmlInput().displayLength(2)

      expect(schema.validate('<script>' + 'a'.repeat(28) + '</script>ab').error).toBe(undefined)
      expect(schema.validate('<style>' + 'a'.repeat(28) + '</style>ab').error).toBe(undefined)
    })
  })

  describe('input type handling', () => {
    it.each([
      ['a number', 42],
      ['null', null],
      ['an object', {}],
      ['an array containing markup', ['<script>alert(1)</script>']],
    ])('rejects %s rather than coercing it', (_name, input) => {
      const result = Joi.htmlInput().allowedTags().validate(input)

      expect(result.error).not.toBe(undefined)
      expect(result.error?.details.pop()?.message).toBe('"value" must be a string')
    })

    it('requires .required() to reject undefined, as with any joi schema', () => {
      expect(Joi.htmlInput().allowedTags().validate(undefined).error).toBe(undefined)
      expect(Joi.htmlInput().allowedTags().required().validate(undefined).error).not.toBe(undefined)
    })
  })
})
