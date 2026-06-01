import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, goalsTable } from "@workspace/db";
import { SetGoalBody, GetGoalResponse, SetGoalResponse } from "@workspace/api-zod";

const router: IRouter = Router();

async function getOrCreateGoal(userId: string) {
  const rows = await db.select().from(goalsTable).where(eq(goalsTable.userId, userId));
  if (rows.length > 0) return rows[0];

  const [goal] = await db
    .insert(goalsTable)
    .values({
      userId,
      dailyCalories: 2000,
      dailyProtein: 150,
      dailyCarbs: 250,
      dailyFat: 65,
    })
    .returning();
  return goal;
}

router.get("/goals", async (req, res): Promise<void> => {
  const goal = await getOrCreateGoal(req.userId);
  res.json(GetGoalResponse.parse(goal));
});

router.put("/goals", async (req, res): Promise<void> => {
  const parsed = SetGoalBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const existing = await getOrCreateGoal(req.userId);

  const [goal] = await db
    .update(goalsTable)
    .set(parsed.data)
    .where(and(eq(goalsTable.id, existing.id), eq(goalsTable.userId, req.userId)))
    .returning();

  res.json(SetGoalResponse.parse(goal));
});

export default router;
