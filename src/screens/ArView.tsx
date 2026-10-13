// Realidade aumentada: câmara traseira, bússola e GPS. Diz para onde virar e confirma quando estás virado para o lugar.
// Os conteúdos (animações da Câmara Municipal de Serpa) ainda não estão integrados: o enquadramento já funciona.
import { useEffect, useRef, useState } from 'react'
import { Icon } from '../ui/Icon'
import { useArView, arView } from '../lib/celebrate'
import { useRecorder, recorder } from '../lib/recorder'
import { poiById } from '../data/catalog'
import { arByPoi } from '../data/ar'
import { km, fmtDist } from '../lib/geo'
import { bearing } from '../lib/sim'

type OrientationCtor = { requestPermission?: () => Promise<'granted' | 'denied'> }

// no iPhone a bússola só dá valores depois de autorizada, e o pedido tem de nascer de um toque
export async function requestCompass() {
  const D = (window as unknown as { DeviceOrientationEvent?: OrientationCtor }).DeviceOrientationEvent
  if (D && typeof D.requestPermission === 'function') {
    try {
      await D.requestPermission()
    } catch {
      /* recusado: a câmara abre na mesma, sem bússola */
    }
  }
}

export function ArView() {
  const id = useArView()
  if (!id) return null
  return <ArInner id={id} />
}

function screenAngle() {
  const a = screen.orientation?.angle ?? (window as unknown as { orientation?: number }).orientation ?? 0
  return typeof a === 'number' ? a : 0
}

function ArInner({ id }: { id: string }) {
  const poi = poiById(id)!
  const spot = arByPoi(id)
  const rec = useRecorder()
  const video = useRef<HTMLVideoElement>(null)
  const [cam, setCam] = useState<'loading' | 'on' | 'off'>('loading')
  const [heading, setHeading] = useState<number | null>(null)
  const smooth = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    recorder.watch()
    let stream: MediaStream | null = null
    let alive = true
    if (!navigator.mediaDevices?.getUserMedia) setCam('off')
    else
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
        .then((s) => {
          if (!alive) {
            s.getTracks().forEach((t) => t.stop())
            return
          }
          stream = s
          if (video.current) {
            video.current.srcObject = s
            video.current.play().catch(() => {})
          }
          setCam('on')
        })
        .catch(() => setCam('off'))
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && arView.close()
    window.addEventListener('keydown', onKey)
    return () => {
      alive = false
      stream?.getTracks().forEach((t) => t.stop())
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  useEffect(() => {
    let last = 0
    const on = (e: DeviceOrientationEvent & { webkitCompassHeading?: number }) => {
      let h: number | null = null
      if (typeof e.webkitCompassHeading === 'number' && !Number.isNaN(e.webkitCompassHeading)) h = e.webkitCompassHeading
      else if (e.absolute && e.alpha !== null) h = (360 - e.alpha) % 360
      if (h === null) return
      h = (h + screenAngle()) % 360
      // média circular para a seta não tremer
      const r = (h * Math.PI) / 180
      const p = smooth.current ?? { x: Math.cos(r), y: Math.sin(r) }
      p.x = p.x * 0.8 + Math.cos(r) * 0.2
      p.y = p.y * 0.8 + Math.sin(r) * 0.2
      smooth.current = p
      const now = performance.now()
      if (now - last > 90) {
        last = now
        setHeading(((Math.atan2(p.y, p.x) * 180) / Math.PI + 360) % 360)
      }
    }
    window.addEventListener('deviceorientationabsolute', on as EventListener)
    window.addEventListener('deviceorientation', on as EventListener)
    return () => {
      window.removeEventListener('deviceorientationabsolute', on as EventListener)
      window.removeEventListener('deviceorientation', on as EventListener)
    }
  }, [])

  const pos = rec.pos && !rec.sim ? rec.pos : null
  const d = pos ? km(pos, poi) * 1000 : null
  const target = pos ? bearing([pos.lon, pos.lat], [poi.lon, poi.lat]) : null
  const delta = heading !== null && target !== null ? ((target - heading + 540) % 360) - 180 : null
  const far = d !== null && d > 600
  const aligned = delta !== null && Math.abs(delta) < 14 && !far

  let status: string
  if (!pos) status = 'A procurar a tua posição…'
  else if (far) status = `Estás a ${fmtDist(d! / 1000)} de ${poi.name}. A câmara funciona junto ao lugar.`
  else if (heading === null) status = `Este aparelho não dá a bússola. Aponta para ${poi.name}, a ${fmtDist(d! / 1000)}.`
  else if (aligned) status = `Estás virado para ${poi.name}, a ${fmtDist(d! / 1000)}.`
  else status = `Vira ${Math.round(Math.abs(delta!))}° para a ${delta! > 0 ? 'direita' : 'esquerda'}.`

  return (
    <div className="ar" role="dialog" aria-modal="true" aria-label={`Realidade aumentada: ${poi.name}`}>
      <video ref={video} playsInline muted autoPlay />
      {cam === 'off' && <p className="ar-nocam">Sem acesso à câmara. Dá autorização nas definições do browser para ver o lugar através do telemóvel.</p>}
      <div className="ar-top">
        <span className="pill sim">Realidade aumentada</span>
        <button className="iconbtn" onClick={() => arView.close()} aria-label="Fechar a câmara">
          <Icon name="fechar" />
        </button>
      </div>
      <div className={`ar-reticle${aligned ? ' on' : ''}`} aria-hidden="true">
        {aligned && <span className="ar-slot">A animação da Câmara entra aqui</span>}
      </div>
      {delta !== null && !aligned && !far && (
        <div className="ar-arrow" style={{ transform: `translateX(-50%) rotate(${Math.max(-90, Math.min(90, delta))}deg)` }} aria-hidden="true">
          <Icon name="seta" size={34} stroke={2.6} style={{ transform: 'rotate(-90deg)' }} />
        </div>
      )}
      <p className="ar-dir" aria-live="polite">
        {status}
      </p>
      <div className="ar-card">
        <b className="t-sub">{spot?.title ?? poi.name}</b>
        <p className="t-small">{spot?.aim}</p>
        {aligned && spot && <p className="t-small">{spot.shows}</p>}
        <p className="note">Roteiro de realidade aumentada da Câmara Municipal de Serpa, por integrar no Rasto.</p>
      </div>
    </div>
  )
}
