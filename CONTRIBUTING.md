# Contributing to joi-html-input

Contributions are welcome. If you spot a bug, please raise an issue on GitHub or open a pull request to fix it.

**Please don't open a public issue for a security vulnerability.** Report it privately through [GitHub's private vulnerability reporting](https://github.com/dekatron/joi-html-input/security/advisories/new) instead, so there is a chance to get a fix released before the details are public.

## AI generated contributions

Contributions written with AI assistance are welcome — use whatever tools work for you. The bar is exactly the same as for anything else: the code should be well written, match the existing style, and be developed test first as described under [Tests](#tests).

Coding assistants are particularly prone to writing the implementation and then a test that agrees with it, so this is the part most worth holding them to.

What I do ask is that a human has read and understood the change before the pull request goes up. Review it the way you would review someone else's work — check that it does what the commit message says, that the tests fail when the behaviour is broken rather than merely passing alongside it, and that you could explain any line of it if asked. If you wouldn't be comfortable defending it in review, it isn't ready.

That matters more than usual here. This is a sanitization library, so a plausible looking change that quietly widens what gets through is worse than no change at all.

## Getting started

The repo uses npm, and the toolchain targets the latest Node LTS — `.nvmrc` has the version, so `nvm use` will put you on it.

```console
$ npm install
$ npm test        # the whole suite, against every supported Joi major
$ npm run lint    # npm run lint:fix to autofix
$ npm run typecheck
$ npm run build
$ npm run verify  # all of the above, in one go
```

`npm run verify` is the same set of checks a pull request needs to pass, so running it before you push is the quickest way to know you're green.

## Code style

This project is written in TypeScript. Style is enforced by ESLint — 2 space indentation, single quotes and no semicolons — so run `npm run lint` (or `npm run lint:fix`) and follow the existing code style and I'll be happy.

## Tests

Please write the test first.

Test driven development is the expectation here, not just a preference. The loop is the usual one:

1. **Red** — write a test for the behaviour you want and watch it fail. Run `npm test` and read the failure; it should fail for the reason you expect, not because of a typo or a missing import.
2. **Green** — write the smallest change that makes it pass.
3. **Refactor** — tidy up with the test still passing.

The reason I care about the order is that a test written after the code has already been seen to work tends to assert what the code *does* rather than what it *should do*, and it never gets the one moment that proves it can fail. That produces tests which pass whatever happens. This repo has shipped one: the v2 suite had a test named `should enforce a maximum using byte count` that called `displayLength` instead of `displayMax`. It passed for years without ever exercising the rule in its name.

If you genuinely cannot write the test first — you are pinning down behaviour that already exists, say, or reproducing a bug you do not yet understand — then break the finished code afterwards and check the test fails. A test you have never seen fail is not yet evidence of anything.

Please make sure all tests pass before making your pull request on GitHub.

A few things worth knowing about the suite:

- Every test runs once per supported Joi major. Joi 18 is the normal `joi` devDependency and Joi 17 is installed alongside it under the `joi-v17` alias, so a single `npm test` covers both.
- `test/security.spec.ts` pins the sanitization guarantees the package makes **and** the places where it deliberately makes none — for example that `displayMax()` returns the value unchanged. If a change makes one of those non-guarantees into a guarantee that is welcome, but please update the test so it stays a deliberate decision rather than a silent drift.
- Builds are checked with [publint](https://publint.dev) and [Are the Types Wrong?](https://arethetypeswrong.github.io), so packaging mistakes fail the build rather than a release.

## Commit messages

This project follows [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/):

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

Use `feat:` when you add a feature and `fix:` when you patch a bug — those two are the ones that drive minor and patch version bumps. Otherwise use whichever of `build:`, `chore:`, `ci:`, `docs:`, `perf:`, `refactor:`, `style:` or `test:` fits best. A scope is optional and goes in parentheses after the type.

Mark a breaking change either with a `!` before the colon or with a `BREAKING CHANGE:` footer, which has to be in capitals. Either one means the next release is a major.

```
docs: fix typo in displayMax example

fix(allowedTags): reject misspelled sanitize-html options

feat!: require joi 18

feat: drop support for node 16

BREAKING CHANGE: the minimum supported node version is now 22.12
```

Past that, just write a descriptive message that tells me what you're doing and why.

## Dependency versions pinned on purpose

Some versions are held back deliberately and shouldn't be bumped without checking:

- **`typescript` is held at 6.x** because `typescript-eslint` does not yet support TypeScript 7. Bump both together once it does.
- **`@types/node` is held at 22.x** to match the minimum supported Node version, so the typecheck catches accidental use of newer APIs.
- **`joi-v17`** intentionally tracks Joi 17 for the compatibility test run.
