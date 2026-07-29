import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionPubkey } from "../auth/verify/route";

/**
 * GET /api/save
 * Returns the player's cloud save blob (or 404 if none yet).
 *
 * PUT /api/save
 * Upserts the player's cloud save blob. Body: { data: {...} }
 *
 * Both routes authenticate via the ditcoin_session cookie set by /api/auth/verify.
 * If the cookie is missing, we fall back to the `pubkey` query param (so the game
 * works even if cookies are blocked by third-party iframe restrictions).
 */

async function resolvePubkey(req: NextRequest): Promise<string | null> {
  // 1. Try the session cookie.
  const fromCookie = getSessionPubkey(req);
  if (fromCookie) return fromCookie;
  // 2. Fall back to ?pubkey= query param (the game can opt into this).
  const url = new URL(req.url);
  const fromQuery = url.searchParams.get("pubkey");
  if (fromQuery && fromQuery.length >= 16) return fromQuery;
  return null;
}

export async function GET(req: NextRequest) {
  const pubkey = await resolvePubkey(req);
  if (!pubkey) {
    return NextResponse.json(
      { ok: false, error: "Not authenticated" },
      { status: 401 },
    );
  }
  try {
    const row = await db.playerSave.findUnique({ where: { pubkey } });
    if (!row || !row.data) {
      return NextResponse.json({ ok: false, error: "No save found" }, { status: 404 });
    }
    // Parse the stored JSON so the client receives a clean object, not a string.
    let parsed: unknown = null;
    try { parsed = JSON.parse(row.data); } catch { parsed = row.data; }
    return NextResponse.json({ ok: true, data: parsed, name: row.name, level: row.level });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Database error" },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest) {
  const pubkey = await resolvePubkey(req);
  if (!pubkey) {
    return NextResponse.json(
      { ok: false, error: "Not authenticated" },
      { status: 401 },
    );
  }
  try {
    const body = await req.json().catch(() => ({} as { data?: unknown }));
    const data = body.data;
    if (!data || typeof data !== "object") {
      return NextResponse.json(
        { ok: false, error: "Missing data" },
        { status: 400 },
      );
    }
    const dataStr = JSON.stringify(data);
    // Pull a few fields for the leaderboard columns (best-effort extraction).
    const player = (data as { player?: { name?: string; level?: number } }).player;
    const name = player?.name || null;
    const level = typeof player?.level === "number" ? player.level : 1;
    await db.playerSave.upsert({
      where: { pubkey },
      update: { data: dataStr, name, level },
      create: { pubkey, data: dataStr, name, level },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Save failed" },
      { status: 500 },
    );
  }
}
