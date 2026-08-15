# joi-html-input

A [Joi](https://www.npmjs.com/package/joi) extension for sanitizing and validating html inputs.

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

The package exports the extension as a named export (`htmlInput`) and as a default export — they are the same value, so use whichever suits your codebase.

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


## Additional Methods

`.htmlInput()` extends the builtin `Joi.string()` method so you can use any of the built in string methods including `.length()`, `.min()` and `.max()` and they will work the same as you would expect when using `Joi.string()`. These could be useful if you want to validate the maximum length of a string so that you don't exceed a character limit in your database. However you may run into problems if you are using a WYSIWYG editor like TinyMCE or CKEditor and want to set a character limit but you don't want the generated html for bulletpoints, links or styling to count towards that character limit.

To help you validate your HTML strings based on the actual length they will be when displayed in the browser `.htmlInput()` provides several methods. These methods will also account for html entities such as `&nbsp;` so that they only count as a single character.

The tag stripping for these methods is provided by [sanitize-html](https://www.npmjs.com/package/sanitize-html) and the decoding of HTML entities is provided by [html-entities](https://www.npmjs.com/package/html-entities).

### .displayLength(limit, [encoding])

Validates the length of a string ignoring HTML tags and converting HTML entities to characters. The return value remains unchanged.

```js
const htmlString = '<div><h1 class="align-center">Test&nbsp;Heading</h1></div>'
const joiSchema = Joi.htmlInput().displayLength(12)
const results = joiSchema.validate(htmlString)

console.log(results)

/* Expected output:
{ value: '<div><h1 class="align-center">Test&nbsp;Heading</h1></div>' }
*/
```

### .displayMin(limit, [encoding])

Validates the minimum number of characters in a string ignoring HTML tags and converting HTML entities to characters. The return value remains unchanged.

```js
const htmlString = '<div><h1 class="align-center">Test&nbsp;Heading</h1></div>'
const joiSchema = Joi.htmlInput().displayMin(12)
const results = joiSchema.validate(htmlString)

console.log(results)

/* Expected output:
{ value: '<div><h1 class="align-center">Test&nbsp;Heading</h1></div>' }
*/
```

### .displayMax(limit, [encoding])

Validates the maximum number of characters in a string ignoring HTML tags and converting HTML entities to characters. The return value remains unchanged.

```js
const htmlString = '<div><h1 class="align-center">Test&nbsp;Heading</h1></div>'
const joiSchema = Joi.htmlInput().displayMax(12)
const results = joiSchema.validate(htmlString)

console.log(results)

/* Expected output:
{ value: '<div><h1 class="align-center">Test&nbsp;Heading</h1></div>' }
*/
```


## Additional Examples

Here are some more examples that you might find useful. If you have any suggestions for additional examples please submit them via a pull request on github.


### Character Encoding

Just like the builtin `Joi.string().length()`, the `.displayLength()`, `.displayMin()` and `.displayMax()` methods also have support for an optional encoding parameter. Passing `'utf8'` counts bytes instead of characters, which is what you want when the limit you are validating against is a byte limit — a `VARCHAR(n)` column, for instance.

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

All the additional methods provided by `.htmlInput()` can be chained with other methods including those provided by Joi. Rules run in the order they are declared, so `.allowedTags()` sanitizes the value before the length rules measure it. Here is an example of multiple methods being used together.

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


## Migrating from v2

Version 3 is a breaking release. The validation rules themselves are unchanged — only how you install and import the package.

- **Node 22.12 or newer is required.** Node 16 is no longer supported.
- **Joi 17.13.4 or 18.x is required**, and Joi is now a peer dependency you install yourself.
- **The import changed.** The extension is now a named export rather than the whole module:

  ```js
  // v2
  const htmlInput = require('joi-html-input')

  // v3
  const { htmlInput } = require('joi-html-input')
  ```

  The rest of the usage — `Joi.extend(htmlInput)` and every rule — is the same.


## Development

The repo uses npm. Published releases work with npm, yarn or pnpm.

```console
$ npm install
$ npm test        # runs the suite against both Joi 17 and Joi 18
$ npm run lint
$ npm run typecheck
$ npm run build
$ npm run verify  # all of the above
```

The test suite runs every test twice, once per supported Joi major. Joi 18 is the normal `joi` devDependency and Joi 17 is installed alongside it under the `joi-v17` alias.

Some dependency versions are pinned on purpose and should not be bumped without checking:

- **`typescript` is held at 6.x** because `typescript-eslint` does not yet support TypeScript 7. Bump both together once it does.
- **`@types/node` is held at 22.x** to match the minimum supported Node version, so the typecheck catches accidental use of newer APIs.
- **`joi-v17`** intentionally tracks Joi 17 for the compatibility test run.

Builds are checked with [publint](https://publint.dev) and [Are the Types Wrong?](https://arethetypeswrong.github.io) so that packaging problems fail the build rather than a release.


## Disclaimer

This package is not an official part of Joi nor is it produced by any member of the Joi team. It is not security tested, if you want to use this package in your project please read the full license first (link below) and review the code for yourself before using.


## License

[BSD-3-Clause](LICENSE.md)
