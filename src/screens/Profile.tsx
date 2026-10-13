// Perfil: a tua personagem, o nível, o território conquistado por freguesia, os selos, os guardados e as definições.
import { useEffect, useState } from 'react'
import { Page } from './Page'
import { Onboarding } from './Onboarding'
import { AvatarDisc, Glyph } from '../ui/bits'
import { Icon } from '../ui/Icon'
import { avatarById, AVATARS } from '../data/avatars'
import { poiById, SUB_LABEL } from '../data/catalog'
import { useGame, store, xpOf, levelOf, collectionProgress, totals } from '../lib/store'
import { loadHexGrid, freguesiaShare, type HexGrid } from '../lib/hex'
import { offlineStatus, downloadMap, clearOffline } from '../lib/offline'
import { useInstall, install, isStandalone, isIOS } from '../lib/install'
import { mapView } from '../lib/mapview'
import { fmtInt } from '../lib/geo'
import { href } from '../lib/router'
import { say } from '../lib/ui'

export function Profile({ narrow }: { narrow: boolean }) {
  const game = useGame()
  const a = avatarById(game.avatar?.kind) ?? AVATARS[0]
  const xp = xpOf(game)
  const lvl = levelOf(xp.total)
  const [grid, setGrid] = useState<HexGrid | null>(null)
  const [edit, setEdit] = useState(false)
  const t = totals(game)
  const colls = collectionProgress(game)
  const sims = game.activities.filter((x) => x.simulated).length

  useEffect(() => {
    loadHexGrid().then(setGrid)
  }, [])
  useEffect(() => {
    mapView.set({ mode: 'review', pois: [], selected: null, cells: 'conquered', track: null, avatar: null, follow: false, pad: narrow ? { top: 0, bottom: 0, left: 0, right: 0 } : { top: 0, bottom: 0, left: 84 + 404, right: 0 } })
  }, [narrow])

  const fregs = grid ? freguesiaShare(grid, game.cells).sort((x, y) => y.p - x.p) : []
  const pct = grid ? (game.cells.length / grid.count) * 100 : 0

  if (edit) return <Onboarding startAt={1} onDone={() => setEdit(false)} />

  return (
    <Page narrow={narrow} title="Perfil">
      <div className="hero-me">
        <AvatarDisc kind={game.avatar?.kind} ring={game.avatar?.ring} size={76} />
        <div>
          <h2 className="t-title">{game.name || 'Sem nome'}</h2>
          <p className="muted t-small">
            {a.name}. {a.bonus}.
          </p>
          <button className="linkbtn" onClick={() => setEdit(true)}>
            Mudar de personagem
          </button>
        </div>
      </div>

      <div className="xp-card">
        <div className="xp-top">
          <span className="t-sub">Nível {lvl.level}</span>
          <span className="num t-small muted">
            {fmtInt(xp.total)} XP, faltam {fmtInt(lvl.need - lvl.into)} para o {lvl.level + 1}
          </span>
        </div>
        <div className="bar">
          <i style={{ width: `${(lvl.into / lvl.need) * 100}%` }} />
        </div>
      </div>

      <div className="kpis">
        <div className="got">
          <b className="t-big num">{pct < 10 ? pct.toLocaleString('pt-PT', { maximumFractionDigits: pct ? 2 : 0 }) : fmtInt(pct)} %</b>
          <span>do concelho</span>
        </div>
        <div>
          <b className="t-big num">{fmtInt(game.cells.length)}</b>
          <span>hexágonos</span>
        </div>
        <div>
          <b className="t-big num">{t.km.toLocaleString('pt-PT', { maximumFractionDigits: 1 })}</b>
          <span>km, {t.n} {t.n === 1 ? 'saída' : 'saídas'}</span>
        </div>
      </div>
      {sims > 0 && (
        <p className="note">
          Inclui {sims} {sims === 1 ? 'atividade simulada' : 'atividades simuladas'}. Para começar do zero, usa Reiniciar no fim desta página.
        </p>
      )}

      <section>
        <h2 className="section-t">Território por freguesia</h2>
        <div className="terr">
          {fregs.map((f) => (
            <div className="terr-row" key={f.name}>
              <span>{f.name}</span>
              <span className="num muted">
                {f.got ? `${(f.p * 100).toLocaleString('pt-PT', { maximumFractionDigits: f.p < 0.1 ? 1 : 0 })} %` : '0 %'}
              </span>
              <div className="bar">
                <i style={{ width: `${Math.max(f.got ? 1.5 : 0, f.p * 100)}%` }} />
              </div>
            </div>
          ))}
          {!grid && <p className="muted t-small">A carregar a grelha…</p>}
        </div>
      </section>

      <section>
        <h2 className="section-t">Selos</h2>
        <div className="seals">
          {colls.map((c) => (
            <span key={c.id} className={`seal${c.complete ? ' on' : ''}`} title={`${c.name}: ${c.done} de ${c.goal}`}>
              {c.seal}
              <small className="num"> {Math.min(c.done, c.goal)}/{c.goal}</small>
            </span>
          ))}
        </div>
      </section>

      {game.saved.length > 0 && (
        <section>
          <h2 className="section-t">Guardados</h2>
          <div className="rows flush">
            {game.saved.map((id) => {
              const p = poiById(id)
              if (!p) return null
              return (
                <a className="row-btn" key={id} href={href('/', { p: id })}>
                  <Glyph sub={p.sub} fam={p.fam} />
                  <span>
                    <span className="row-name">{p.name}</span>
                    <span className="row-meta">{SUB_LABEL[p.sub]}</span>
                  </span>
                  <span className="row-right">
                    {game.ratings[id] ? (
                      <span className="num">
                        {game.ratings[id].stars} <Icon name="estrela" size={14} fill="currentColor" style={{ color: 'var(--ocre)', verticalAlign: '-2px' }} />
                      </span>
                    ) : null}
                  </span>
                </a>
              )
            })}
          </div>
        </section>
      )}

      <section className="settings">
        <h2 className="section-t">Definições</h2>
        <OfflineRow />
        <InstallRow />
        <label className="setting">
          <input type="checkbox" checked={game.demo} onChange={(e) => store.setDemo(e.target.checked)} />
          <span>
            <b>Modo de demonstração</b>
            <br />
            <span className="muted">Para mostrar o Rasto longe de Serpa: as missões marcam-se sem GPS e o código dos parceiros é SERPA. Tudo fica marcado como demonstração.</span>
          </span>
        </label>
        <button
          className="btn line sm"
          onClick={() => {
            if (confirm('Apagar todo o progresso deste telemóvel (missões, território, atividades, guardados)?')) {
              store.reset()
              say('Progresso apagado')
            }
          }}
        >
          Reiniciar o progresso
        </button>
      </section>

      <nav className="linklist" aria-label="Mais">
        <a href={href('/sobre')}>
          Sobre o Rasto, fontes e licenças <Icon name="seta" size={18} />
        </a>
        <a href={href('/eventos')}>
          Eventos no concelho <Icon name="seta" size={18} />
        </a>
        <a href={href('/cartaz')}>
          Cartaz <Icon name="seta" size={18} />
        </a>
      </nav>
      <p className="note">O progresso fica neste telemóvel. Ainda não há contas nem servidor; a tua localização não sai do aparelho.</p>
    </Page>
  )
}

function OfflineRow() {
  const [st, setSt] = useState<{ have: number; total: number; bytes: number } | null>(null)
  const [busy, setBusy] = useState<{ done: number; total: number } | null>(null)
  useEffect(() => {
    offlineStatus().then(setSt)
  }, [])
  if (!st) return null
  const mb = Math.round(st.bytes / 1e6)
  const full = st.have >= st.total
  return (
    <div className="setting">
      <Icon name="offline" size={24} />
      <span style={{ flex: 1 }}>
        <b>Mapa sem rede</b>
        <br />
        <span className="muted">
          {full
            ? `O mapa do concelho está guardado neste telemóvel (${mb} MB). Funciona nos estradões sem rede.`
            : busy
              ? `A guardar… ${Math.round((busy.done / busy.total) * 100)} %`
              : `Guarda o mapa inteiro do concelho (${mb} MB) para usar sem rede.${st.have ? ` Já tens ${Math.round((st.have / st.total) * 100)} %.` : ''}`}
        </span>
        {busy && (
          <span className="bar" style={{ display: 'block', marginTop: 8 }}>
            <i style={{ width: `${(busy.done / busy.total) * 100}%` }} />
          </span>
        )}
      </span>
      {full ? (
        <button
          className="btn soft sm"
          onClick={async () => {
            await clearOffline()
            setSt(await offlineStatus())
          }}
        >
          Apagar
        </button>
      ) : (
        <button
          className="btn anil sm"
          disabled={!!busy}
          onClick={async () => {
            setBusy({ done: st.have, total: st.total })
            try {
              await downloadMap((done, total) => setBusy({ done, total }))
              say('Mapa guardado para usar sem rede')
            } catch {
              say('Não foi possível guardar o mapa')
            }
            setBusy(null)
            setSt(await offlineStatus())
          }}
        >
          Guardar
        </button>
      )}
    </div>
  )
}

function InstallRow() {
  const deferred = useInstall()
  if (isStandalone()) return null
  return (
    <div className="setting">
      <Icon name="instalar" size={24} />
      <span style={{ flex: 1 }}>
        <b>Instalar a app</b>
        <br />
        <span className="muted">
          {deferred
            ? 'Fica no ecrã principal, abre sem a barra do browser e funciona sem rede.'
            : isIOS()
              ? 'No Safari, carrega em Partilhar e depois em Adicionar ao ecrã principal.'
              : 'No menu do browser, escolhe Instalar app ou Adicionar ao ecrã principal.'}
        </span>
      </span>
      {deferred && (
        <button className="btn anil sm" onClick={() => install()}>
          Instalar
        </button>
      )}
    </div>
  )
}
