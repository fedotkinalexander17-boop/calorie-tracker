import { Router } from "express";
import { db } from "@workspace/db";
import { wellnessLogTable } from "@workspace/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { triggerWellnessSync } from "../lib/sync-log";

const router = Router();

router.get("/wellness", async (req, res) => {
  const userId = req.userId!;
  const { date } = req.query as { date?: string };

  if (!date) {
    res.status(400).json({ error: "date is required" });
    return;
  }

  const [entry] = await db
    .select()
    .from(wellnessLogTable)
    .where(and(eq(wellnessLogTable.userId, userId), eq(wellnessLogTable.date, date)))
    .limit(1);

  if (!entry) {
    res.status(404).json({ error: "No entry for this date" });
    return;
  }

  res.json(entry);
});

router.put("/wellness", async (req, res) => {
  const userId = req.userId!;
  const body = req.body as {
    date: string;
    caloriesBurned?: number | null;
    mood?: string | null;
    stressLevel?: number | null;
    bedtime?: string | null;
    wakeTime?: string | null;
    supplements?: string | null;
    medications?: string | null;
  };

  if (!body.date) {
    res.status(400).json({ error: "date is required" });
    return;
  }

  const values = {
    userId,
    date: body.date,
    caloriesBurned: body.caloriesBurned ?? null,
    mood: body.mood ?? null,
    stressLevel: body.stressLevel ?? null,
    bedtime: body.bedtime ?? null,
    wakeTime: body.wakeTime ?? null,
    supplements: body.supplements ?? null,
    medications: body.medications ?? null,
    updatedAt: new Date(),
  };

  const [existing] = await db
    .select({ id: wellnessLogTable.id })
    .from(wellnessLogTable)
    .where(and(eq(wellnessLogTable.userId, userId), eq(wellnessLogTable.date, body.date)))
    .limit(1);

  let entry;
  if (existing) {
    [entry] = await db
      .update(wellnessLogTable)
      .set(values)
      .where(eq(wellnessLogTable.id, existing.id))
      .returning();
  } else {
    [entry] = await db.insert(wellnessLogTable).values(values).returning();
  }

  triggerWellnessSync(userId);

  res.json(entry);
});

router.get("/wellness/history", async (req, res) => {
  const userId = req.userId!;
  const { from, to } = req.query as { from?: string; to?: string };

  if (!from || !to) {
    res.status(400).json({ error: "from and to are required" });
    return;
  }

  const entries = await db
    .select()
    .from(wellnessLogTable)
    .where(
      and(
        eq(wellnessLogTable.userId, userId),
        gte(wellnessLogTable.date, from),
        lte(wellnessLogTable.date, to)
      )
    )
    .orderBy(wellnessLogTable.date);

  res.json(entries);
});

export default router;
