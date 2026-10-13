// Entrada no jogo: o que é, quem és no mapa (personagem, cor, nome) e a localização. Três passos, todos saltáveis.
import { useState } from 'react'
import { AVATARS, RINGS, type AvatarKind } from '../data/avatars'
import { useGame, store } from '../lib/store'
import { recorder } from '../lib/recorder'
import { AvatarDisc } from '../ui/bits'

export function Onboarding({ startAt = 0, onDone }: { startAt?: number; onDone?: () => void }) {
  const game = useGame()
  const [step, setStep] = useState(startAt)
  const [kind, setKind] = useState<AvatarKind>(game.avatar?.kind ?? 'andarilho')
  const [ring, setRing] = useState<string>(game.avatar?.ring ?? RINGS[0])
  const [name, setName] = useState(game.name)
  const editing = startAt > 0

  const finish = () => {
    store.setAvatar(kind, ring)
    store.setProfile(name, game.crew)
    store.finishOnboarding()
    onDone?.()
  }

  if (step === 0)
    return (
      <div className="onb onb-intro" role="dialog" aria-modal="true" aria-labelledby="onb-t">
        <div className="onb-card">
          <Dots n={3} at={0} />
          <h1 id="onb-t" className="t-display onb-h">
            Serpa é o tabuleiro.
          </h1>
          <p>
            Anda pelo concelho e o mapa fica teu: cada hexágono por onde passas é conquistado e, se fechares um circuito, o que fica lá dentro também. Nos lugares há
            missões, do castelo às azenhas do Guadiana, das tascas às queijarias.
          </p>
          <div className="onb-actions">
            <button className="btn anil block" onClick={() => setStep(1)}>
              Escolher a personagem
            </button>
            <button
              className="btn soft block"
              onClick={() => {
                store.setAvatar(kind, ring)
                store.finishOnboarding()
                onDone?.()
              }}
            >
              Saltar e ver o mapa
            </button>
          </div>
        </div>
      </div>
    )

  if (step === 1)
    return (
      <div className="onb" role="dialog" aria-modal="true" aria-labelledby="onb-t1">
        <div className="onb-inner">
          {!editing && <Dots n={3} at={1} />}
          <div className="onb-me">
            <AvatarDisc kind={kind} ring={ring} size={64} />
            <h1 id="onb-t1" className="t-title">
              Quem és no mapa?
            </h1>
          </div>
          <div className="persons" role="radiogroup" aria-label="Personagem">
            {AVATARS.map((a) => (
              <button key={a.id} className="person" role="radio" aria-checked={kind === a.id} aria-pressed={kind === a.id} onClick={() => setKind(a.id)} style={{ ['--ring' as string]: ring }}>
                <span className="pd">
                  <svg viewBox="0 0 20 20">
                    <path d={a.glyph} fillRule="evenodd" />
                  </svg>
                </span>
                <b>{a.name}</b>
                <span>{a.line}</span>
                <i>{a.bonus}</i>
              </button>
            ))}
          </div>
          <div className="field">
            <span className="field-l" id="ring-l">
              A cor do teu anel
            </span>
            <div className="rings" role="radiogroup" aria-labelledby="ring-l">
              {RINGS.map((c) => (
                <button key={c} role="radio" aria-checked={ring === c} aria-pressed={ring === c} aria-label={c} style={{ background: c }} onClick={() => setRing(c)} />
              ))}
            </div>
          </div>
          <div className="field">
            <label htmlFor="onb-name">Como te chamamos?</label>
            <input id="onb-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="O teu nome (opcional)" autoComplete="given-name" maxLength={40} />
          </div>
          <div className="onb-actions">
            <button className="btn anil block" onClick={() => (editing ? finish() : setStep(2))}>
              {editing ? 'Guardar' : 'Continuar'}
            </button>
            {editing && (
              <button className="btn soft block" onClick={() => onDone?.()}>
                Cancelar
              </button>
            )}
          </div>
        </div>
      </div>
    )

  return (
    <div className="onb onb-intro" role="dialog" aria-modal="true" aria-labelledby="onb-t2">
      <div className="onb-card">
        <Dots n={3} at={2} />
        <h1 id="onb-t2" className="t-title">
          Joga com o GPS.
        </h1>
        <p>
          O Rasto usa a localização para te pôr no mapa, conquistar o território e confirmar as missões quando lá chegas. Fica tudo neste telemóvel: não há contas nem
          servidor.
        </p>
        <div className="onb-actions">
          <button
            className="btn anil block"
            onClick={() => {
              recorder.watch()
              finish()
            }}
          >
            Usar a localização
          </button>
          <button className="btn soft block" onClick={finish}>
            Agora não
          </button>
        </div>
      </div>
    </div>
  )
}

function Dots({ n, at }: { n: number; at: number }) {
  return (
    <div className="dots" aria-label={`Passo ${at + 1} de ${n}`}>
      {Array.from({ length: n }, (_, i) => (
        <i key={i} className={i <= at ? 'on' : ''} />
      ))}
    </div>
  )
}
