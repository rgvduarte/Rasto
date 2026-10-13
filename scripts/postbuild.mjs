// O GitHub Pages ignora pastas começadas por _ sem este ficheiro; e as tiles não precisam do Jekyll.
import { writeFileSync } from 'node:fs'
writeFileSync(new URL('../dist/.nojekyll', import.meta.url), '')
