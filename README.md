# joi-html-input

A [Joi](https://www.npmjs.com/package/joi) extension for sanitizing and validating html inputs.


## Installation

Installation using yarn, if you're not familiar with yarn it's a faster more reliable drop-in replacement for npm [read more here](https://yarnpkg.com/l)
```
yarn add joi-html-input
```

Installation using npm
```
npm install --save joi-html-input
```

## Sanitization

To remove unwanted tags from the input you can use `.allowedTags()` to pass the input through [sanitize-html](https://www.npmjs.com/package/sanitize-html) the options object that you pass into `.allowedTags()` is passed directly to sanitize-html with out any changes so see their documention for a list of available arguments.

```
const htmlInput = require('joi-html-input');
const Joi = require('joi').extend(htmlInput);

const sanitizeConfig = {
  'allowedTags': [
    'p',
    'span'
  ],
  'allowedAttributes': {
    'span': [
      'style'
    ]
  }
};

const htmlString = '<p id="test">This is a <span class="italic" style="color: red;">string</span></p>';
const joiSchema = Joi.htmlInput().allowedTags(sanitizeConfig);
const joiValidation = Joi.validate(htmlString, joiSchema);

console.log(joiValidation);

/* Expected output:
{ error: null,
  value: '<p>This is a <span style="color: red;">string</span></p>' }
*/

```

## Display Length

The `.length()`,`.min()` and `.max()` methods built in to Joi's `.string()` will return the actual length of the string that is passed to them. Becuase htmlInputs extends the built in Joi `.string()` you can use these methods if you want to validate that you're not going to exceed a character limit in your database or if you want to ensure that users are no able to submit an unlimited amount of HTML with their content.

However in addition to the built-in string methods htmlInputs also include 3 additional methods `.displayLength()`,`.displayMin()` and `.displayMax()` which can be used to validate the apparent length of the text when viewed in a web browser. This can be useful if you are using an WYSIWYG editor like TinyMCE or CKEditor and want to set a character limit but you don't want the generated html for bulletpoints, links or styling to count towards that character limit. These 3 menthod will also account for html entities such as `&nbsp;` so that they only count as single characters.

```
const htmlInput = require('./lib/index.js');
const Joi = require('joi').extend(htmlInput);

const sanitizeConfig = {
  'allowedTags': [
    'p',
    'span'
  ],
  'allowedAttributes': {
    'span': [
      'style'
    ]
  }
};

const htmlString = '<p id="test">This&nbsp;is&nbsp;a&nbsp;<span class="italic" style="color: red;">string</span></p>';

// All the validations below will pass because when you strip the html above and convert the htmlentities to their charcters the string length is 16

const lengthSchema = Joi.htmlInput().allowedTags(sanitizeConfig).displayLength(16);
const lengthValidation = Joi.validate(htmlString, lengthSchema);
console.log(lengthValidation);

const minSchema = Joi.htmlInput().allowedTags(sanitizeConfig).displayMin(16);
const minValidation = Joi.validate(htmlString, minSchema);
console.log(minValidation);

const maxSchema = Joi.htmlInput().allowedTags(sanitizeConfig).displayMax(16);
const maxValidation = Joi.validate(htmlString, maxSchema);
console.log(maxValidation);
```

## Disclaimer

This package is not an official part of Joi nor is it produced by any member of the Joi team. It is not security tested, if you want to use this package in your project please read the full license first (link below) and review the code for yourself before using.

## License

[BSD-3-Clause](LICENSE)


