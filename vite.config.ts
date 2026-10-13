import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Publicado em https://rgvduarte.github.io/Rasto/
// base relativa: o site funciona em qualquer caminho (e com qualquer capitalização do nome do repositório),
// porque as rotas são por hash (#/mapa) e os recursos são pedidos a partir da página.
export default defineConfig({
  base: './',
  plugins: [react()],
  worker: { format: 'es' },
  build: { chunkSizeWarningLimit: 1200 },
})
