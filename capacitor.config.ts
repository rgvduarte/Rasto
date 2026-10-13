// App nativa (Android e iOS) com Capacitor, a partir do mesmo build da web (dist/).
// Passos em README.md, secção "Apps Android e iOS".
import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'pt.rasto.serpa',
  appName: 'Rasto Serpa',
  webDir: 'dist',
  backgroundColor: '#ffffff',
  android: { allowMixedContent: false },
  ios: { contentInset: 'never' },
}

export default config
