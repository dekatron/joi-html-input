import { createRequire } from 'module'
import baseJoi from 'joi'
import { htmlInput } from '/home/user/Joi-HTML-Input/dist/index.mjs'
const require = createRequire('/home/user/Joi-HTML-Input/')
const oldExt = require('/home/user/Joi-HTML-Input/old-lib.tmp.cjs')

const NewJoi = baseJoi.extend(htmlInput)
const OldJoi = baseJoi.extend(oldExt)

const payloads = [
  '<script>alert(1)</script>',
  '<img src=x onerror=alert(1)>',
  '<a href="javascript:alert(1)">x</a>',
  '<svg/onload=alert(1)>',
  '<iframe src="https://evil"></iframe>',
  '<p onclick="x">hi</p>',
  '<style>body{}</style>',
  '<noscript><p title="</noscript><img src=x onerror=alert(1)>">',
  '<math><mtext><table><mglyph><style><img src=x onerror=alert(1)>',
  '&lt;script&gt;alert(1)&lt;/script&gt;',
  '<p>&nbsp;&nbsp;text</p>',
  '<div>Test&#x3C;script&#x3E;alert(1)&#x3C;/script&#x3E;</div>',
  '<!--<img src=x onerror=alert(1)>-->',
  '<form><button formaction=javascript:alert(1)>x',
  '<p>a</p><script>/*'.repeat(3),
]
const configs = [undefined, { allowedTags: ['p', 'span', 'a'], allowedAttributes: { a: ['href'] } }, {}]
let diffs = 0
for (const cfg of configs) {
  for (const p of payloads) {
    const a = (cfg === undefined ? OldJoi.htmlInput().allowedTags() : OldJoi.htmlInput().allowedTags(cfg)).validate(p)
    const b = (cfg === undefined ? NewJoi.htmlInput().allowedTags() : NewJoi.htmlInput().allowedTags(cfg)).validate(p)
    if (a.value !== b.value || String(a.error) !== String(b.error)) { diffs++; console.log('DIFF allowedTags', JSON.stringify(cfg), JSON.stringify(p), '\n  old:', JSON.stringify(a.value), '\n  new:', JSON.stringify(b.value)) }
  }
}
for (const p of payloads) {
  for (const n of [1, 5, 50]) {
    for (const rule of ['displayLength', 'displayMin', 'displayMax']) {
      const a = OldJoi.htmlInput()[rule](n).validate(p)
      const b = NewJoi.htmlInput()[rule](n).validate(p)
      if (a.value !== b.value || String(a.error?.message) !== String(b.error?.message)) { diffs++; console.log('DIFF', rule, n, JSON.stringify(p), JSON.stringify(a.error?.message), JSON.stringify(b.error?.message)) }
    }
  }
}
console.log('total diffs:', diffs)
