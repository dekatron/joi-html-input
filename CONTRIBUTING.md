# Contributing to joi-html-input

Contributions are welcome, if you spot any bugs or security issues please let me know by raising an issue on github or by making a pull request to fix the issue.

## Commit messages

Broadly I follow the angular commit message format the details of which can be found [here](https://github.com/angular/angular.js/blob/master/DEVELOPERS.md#commit-message-format). Basically just write a descriptive commit message that tells me what you're doing and why, additionally please prefix the title with one of the [types](https://github.com/angular/angular.js/blob/master/DEVELOPERS.md#type) listed in the angular commit guidelines.

## Code style

This project is written in TypeScript and uses npm. Style is enforced by ESLint — 2 space indentation, single quotes and no semicolons — so run `npm run lint` (or `npm run lint:fix`) and follow the existing code style and I'll be happy.

## Tests

If you want to contribute to the project please make sure all tests pass before making your pull request on github. If you are adding new functionality please ensure that you have added tests to cover your new feature.

`npm test` runs the whole suite against every supported Joi major, and `npm run verify` runs the lint, typecheck, test and build steps together — that is the same set of checks a pull request needs to pass.
