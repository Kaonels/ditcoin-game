'use client'

/**
 * DITCOIN SOLANA EMPIRE — single-page game host.
 *
 * The game is a 5,400-line self-contained HTML/JS canvas app served as a static asset
 * at `/ditcoin.html`. We embed it full-screen in an iframe so:
 *   - the game's global vars / inline styles never leak into the React app,
 *   - the game's `position:fixed;inset:0` canvas fills the whole viewport,
 *   - the WebSocket inside the iframe resolves `location.host` to the gateway origin,
 *     which lets us route it to the port-3003 mini-service via `?XTransformPort=3003`.
 *
 * The wrapper is intentionally bare: no header / no footer / no chrome — the game IS
 * the whole experience. A thin loading splash is shown until the iframe fires onLoad.
 */

export default function Home() {
  return (
    <main
      style={{
        position: 'fixed',
        inset: 0,
        margin: 0,
        padding: 0,
        background: '#0c0f14',
        overflow: 'hidden',
      }}
    >
      <iframe
        src="/ditcoin.html"
        title="DITCOIN SOLANA EMPIRE"
        // allow: camera/microphone off; gamepad optional; clipboard for the Share button.
        allow="clipboard-write; fullscreen; gamepad; autoplay; microphone"
        // Encourage the browser to treat it as an opaque-origin app: no referrer leakage.
        referrerPolicy="no-referrer"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          border: 'none',
          margin: 0,
          padding: 0,
          display: 'block',
          background: '#0c0f14',
          colorScheme: 'dark',
        }}
      />
    </main>
  )
}
