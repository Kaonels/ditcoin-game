/**
 * DITCOIN SOLANA EMPIRE — realtime multiplayer relay (WebSocket mini-service).
 *
 * Runs on port 3003. The Next.js page connects to it through the Caddy gateway:
 *     ws(s)://<gateway-host>/?XTransformPort=3003
 *
 * Protocol (matches the game client exactly):
 *   client -> server: {t:'join', name, pub, x, y, spec, look}
 *                  {t:'pos',  x, y, px, py, emote, spec, look}
 *                  {t:'chat', text}
 *   server -> client: {t:'welcome', id}
 *                  {t:'state', count, watching, players:[...]}
 *                  {t:'chat', name, text}
 *
 * Pure relay: no DB, no auth, no persistence. Players are identified by the socket id.
 * Broadcasts the full world state at 5 Hz so every player sees every other player.
 */

const PORT = 3003;

// Each connected socket owns a player record stored in ws.data.player.
interface PlayerState {
  id: string;
  name: string;
  x: number;
  y: number;
  px: number;
  py: number;
  emote: string | null;
  spec: boolean;
  look: Record<string, unknown>;
}

let nextId = 1;
const players = new Map<WebSocket, PlayerState>();

// Sanity cap so a runaway client can't OOM the server with 1M tiny chat messages.
const MAX_CHAT_LEN = 160;
// 5 Hz world sync — same cadence as the original server.js.
const SYNC_HZ = 5;

function broadcast() {
  const list = Array.from(players.values());
  const playing = list.filter((p) => !p.spec).length; // real players
  const watching = list.filter((p) => p.spec).length; // guest spectators
  const msg = JSON.stringify({
    t: 'state',
    count: playing,
    watching,
    players: list,
  });
  for (const ws of players.keys()) {
    try {
      ws.send(msg);
    } catch {
      /* socket already dead — ignore */
    }
  }
}

setInterval(broadcast, 1000 / SYNC_HZ);

const server = Bun.serve({
  port: PORT,
  // CRITICAL: bind to IPv6 '::' so dual-stack also covers IPv4. In this sandbox
  // `localhost` resolves to ::1 (IPv6 only), so a server on 0.0.0.0 (IPv4) is
  // unreachable via the Caddy gateway's `reverse_proxy localhost:{port}`.
  hostname: '::',
  // Allow the Next.js origin (port 3000) and the gateway origin to connect.
  // The game is served from the same gateway so this is mostly permissive.
  websocket: {
    open(ws) {
      const id = String(nextId++);
      const player: PlayerState = {
        id,
        name: 'Player',
        x: 29,
        y: 29,
        px: 0,
        py: 0,
        emote: null,
        spec: false,
        look: {},
      };
      ws.data = player;
      players.set(ws, player);
      try {
        ws.send(JSON.stringify({ t: 'welcome', id }));
      } catch {
        /* ignore */
      }
    },
    message(ws, raw) {
      const p = players.get(ws);
      if (!p) return;
      let m: any;
      try {
        m = JSON.parse(raw.toString());
      } catch {
        return; // malformed frame — ignore
      }
      if (m.t === 'join' || m.t === 'pos') {
        // Copy only whitelisted fields so a client can't inject junk into the world state.
        for (const k of ['name', 'x', 'y', 'px', 'py', 'emote', 'spec', 'look']) {
          if (k in m) (p as any)[k] = m[k];
        }
      } else if (m.t === 'chat') {
        const text = String(m.text || '').slice(0, MAX_CHAT_LEN);
        if (!text) return;
        const cm = JSON.stringify({ t: 'chat', name: p.name, text });
        // Don't echo the message back to the sender — the client already shows its own chat.
        for (const c of players.keys()) {
          if (c !== ws) {
            try {
              c.send(cm);
            } catch {
              /* ignore */
            }
          }
        }
      }
    },
    close(ws) {
      players.delete(ws);
    },
    drain() {
      // Backpressure hook — no-op for this tiny relay.
    },
  },
  fetch(req, server) {
    // Handle the WebSocket upgrade. We MUST call server.upgrade(req) — just returning
    // undefined is NOT enough; Bun would close the socket without sending the 101
    // Switching Protocols handshake, which the client sees as a 1006 abnormal close.
    const success = server.upgrade(req);
    if (success) return undefined as any; // Bun now owns the response (101 Switching Protocols)
    // Plain HTTP hit (health check / curious browser) — return a tiny status JSON.
    return new Response(
      JSON.stringify({
        service: 'ditcoin-ws',
        status: 'ok',
        online: players.size,
        playing: Array.from(players.values()).filter((p) => !p.spec).length,
        watching: Array.from(players.values()).filter((p) => p.spec).length,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  },
});

console.log(`[ditcoin-ws] realtime relay listening on :${server.port}`);

// Graceful shutdown so `bun --hot` reloads don't leak sockets.
process.on('SIGTERM', () => {
  server.stop(true);
  process.exit(0);
});
process.on('SIGINT', () => {
  server.stop(true);
  process.exit(0);
});
