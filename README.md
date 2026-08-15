# joi-html-input

A [Joi](https://www.npmjs.com/package/joi) extension for sanitizing and validating html inputs.

It does two things Joi's built in string rules cannot:

- **Sanitizes** html, stripping any tags and attributes you have not allowed.
- **Measures html by what the reader sees**, so `I like <strong>soup</strong>` counts as 11 characters rather than 28.

```js
Joi.htmlInput().allowedTags().displayMax(280)
```

Ships as both ESM and CommonJS with bundled TypeScript types.


## Requirements

| | Supported |
| --- | --- |
| Node.js | 22.12+ — every currently supported release line (22, 24, 26) |
| Joi | 17.13.4+ and 18.x (declared as a peer dependency) |

Joi is a peer dependency, so it always resolves to the copy in your project.


## Installation

```console
$ npm install joi-html-input joi
```

```console
$ yarn add joi-html-input joi
```

```console
$ pnpm add joi-html-input joi
```


## Usage

The package exports the extension twice, as a named export (`htmlInput`) and as the default export. They are the same value, so use whichever suits your codebase — but do take one of them. The module object itself is not the extension, so `require('joi-html-input')` on its own will not work.

**ESM**

```js
import BaseJoi from 'joi'
import { htmlInput } from 'joi-html-input'

const Joi = BaseJoi.extend(htmlInput)
```

**CommonJS**

```js
const BaseJoi = require('joi')
const { htmlInput } = require('joi-html-input')

const Joi = BaseJoi.extend(htmlInput)
```

**TypeScript**

Joi cannot widen the type of its own root at runtime, so cast the extended root to the exported `HtmlInputRoot` interface to get types for `.htmlInput()` and its rules.

```ts
import BaseJoi from 'joi'
import { htmlInput, type HtmlInputRoot } from 'joi-html-input'

const Joi = BaseJoi.extend(htmlInput) as HtmlInputRoot

const schema = Joi.htmlInput().allowedTags().displayMax(280)
```

The exported types are `HtmlInputRoot`, `HtmlInputSchema`, `AllowedTagsOptions` and `DisplayEncoding`.


## Sanitization

To remove unwanted tags from the user input you can use `.allowedTags()` to pass the input through [sanitize-html](https://www.npmjs.com/package/sanitize-html). By default this will strip things like `<script>` and `<iframe>` tags but leave in most other common tags.

```js
const htmlString = '<div>Test<script>alert(\'test\');</script></div>'
const joiSchema = Joi.htmlInput().allowedTags()
const results = joiSchema.validate(htmlString)

console.log(results)

/* Expected output:
{ value: '<div>Test</div>' }
*/
```

If you want more control over what html tags and attributes are allowed you can pass an options object to `.allowedTags()` which will be passed directly to [sanitize-html](https://www.npmjs.com/package/sanitize-html), so see their documentation for details. Here is an example.

```js
const sanitizeConfig = {
  allowedTags: [
    'h1',
    'span'
  ],
  allowedAttributes: {
    span: [
      'style'
    ]
  }
}

const htmlString = '<h1><span class="align-left" style="color:red;">Test Link</span></h1>'

const joiSchema = Joi.htmlInput().allowedTags(sanitizeConfig)
const results = joiSchema.validate(htmlString)

console.log(results)

/* Expected output:
{ value: '<h1><span style="color:red">Test Link</span></h1>' }
*/
```


## Display Length Methods

`.htmlInput()` extends the builtin `Joi.string()`, so every string method you already know — `.length()`, `.min()`, `.max()` — behaves exactly as it does on `Joi.string()`. Those measure the raw string with the markup included, which is what you want for something like a database column limit.

However, that is usually the wrong measure for a user facing character limit. When someone types into a WYSIWYG editor like TinyMCE or CKEditor, the markup behind their bullet points, links and styling is invisible to them — making a word bold should not cost them 17 characters.

The display methods measure what the reader actually sees. Tags are stripped and html entities are decoded before counting, so every one of these is 11 characters long:

| Value | `.length` | display length |
| --- | --- | --- |
| `I like soup` | 11 | **11** |
| `I like <strong>soup</strong>` | 28 | **11** |
| `I&nbsp;like&nbsp;soup` | 21 | **11** |
| `<p>I like <strong><em>soup</em></strong></p>` | 44 | **11** |

The value itself is never modified by these methods. Formatting is preserved; only the measurement ignores it.

Markup with no text in it — `<p></p>` or `<p><br></p>`, which is what most editors submit for an empty field — has a display length of zero. `.displayMax()` accepts it, and `.displayMin()` rejects it. Use Joi's own `.required()` and `.allow('')` to say whether the field may be empty at all.

Tag stripping is provided by [sanitize-html](https://www.npmjs.com/package/sanitize-html) and entity decoding by [html-entities](https://www.npmjs.com/package/html-entities).

### .displayLength(limit, [encoding])

Requires the display length to be exactly `limit`.

```js
// 12 Display Characters
const htmlString = '<div><h1 class="align-center">Test&nbsp;Heading</h1></div>'

// 17 Display Characters
const regularString = 'Long Test Heading'

const joiSchema = Joi.htmlInput().displayLength(12)
const pass = joiSchema.validate(htmlString)
const fail = joiSchema.validate(regularString)

console.log(pass)

/* Expected output:
{ value: '<div><h1 class="align-center">Test&nbsp;Heading</h1></div>' }
*/

console.log(fail)

/* Expected output:
{
  value: 'Long Test Heading',
  error: [Error [ValidationError]: "value" length must be 12 characters long] {
    _original: 'Long Test Heading',
    details: [ [Object] ]
  }
}
*/
```

### .displayMin(limit, [encoding])

Requires the display length to be at least `limit`.

```js
// 12 Display Characters
const htmlString = '<div><h1 class="align-center">Test&nbsp;Heading</h1></div>'

// 11 Display Characters
const regularString = 'Short Title'

const joiSchema = Joi.htmlInput().displayMin(12)
const pass = joiSchema.validate(htmlString)
const fail = joiSchema.validate(regularString)

console.log(pass)

/* Expected output:
{ value: '<div><h1 class="align-center">Test&nbsp;Heading</h1></div>' }
*/

console.log(fail)

/* Expected output:
{
  value: 'Short Title',
  error: [Error [ValidationError]: "value" length must be at least 12 characters long] {
    _original: 'Short Title',
    details: [ [Object] ]
  }
}
*/
```

### .displayMax(limit, [encoding])

Requires the display length to be at most `limit`.

```js
// 12 Display Characters
const htmlString = '<div><h1 class="align-center">Test&nbsp;Heading</h1></div>'

// 17 Display Characters
const regularString = 'Long Test Heading'

const joiSchema = Joi.htmlInput().displayMax(12)
const pass = joiSchema.validate(htmlString)
const fail = joiSchema.validate(regularString)

console.log(pass)

/* Expected output:
{ value: '<div><h1 class="align-center">Test&nbsp;Heading</h1></div>' }
*/

console.log(fail)

/* Expected output:
{
  value: 'Long Test Heading',
  error: [Error [ValidationError]: "value" length must be less than or equal to 12 characters long] {
    _original: 'Long Test Heading',
    details: [ [Object] ]
  }
}
*/
```


## Additional Examples

Here are some more examples that you might find useful. If you have any suggestions for additional examples please submit them via a pull request on github.


### Character Encoding

Just like the builtin `Joi.string().length()`, the `.displayLength()`, `.displayMin()` and `.displayMax()` methods also have support for an optional encoding parameter. Passing one counts bytes in that encoding instead of characters, which is what you want when the limit you are validating against is a byte limit — a `VARCHAR(n)` column, for instance.

Every encoding Node's `Buffer` supports is accepted, the same set Joi's own length rules take: `ascii`, `base64`, `base64url`, `binary`, `hex`, `latin1`, `ucs-2`, `ucs2`, `utf-8`, `utf-16le`, `utf8` and `utf16le`. Anything else is rejected when the schema is built.

```js
const htmlString = '<div><span class="small-text">Copywrite ©</span></div>'

// The displayed text is 'Copywrite ©', which is 11 characters but 12 utf8
// bytes, because © is a 2 byte character.

// Counting characters, this is 11 — so asking for 12 produces an error
const joiSchema1 = Joi.htmlInput().displayLength(12)
const results1 = joiSchema1.validate(htmlString)

console.log(results1)

/* Expected output:
{
  value: '<div><span class="small-text">Copywrite ©</span></div>',
  error: [Error [ValidationError]: "value" length must be 12 characters long] {
    _original: '<div><span class="small-text">Copywrite ©</span></div>',
    details: [ [Object] ]
  }
}
*/

// Counting utf8 bytes, this is 12 — so it validates
const joiSchema2 = Joi.htmlInput().displayLength(12, 'utf8')
const results2 = joiSchema2.validate(htmlString)

console.log(results2)

/* Expected output:
{ value: '<div><span class="small-text">Copywrite ©</span></div>' }
*/
```

### Sanitization And Validation Together

All the additional methods provided by `.htmlInput()` can be chained with other methods including those provided by Joi. Rules run in the order they are declared, so declaring `.allowedTags()` first means it sanitizes the value before the length rules measure it — which is the order you want, for the reasons in [Security notes](#declare-allowedtags-first). Here is an example of multiple methods being used together.

```js
const sanitizeConfig = {
  allowedTags: [
    'h1'
  ],
  allowedAttributes: {
    h1: [
      'id'
    ]
  }
}

const htmlString = '<h1 id="headline">Test Heading<script>alert(\'Test\')</script></h1>'
const joiSchema = Joi.htmlInput().allowedTags(sanitizeConfig).displayLength(12).max(50)
const results = joiSchema.validate(htmlString)

console.log(results)

/* Expected output:
{ value: '<h1 id="headline">Test Heading</h1>' }
*/
```


## Security notes

### Sanitizing and measuring are separate jobs

- `.allowedTags()` **sanitizes** — it returns a cleaned value.
- `.displayLength()`, `.displayMin()` and `.displayMax()` **measure** — they strip tags internally to count characters, then return your value untouched, formatting intact.

That separation is deliberate: you would not want a length check quietly rewriting the user's formatting. It does mean a schema with only a length rule validates the length and passes the original input straight through.

```js
// Length checked, value returned as-is
Joi.htmlInput().displayMax(280)

// Sanitized, length checked, and bounded for storage
Joi.htmlInput().allowedTags().displayMax(280).max(2000)
```

### Declare `.allowedTags()` first

Rules run in the order you declare them, and that order matters in two ways.

The display rules measure the value as it is when they run, so sanitizing after them measures something different from sanitizing before them. With the default options the two usually agree, but options that add or remove text — `disallowedTagsMode: 'escape'` or `'completelyDiscard'`, for instance — make the same input pass in one order and fail in the other.

More importantly, Joi stops at the first failing rule unless you pass `abortEarly: false`. If a length rule is declared ahead of `.allowedTags()` and that length rule fails, the sanitizer never runs, and the value returned alongside the error is the raw input:

```js
const dirty = '<p>' + 'a'.repeat(50) + '</p><script>alert(1)</script>'

// Sanitized, then rejected for length. value is safe.
Joi.htmlInput().allowedTags().displayMax(5).validate(dirty)

// Rejected for length before allowedTags() ever runs.
// value still contains the live <script> tag.
Joi.htmlInput().displayMax(5).allowedTags().validate(dirty)
```

You should not be using the value from a failed validation anyway, but it does get logged and echoed back in practice. Putting `.allowedTags()` first means the value is sanitized whatever happens after it.

### Options that switch sanitization off

The options object goes straight to sanitize-html, so two values disable filtering entirely:

- `{ allowedTags: false }` — allows **every** tag, including `<script>`. sanitize-html prints a console warning about `script` and `style` when they end up allowed, this route included. `allowVulnerableTags: true` silences the warning without making the configuration any safer, so take it as a prompt to check you meant this.
- `{ allowedAttributes: false }` — allows every attribute, including `onerror` and `onload`. This one is silent.

Only reach for these when the input is already trusted.

Partial options are safe. sanitize-html keeps its own defaults for any key you leave out, so `{ allowedTags: ['a'] }` still blocks `javascript:` URLs via the default `allowedSchemes`. Misspelled keys are rejected rather than ignored, so a typo cannot silently drop a restriction you meant to apply.

### Bounding stored size

Markup does not count toward the display length, so a value can pass `.displayMax(10)` and still be kilobytes of `<p></p>`. Add a plain `.max()` when the limit you care about is storage rather than what the user sees.

### Sanitize on output too

Sanitizing on input is one layer, not the whole defence. Escape or sanitize again at the point you render, according to the context you are rendering into, and set a Content Security Policy. This package cannot know where its output ends up.


## Migrating from v2

Version 3 is a breaking release. The validation rules themselves are unchanged — only how you install and import the package.

- **Node 22.12 or newer is required.** Node 16 is no longer supported.
- **Joi 17.13.4 or 18.x is required**, and Joi is now a peer dependency you install yourself.
- **The import changed.** In v2 the module *was* the extension. In v3 it exports the extension, so take it off the module rather than using the module itself:

  ```js
  // v2
  const htmlInput = require('joi-html-input')

  // v3
  const { htmlInput } = require('joi-html-input')
  ```

  `require('joi-html-input').default` works too, as does a default `import` in ESM. The rest of the usage — `Joi.extend(htmlInput)` and every rule — is unchanged.


## Contributing

Bug reports and pull requests are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md) for how to get set up, run the tests and format your commits. Please report security vulnerabilities privately rather than in a public issue.


## Disclaimer

This package is not an official part of Joi nor is it produced by any member of the Joi team. It is not security tested, if you want to use this package in your project please read the full license first (link below) and review the code for yourself before using.


## License

[BSD-3-Clause](LICENSE.md)
