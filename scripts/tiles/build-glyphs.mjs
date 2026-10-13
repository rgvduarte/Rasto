// Gera os glifos do mapa (public/glyphs/<fontstack>/<range>.pbf) a partir da Archivo, a letra da interface.
// Assim o mapa não depende de nenhum servidor de fontes.
import { buildFonts } from 'maplibre-font-maker-node'
import { fileURLToPath } from 'node:url'
import { rmSync } from 'node:fs'

const files = new URL('../../node_modules/@fontsource-variable/archivo/files/', import.meta.url)
const normal = fileURLToPath(new URL('archivo-latin-standard-normal.woff2', files))
const italic = fileURLToPath(new URL('archivo-latin-standard-italic.woff2', files))
const out = fileURLToPath(new URL('../../public/glyphs', import.meta.url))
rmSync(out, { recursive: true, force: true })

await buildFonts({
  output: out,
  fontstacks: [
    { font: normal, fontstack: 'Archivo Regular', ranges: 'latin', axes: { wght: 420, wdth: 100 } },
    { font: normal, fontstack: 'Archivo Medium', ranges: 'latin', axes: { wght: 580, wdth: 100 } },
    { font: normal, fontstack: 'Archivo Bold', ranges: 'latin', axes: { wght: 760, wdth: 100 } },
    { font: normal, fontstack: 'Archivo Condensed Bold', ranges: 'latin', axes: { wght: 800, wdth: 75 } },
    { font: italic, fontstack: 'Archivo Italic', ranges: 'latin', axes: { wght: 480, wdth: 100 } },
  ],
})
