import { Router } from "express";
import { db } from "@workspace/db";
import { proAccessTokens } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

const router = Router();

const PRO_DAYS = 32;

function adminGuard(req: any, res: any, next: any) {
  const secret = process.env["ADMIN_SECRET"];
  if (!secret) {
    res.status(500).json({ error: "ADMIN_SECRET not configured" });
    return;
  }
  const provided = req.headers["x-admin-secret"];
  if (provided !== secret) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
}

router.get("/tokens/:token/validate", async (req, res) => {
  const { token } = req.params;
  if (!token || token.length < 8) {
    res.json({ valid: false, reason: "invalid_token" });
    return;
  }

  try {
    const [row] = await db
      .select()
      .from(proAccessTokens)
      .where(eq(proAccessTokens.token, token))
      .limit(1);

    if (!row) {
      res.json({ valid: false, reason: "not_found" });
      return;
    }
    if (row.isRevoked) {
      res.json({ valid: false, reason: "revoked" });
      return;
    }

    const now = new Date();
    const expiresAt = new Date(row.expiresAt);
    const isExpired = now > expiresAt;

    const msLeft = expiresAt.getTime() - now.getTime();
    const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));

    res.json({
      valid: !isExpired,
      reason: isExpired ? "expired" : "ok",
      expiresAt: row.expiresAt,
      daysLeft,
      label: row.label,
    });
  } catch (err) {
    res.status(500).json({ valid: false, reason: "error" });
  }
});

router.post("/admin/tokens", adminGuard, async (req: any, res) => {
  const { label = "", days = PRO_DAYS } = req.body ?? {};

  const token = randomUUID();
  const expiresAt = new Date(Date.now() + Number(days) * 24 * 60 * 60 * 1000);

  try {
    const [row] = await db
      .insert(proAccessTokens)
      .values({ token, label: String(label), expiresAt })
      .returning();

    const baseUrl = process.env["REPLIT_DOMAINS"]
      ? `https://${process.env["REPLIT_DOMAINS"].split(",")[0]}`
      : `http://localhost:${process.env["PORT"] ?? 3000}`;

    res.json({
      id: row.id,
      token: row.token,
      label: row.label,
      expiresAt: row.expiresAt,
      url: `${baseUrl}?token=${row.token}`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/admin/tokens", adminGuard, async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(proAccessTokens)
      .orderBy(desc(proAccessTokens.createdAt));

    const now = new Date();
    const enriched = rows.map((r) => ({
      ...r,
      isExpired: now > new Date(r.expiresAt),
      daysLeft: Math.max(0, Math.ceil((new Date(r.expiresAt).getTime() - now.getTime()) / 86400000)),
    }));

    res.json({ data: enriched });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/admin/tokens/:id/revoke", adminGuard, async (req, res) => {
  const id = Number(req.params.id);
  try {
    await db
      .update(proAccessTokens)
      .set({ isRevoked: true })
      .where(eq(proAccessTokens.id, id));
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
