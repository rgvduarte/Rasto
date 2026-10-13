// Depois do build:
//  - .nojekyll: o GitHub Pages ignora pastas começadas por _ sem este ficheiro; e as tiles não precisam do Jekyll.
//  - data/offline-index.json: lista de tudo o que o mapa precisa sem rede (tiles, glifos, dados), para o "Mapa sem rede" do Perfil.
import { writeFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const dist = fileURLToPath(new URL('../dist/', import.meta.url))
writeFileSync(join(dist, '.nojekyll'), '')

const files = []
let bytes = 0
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) walk(p)
    else {
      if (name === 'offline-index.json') continue
      files.push(relative(dist, p).split('/').map(encodeURIComponent).join('/'))
      bytes += st.size
    }
  }
}
for (const d of ['tiles', 'glyphs', 'data']) walk(join(dist, d))
files.sort()
writeFileSync(join(dist, 'data', 'offline-index.json'), JSON.stringify({ files, bytes }))
console.log(`offline-index: ${files.length} ficheiros, ${(bytes / 1e6).toFixed(1)} MB`)
