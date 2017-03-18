const htmlInput = require('../lib/index.js');
const Joi = require('joi').extend(htmlInput);
const expect = require('chai').expect;

describe('Joi.htmlInput', function() {
  describe('Joi.htmlInput.allowedTags', function() {
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

    it('should not strip allowed tags', function() {
      const htmlString = '<p>This is a <span>string</span></p>';
      const joiSchema = Joi.htmlInput().allowedTags(sanitizeConfig);
      const joiValidation = Joi.validate(htmlString, joiSchema);

      expect(joiValidation.error).to.be.null;
      expect(joiValidation.value).to.be.equal(htmlString);
    });

    it('should strip any other tags', function() {
      const dirtyHtmlString = '<div><p>This is <span>bad</span><script>alert(\'hiya\')</script></p></div>';
      const joiSchema = Joi.htmlInput().allowedTags(sanitizeConfig);
      const joiValidation = Joi.validate(dirtyHtmlString, joiSchema);
      const cleanHtmlString = '<p>This is <span>bad</span></p>';

      expect(joiValidation.error).to.be.null;
      expect(joiValidation.value).to.be.equal(cleanHtmlString);
    });

    it('should not strip allowed attributes', function() {
      const htmlString = '<p>This is a <span style="color: red;">string</span></p>';
      const joiSchema = Joi.htmlInput().allowedTags(sanitizeConfig);
      const joiValidation = Joi.validate(htmlString, joiSchema);

      expect(joiValidation.error).to.be.null;
      expect(joiValidation.value).to.be.equal(htmlString);
    });

    it('should strip any other attributes', function() {
      const dirtyHtmlString = '<p id="test">This is a <span class="italic" style="color: red;">string</span></p>';
      const joiSchema = Joi.htmlInput().allowedTags(sanitizeConfig);
      const joiValidation = Joi.validate(dirtyHtmlString, joiSchema);
      const cleanHtmlString = '<p>This is a <span style="color: red;">string</span></p>';

      expect(joiValidation.error).to.be.null;
      expect(joiValidation.value).to.be.equal(cleanHtmlString);
    });

    it('should strip tags based on defaults if no parameters are provided', function() {
      const htmlString = '<p>This is a <span>string</span><script>alert(\'test\')</script></p>';
      const joiSchema = Joi.htmlInput().allowedTags();
      const joiValidation = Joi.validate(htmlString, joiSchema);
      const cleanHtmlString = '<p>This is a string</p>';

      expect(joiValidation.error).to.be.null;
      expect(joiValidation.value).to.be.equal(cleanHtmlString);
    });
  });

  describe('Joi.htmlInput.displayLength', function() {
    it('should accept strings matching the desired length', function() {
      const htmlString = '<p>This is an <span style="color: red;">html string</span></p>';
      const joiSchema = Joi.htmlInput().displayLength(22);
      const joiValidation = Joi.validate(htmlString, joiSchema);

      expect(joiValidation.error).to.be.null;
      expect(joiValidation.value).to.be.equal(htmlString);
    });

    it('should reject strings that are less than the desired length', function() {
      const htmlString = '<p>This is an <span style="color: red;">html string</span></p>';
      const joiSchema = Joi.htmlInput().displayLength(23);
      const joiValidation = Joi.validate(htmlString, joiSchema);
      const joiErrorMsg = '"value" Must be exactly 23 characters long but it was actually 22 characters long';

      expect(joiValidation.error).to.not.be.null;
      expect(joiValidation.error.details.pop().message).to.be.equal(joiErrorMsg);
      expect(joiValidation.value).to.be.equal(htmlString);
    });

    it('should reject strings that are greater than the desired length', function() {
      const htmlString = '<p>This is an <span style="color: red;">html string</span></p>';
      const joiSchema = Joi.htmlInput().displayLength(21);
      const joiValidation = Joi.validate(htmlString, joiSchema);
      const joiErrorMsg = '"value" Must be exactly 21 characters long but it was actually 22 characters long';

      expect(joiValidation.error).to.not.be.null;
      expect(joiValidation.error.details.pop().message).to.be.equal(joiErrorMsg);
      expect(joiValidation.value).to.be.equal(htmlString);
    });

    it('should account for html entities', function() {
      const htmlString = '<p>This&nbsp;is&nbsp;an&nbsp;<span style="color: red;">html&nbsp;string</span></p>';
      const joiSchema = Joi.htmlInput().displayLength(22);
      const joiValidation = Joi.validate(htmlString, joiSchema);

      expect(joiValidation.error).to.be.null;
      expect(joiValidation.value).to.be.equal(htmlString);
    })
  });

  describe('Joi.htmlInput.displayMin', function() {
    it('should accept strings matching the desired length', function() {
      const htmlString = '<p>This is an <span style="color: red;">html string</span></p>';
      const joiSchema = Joi.htmlInput().displayMin(22);
      const joiValidation = Joi.validate(htmlString, joiSchema);

      expect(joiValidation.error).to.be.null;
      expect(joiValidation.value).to.be.equal(htmlString);
    });

    it('should reject strings that are less than the desired length', function() {
      const htmlString = '<p>This is an <span style="color: red;">html string</span></p>';
      const joiSchema = Joi.htmlInput().displayMin(23);
      const joiValidation = Joi.validate(htmlString, joiSchema);
      const joiErrorMsg = '"value" Must be a minimum of 23 characters long but it was actually 22 characters long';

      expect(joiValidation.error).to.not.be.null;
      expect(joiValidation.error.details.pop().message).to.be.equal(joiErrorMsg);
      expect(joiValidation.value).to.be.equal(htmlString);
    });

    it('should accept strings that are greater than the desired length', function() {
      const htmlString = '<p>This is an <span style="color: red;">html string</span></p>';
      const joiSchema = Joi.htmlInput().displayMin(21);
      const joiValidation = Joi.validate(htmlString, joiSchema);

      expect(joiValidation.error).to.be.null;
      expect(joiValidation.value).to.be.equal(htmlString);
    });

    it('should account for html entities', function() {
      const htmlString = '<p>This&nbsp;is&nbsp;an&nbsp;<span style="color: red;">html&nbsp;string</span></p>';
      const joiSchema = Joi.htmlInput().displayMin(23);
      const joiValidation = Joi.validate(htmlString, joiSchema);
      const joiErrorMsg = '"value" Must be a minimum of 23 characters long but it was actually 22 characters long';

      expect(joiValidation.error).to.not.be.null;
      expect(joiValidation.error.details.pop().message).to.be.equal(joiErrorMsg);
      expect(joiValidation.value).to.be.equal(htmlString);
    })
  });

  describe('Joi.htmlInput.displayMax', function() {
    it('should accept strings matching the desired length', function() {
      const htmlString = '<p>This is an <span style="color: red;">html string</span></p>';
      const joiSchema = Joi.htmlInput().displayMax(22);
      const joiValidation = Joi.validate(htmlString, joiSchema);

      expect(joiValidation.error).to.be.null;
      expect(joiValidation.value).to.be.equal(htmlString);
    });

    it('should accept strings that are less than the desired length', function() {
      const htmlString = '<p>This is an <span style="color: red;">html string</span></p>';
      const joiSchema = Joi.htmlInput().displayMax(23);
      const joiValidation = Joi.validate(htmlString, joiSchema);

      expect(joiValidation.error).to.be.null;
      expect(joiValidation.value).to.be.equal(htmlString);
    });

    it('should reject strings that are greater than the desired length', function() {
      const htmlString = '<p>This is an <span style="color: red;">html string</span></p>';
      const joiSchema = Joi.htmlInput().displayMax(21);
      const joiValidation = Joi.validate(htmlString, joiSchema);
      const joiErrorMsg = '"value" Must be a maximum of 21 characters long but it was actually 22 characters long';

      expect(joiValidation.error).to.not.be.null;
      expect(joiValidation.error.details.pop().message).to.be.equal(joiErrorMsg);
      expect(joiValidation.value).to.be.equal(htmlString);
    });

    it('should account for html entities', function() {
      const htmlString = '<p>This&nbsp;is&nbsp;an&nbsp;<span style="color: red;">html&nbsp;string</span></p>';
      const joiSchema = Joi.htmlInput().displayMax(22);
      const joiValidation = Joi.validate(htmlString, joiSchema);

      expect(joiValidation.error).to.be.null;
      expect(joiValidation.value).to.be.equal(htmlString);
    })
  });
});
