import baseJoi18 from 'joi'
import baseJoi17 from 'joi-v17'

import { htmlInput, type HtmlInputRoot } from '../src/index.js'

/**
 * The package supports every currently supported Joi major. Both are installed
 * side by side — `joi-v17` is an npm alias for `joi@^17` — so a single
 * `npm test` exercises the suite against each of them.
 *
 * Joi 17 and Joi 18 ship independent copies of their type definitions. The
 * extension is typed against the dev copy (18), so applying it to the v17 root
 * needs a cast; the runtime extension API is identical across both majors,
 * which is exactly what these tests are here to prove.
 */
const extend = (base: unknown): HtmlInputRoot =>
  (base as HtmlInputRoot).extend(htmlInput) as HtmlInputRoot

export interface JoiVersion {
  name: string
  Joi: HtmlInputRoot
}

export const joiVersions: JoiVersion[] = [
  { name: `joi ${baseJoi17.version}`, Joi: extend(baseJoi17) },
  { name: `joi ${baseJoi18.version}`, Joi: extend(baseJoi18) },
]
