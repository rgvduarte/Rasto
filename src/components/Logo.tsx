// Marca do Rasto: um rasto de passos (pontos) que acaba num lugar (o ponto ocre).
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#15130f" />
      <path d="M7 23c3-1 4-4 6-7s5-5 9-5" fill="none" stroke="#faf8f3" strokeWidth="2.4" strokeLinecap="round" strokeDasharray="0.1 4.2" />
      <circle cx="24" cy="10.6" r="3.2" fill="#c48a12" />
    </svg>
  )
}
