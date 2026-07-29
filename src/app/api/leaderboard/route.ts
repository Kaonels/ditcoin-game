import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/leaderboard
 *
 * Returns the top 20 players by level (desc). Used by the game's leaderboard
 * panel to show real wallet-connected players alongside the simulated ones.
 *
 * Query params:
 *   ?limit=20  — max results (capped at 50)
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") || "20", 10) || 20));
  try {
    // Fetch all rows with data (SQLite doesn't support some Prisma filter syntax
    // for nullable text columns, so we fetch and filter in JS).
    const all = await db.playerSave.findMany({
      orderBy: { level: "desc" },
      take: limit * 2,
      select: { pubkey: true, name: true, level: true, updatedAt: true, data: true },
    });
    const rows = all.filter((r) => r.data != null).slice(0, limit);
    // Mask the pubkey for privacy (only show first 4 + last 4 chars).
    const masked = rows.map((r, i) => ({
      rank: i + 1,
      name: r.name || "Anonymous",
      level: r.level,
      pubkey: r.pubkey.length >= 12
        ? r.pubkey.slice(0, 4) + "…" + r.pubkey.slice(-4)
        : r.pubkey,
      lastSeen: r.updatedAt,
    }));
    return NextResponse.json({ ok: true, players: masked });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Database error" },
      { status: 500 },
    );
  }
}
