// Gera os glifos do mapa (public/glyphs/<fontstack>/<range>.pbf) a partir da Schibsted Grotesk,
// a mesma letra da interface. Assim o mapa não depende de nenhum servidor de fontes.
import { buildFonts } from 'maplibre-font-maker-node'
import { fileURLToPath } from 'node:url'

const files = new URL('../../node_modules/@fontsource-variable/schibsted-grotesk/files/', import.meta.url)
const normal = fileURLToPath(new URL('schibsted-grotesk-latin-wght-normal.woff2', files))
const italic = fileURLToPath(new URL('schibsted-grotesk-latin-wght-italic.woff2', files))

await buildFonts({
  output: fileURLToPath(new URL('../../public/glyphs', import.meta.url)),
  fontstacks: [
    { font: normal, fontstack: 'Schibsted Regular', ranges: 'latin', axes: { wght: 420 } },
    { font: normal, fontstack: 'Schibsted Medium', ranges: 'latin', axes: { wght: 560 } },
    { font: normal, fontstack: 'Schibsted Bold', ranges: 'latin', axes: { wght: 760 } },
    { font: italic, fontstack: 'Schibsted Italic', ranges: 'latin', axes: { wght: 480 } },
  ],
})
