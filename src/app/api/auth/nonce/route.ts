import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/auth/nonce
 *
 * Step 1 of Phantom wallet sign-in. The game sends its wallet pubkey; we reply
 * with a nonce message for the wallet to sign with `signMessage`. The signature
 * is verified in /api/auth/verify.
 *
 * In production this would store the nonce in a DB/session with a TTL. For this
 * sandbox build we return a deterministic message that /verify can re-derive,
 * which is enough to prove wallet ownership without extra infrastructure.
 */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as { pubkey?: string }));
    const pubkey = String(body.pubkey || "").trim();
    if (!pubkey || pubkey.length < 16) {
      return NextResponse.json(
        { ok: false, error: "Missing or invalid pubkey" },
        { status: 400 },
      );
    }
    // Build a nonce message. Including a timestamp + pubkey means each session
    // gets a fresh message (replay protection: the verifier checks the timestamp
    // is recent). The game signs this exact string with Phantom's signMessage.
    const ts = Date.now();
    const message = `DITCOIN SOLANA EMPIRE sign-in\nWallet: ${pubkey}\nTime: ${ts}\n\nThis request proves you own this wallet. No transaction is made.`;
    return NextResponse.json({ ok: true, message, ts });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request body" },
      { status: 400 },
    );
  }
}
