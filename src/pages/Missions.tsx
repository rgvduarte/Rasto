import { useState } from 'react'
import { Glyph } from '../components/Glyph'
import { COLLECTIONS, MISSIONS } from '../data/missions'
import { poiById } from '../data/catalog'
import { useGame, store, xpOf, levelOf, collectionProgress, freguesiaProgress } from '../lib/store'
import { href } from '../lib/router'
import { fmtInt } from '../lib/geo'

// Exemplo para apresentar o ranking: equipas fictícias, só visíveis no modo de demonstração e marcadas como tal.
const EXAMPLE_CREWS = [
  { crew: 'Exemplo · Equipa A', xp: 2840 },
  { crew: 'Exemplo · Equipa B', xp: 1910 },
  { crew: 'Exemplo · Equipa C', xp: 760 },
]

export function Missions() {
  const game = useGame()
  const xp = xpOf(game)
  const lvl = levelOf(xp.total)
  const colls = collectionProgress(game)
  const fregs = freguesiaProgress(game)
  const explored = fregs.filter((f) => f.explored).length
  const [name, setName] = useState(game.name)
  const [crew, setCrew] = useState(game.crew)
  const doneCount = Object.keys(game.done).length

  const ranking = [...(game.demo ? EXAMPLE_CREWS : []), { crew: game.crew || game.name || 'A tua equipa', xp: xp.total, me: true }].sort(
    (a, b) => b.xp - a.xp,
  )

  return (
    <>
      <section className="sec tight">
        <div className="wrap stack-l">
          <div className="stack">
            <p className="eyebrow">Missões em Serpa</p>
            <h1 className="h2">
              {doneCount ? `${doneCount} de ${MISSIONS.length} missões feitas.` : `${MISSIONS.length} missões, em ${COLLECTIONS.length} coleções.`}
            </h1>
          </div>
          <div className="score">
            <div className="card stack">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="eyebrow" style={{ margin: 0 }}>
                  Nível {lvl.level}
                </span>
                <span className="small muted num">
                  {fmtInt(lvl.into)} / {fmtInt(lvl.need)} XP
                </span>
              </div>
              <p style={{ fontSize: 44, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1 }} className="num">
                {fmtInt(xp.total)} XP
              </p>
              <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={lvl.need} aria-valuenow={lvl.into} aria-label="Progresso do nível">
                <i style={{ width: `${(lvl.into / lvl.need) * 100}%` }} />
              </div>
              <p className="small muted">
                {fmtInt(xp.base)} XP de missões{xp.bonus ? ` + ${fmtInt(xp.bonus)} de coleções completas` : ''}.
              </p>
            </div>
            <div className="card stack">
              <span className="eyebrow" style={{ margin: 0 }}>
                Freguesias exploradas · {explored} de {fregs.length}
              </span>
              <div className="freg">
                {fregs.map((f) => (
                  <div className="freg-row" key={f.name}>
                    <span>{f.name}</span>
                    <span className="small muted num">
                      {Math.min(f.done, f.need)}/{f.need}
                    </span>
                    <div className="bar">
                      <i style={{ width: `${f.p * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="card stack">
              <span className="eyebrow" style={{ margin: 0 }}>
                Selos
              </span>
              <div className="seals">
                {colls.map((c) => (
                  <div key={c.id} className={`seal${c.complete ? ' on' : ''}`} title={`${c.name}: ${c.done}/${c.goal}`}>
                    {c.seal}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="sec tight" style={{ paddingTop: 0 }}>
        <div className="wrap split wide-r">
          <div className="stack-l">
            <form
              className="card stack"
              onSubmit={(e) => {
                e.preventDefault()
                store.setProfile(name, crew)
              }}
            >
              <h2 className="h3">Quem joga</h2>
              <div className="field">
                <label htmlFor="nm">O teu nome</label>
                <input id="nm" value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" />
              </div>
              <div className="field">
                <label htmlFor="cr">Equipa (quem vem contigo)</label>
                <input id="cr" value={crew} onChange={(e) => setCrew(e.target.value)} placeholder="Ex.: família de quem corre o HELL160" />
              </div>
              <button className="btn small" type="submit">
                Guardar
              </button>
              <p className="small muted">Fica só neste browser. As equipas partilhadas chegam com as contas.</p>
            </form>

            <div className="card stack">
              <h2 className="h3">Ranking</h2>
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Equipa</th>
                    <th className="r">XP</th>
                  </tr>
                </thead>
                <tbody>
                  {ranking.map((r, i) => (
                    <tr key={r.crew + i} className={'me' in r ? 'me' : ''}>
                      <td className="num">{i + 1}</td>
                      <td>{r.crew}</td>
                      <td className="r">{fmtInt(r.xp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="small muted">
                {game.demo
                  ? 'As equipas “Exemplo” são fictícias, para mostrar o ranking. Desligam-se com o modo de demonstração.'
                  : 'O ranking entre equipas precisa de servidor. Nesta versão só aparece o teu progresso.'}
              </p>
            </div>

            <div className="card stack">
              <h2 className="h3">Modo de demonstração</h2>
              <label className="switch">
                <input type="checkbox" checked={game.demo} onChange={(e) => store.setDemo(e.target.checked)} />
                <span>
                  Para apresentar o protótipo longe de Serpa: as missões de GPS marcam-se sem localização e o código dos parceiros é
                  <b> SERPA</b>. Tudo o que se faz assim fica marcado como demonstração.
                </span>
              </label>
              {doneCount > 0 && (
                <button
                  className="btn ghost small"
                  onClick={() => {
                    if (confirm('Apagar todo o progresso deste browser?')) store.reset()
                  }}
                >
                  Apagar o progresso
                </button>
              )}
            </div>
          </div>

          <div>
            {colls.map((c) => (
              <section className="coll" key={c.id} aria-labelledby={`c-${c.id}`}>
                <div className="coll-head">
                  <h2 className="h3" id={`c-${c.id}`}>
                    {c.name}
                  </h2>
                  <span className={`tag ${c.complete ? 'done' : 'xp'}`}>
                    {c.complete ? `Selo ${c.seal} · +${c.bonus} XP` : `${c.done} de ${c.goal} para o selo · +${c.bonus} XP`}
                  </span>
                </div>
                <p className="muted" style={{ marginTop: 6 }}>
                  {COLLECTIONS.find((x) => x.id === c.id)?.lede}
                </p>
                <ul className="mlist">
                  {MISSIONS.filter((m) => m.collection === c.id).map((m) => {
                    const p = poiById(m.poi)!
                    const d = game.done[m.id]
                    return (
                      <li key={m.id}>
                        <a href={href('/mapa', { p: p.id })}>
                          <Glyph sub={p.sub} fam={p.fam} done={!!d} />
                          <span>
                            <span className="t">{m.title}</span>
                            <span className="b" style={{ display: 'block' }}>
                              {p.name} · {p.place} · {m.check === 'gps' ? 'localização' : 'código do parceiro'}
                            </span>
                          </span>
                          {d ? <span className="tag done">feita</span> : <span className="tag xp">+{m.xp}</span>}
                        </a>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
