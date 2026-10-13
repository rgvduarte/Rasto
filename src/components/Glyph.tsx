import { GLYPH, FAMILY_COLOR } from '../map/icons'
import type { Family, Sub } from '../data/types'

export function Glyph({ sub, fam, done = false, size = 34 }: { sub: Sub; fam: Family; done?: boolean; size?: number }) {
  const c = FAMILY_COLOR[fam]
  return (
    <span className={`glyph${done ? ' done' : ''}`} style={{ background: c, color: c, width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 20 20" fill={done ? c : '#fff'}>
        <path d={done ? GLYPH.check : GLYPH[sub]} />
      </svg>
    </span>
  )
}
