// Ecrã de página: inteiro no telemóvel (por cima do mapa), painel à esquerda no ecrã largo (com o mapa ao lado).
import type { ReactNode } from 'react'
import { Icon } from '../ui/Icon'

export function Page({ narrow, title, children, back, aside }: { narrow: boolean; title: string; children: ReactNode; back?: string; aside?: ReactNode }) {
  const head = (
    <header className="page-head">
      {back && (
        <a className="iconbtn soft" href={back} aria-label="Voltar">
          <Icon name="voltar" />
        </a>
      )}
      <h1>{title}</h1>
      {aside && <div className="page-aside">{aside}</div>}
    </header>
  )
  if (narrow)
    return (
      <div className="page-full">
        {head}
        <div className="page-body">{children}</div>
      </div>
    )
  return (
    <aside className="panel">
      <div className="panel-scroll page-pad">
        {head}
        <div className="page-body">{children}</div>
      </div>
    </aside>
  )
}
