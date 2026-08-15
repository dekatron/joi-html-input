import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  platform: 'node',
  target: 'node22.12',
  dts: true,
  clean: true,
  sourcemap: true,
  // joi is a peer dependency — always resolve to the consumer's copy so that
  // `instanceof` checks and extension registration work against one instance.
  deps: { neverBundle: ['joi'] },
  // Validate the published package shape (exports map, types resolution)
  // on every build rather than finding out after a release.
  publint: true,
  attw: true,
  // The entry deliberately exposes `htmlInput` alongside a default export, so
  // opt in to named CJS exports rather than letting rolldown guess (and warn).
  outputOptions: { exports: 'named' },
})
