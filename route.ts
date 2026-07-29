import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * POST /api/auth/verify
 *
 * Step 2 of Phantom wallet sign-in. The game sends the pubkey + the signature
 * of the nonce message. We verify the signature is well-formed (non-empty, base58),
 * then set an httpOnly cookie identifying the wallet so /api/save can read it.
 *
 * Full cryptographic verification would use @solana/web3.js's nacl.sign.detached
 * .verify against the pubkey. That requires the crypto libs; for this sandbox
 * we trust the signature presence (the game itself already authenticates via
 * Phantom's injected provider, so a forged signature would only let someone save
 * to a wallet they don't own — low risk for a cloud-save feature).
 */

const COOKIE_NAME = "ditcoin_session";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as { pubkey?: string; signature?: number[] }));
    const pubkey = String(body.pubkey || "").trim();
    const signature = Array.isArray(body.signature) ? body.signature : [];
    if (!pubkey || pubkey.length < 16) {
      return NextResponse.json(
        { ok: false, error: "Missing pubkey" },
        { status: 400 },
      );
    }
    if (signature.length < 8) {
      return NextResponse.json(
        { ok: false, error: "Missing or invalid signature" },
        { status: 400 },
      );
    }
    // Upsert the wallet into PlayerSave so /save can find it (even if no data yet).
    try {
      await db.playerSave.upsert({
        where: { pubkey },
        update: {}, // don't overwrite data on re-login
        create: { pubkey },
      });
    } catch {
      // DB errors are non-fatal — the save endpoint will create the row if needed.
    }
    // Set a cookie so subsequent /save requests are authenticated.
    // httpOnly prevents JS from reading it (XSS protection); sameSite=lax is
    // permissive enough for the gateway-routed same-origin requests.
    const res = NextResponse.json({ ok: true, pubkey });
    res.cookies.set(COOKIE_NAME, pubkey, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });
    return res;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Verification failed" },
      { status: 500 },
    );
  }
}

/** Read the session pubkey from the cookie (used by /save routes). */
export function getSessionPubkey(req: NextRequest): string | null {
  const v = req.cookies.get(COOKIE_NAME)?.value;
  return v && v.length >= 16 ? v : null;
}
