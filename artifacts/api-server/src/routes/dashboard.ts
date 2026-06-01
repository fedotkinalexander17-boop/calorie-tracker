import { Router, type IRouter } from "express";
import { eq, desc, sql, and } from "drizzle-orm";
import { db, mealsTable, foodsTable, goalsTable } from "@workspace/db";
import {
  GetDailySummaryQueryParams,
  GetDailySummaryResponse,
  GetWeeklyStatsQueryParams,
  GetWeeklyStatsResponse,
  GetRecentMealsQueryParams,
  GetRecentMealsResponse,
  GetMealTypeBreakdownQueryParams,
  GetMealTypeBreakdownResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function getGoalValues(userId: string) {
  const rows = await db.select().from(goalsTable).where(eq(goalsTable.userId, userId));
  if (rows.length > 0) return rows[0];
  return { dailyCalories: 2000, dailyProtein: 150, dailyCarbs: 250, dailyFat: 65 };
}

router.get("/dashboard/daily-summary", async (req, res): Promise<void> => {
  const params = GetDailySummaryQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const rows = await db
    .select({
      totalCalories: sql<number>`coalesce(sum(${foodsTable.calories} * ${mealsTable.servings}), 0)`,
      totalProtein: sql<number>`coalesce(sum(${foodsTable.protein} * ${mealsTable.servings}), 0)`,
      totalCarbs: sql<number>`coalesce(sum(${foodsTable.carbs} * ${mealsTable.servings}), 0)`,
      totalFat: sql<number>`coalesce(sum(${foodsTable.fat} * ${mealsTable.servings}), 0)`,
      mealCount: sql<number>`count(${mealsTable.id})::int`,
    })
    .from(mealsTable)
    .innerJoin(foodsTable, eq(mealsTable.foodId, foodsTable.id))
    .where(and(eq(mealsTable.date, params.data.date), eq(mealsTable.userId, req.userId)));

  const totals = rows[0] ?? { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0, mealCount: 0 };
  const goal = await getGoalValues(req.userId);

  const summary = {
    date: params.data.date,
    totalCalories: Number(totals.totalCalories),
    totalProtein: Number(totals.totalProtein),
    totalCarbs: Number(totals.totalCarbs),
    totalFat: Number(totals.totalFat),
    goalCalories: goal.dailyCalories,
    goalProtein: goal.dailyProtein,
    goalCarbs: goal.dailyCarbs,
    goalFat: goal.dailyFat,
    mealCount: Number(totals.mealCount),
  };

  res.json(GetDailySummaryResponse.parse(summary));
});

router.get("/dashboard/weekly-stats", async (req, res): Promise<void> => {
  const params = GetWeeklyStatsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const goal = await getGoalValues(req.userId);
  const baseDate = new Date(params.data.date);

  const dayOfWeek = baseDate.getDay();
  const monday = new Date(baseDate);
  monday.setDate(baseDate.getDate() - ((dayOfWeek + 6) % 7));

  const days: Array<{ date: string; totalCalories: number; goalCalories: number }> = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];

    const rows = await db
      .select({
        totalCalories: sql<number>`coalesce(sum(${foodsTable.calories} * ${mealsTable.servings}), 0)`,
      })
      .from(mealsTable)
      .innerJoin(foodsTable, eq(mealsTable.foodId, foodsTable.id))
      .where(and(eq(mealsTable.date, dateStr), eq(mealsTable.userId, req.userId)));

    days.push({
      date: dateStr,
      totalCalories: Number(rows[0]?.totalCalories ?? 0),
      goalCalories: goal.dailyCalories,
    });
  }

  res.json(GetWeeklyStatsResponse.parse(days));
});

router.get("/dashboard/recent-meals", async (req, res): Promise<void> => {
  const params = GetRecentMealsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const limit = params.data.limit ?? 5;

  const rows = await db
    .select({
      id: mealsTable.id,
      foodId: mealsTable.foodId,
      foodName: foodsTable.name,
      mealType: mealsTable.mealType,
      servings: mealsTable.servings,
      calories: foodsTable.calories,
      protein: foodsTable.protein,
      carbs: foodsTable.carbs,
      fat: foodsTable.fat,
      date: mealsTable.date,
      createdAt: mealsTable.createdAt,
    })
    .from(mealsTable)
    .innerJoin(foodsTable, eq(mealsTable.foodId, foodsTable.id))
    .where(eq(mealsTable.userId, req.userId))
    .orderBy(desc(mealsTable.createdAt))
    .limit(limit);

  const meals = rows.map((row) => ({
    ...row,
    calories: row.calories * row.servings,
    protein: row.protein * row.servings,
    carbs: row.carbs * row.servings,
    fat: row.fat * row.servings,
  }));

  res.json(GetRecentMealsResponse.parse(meals));
});

router.get("/dashboard/meal-type-breakdown", async (req, res): Promise<void> => {
  const params = GetMealTypeBreakdownQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const rows = await db
    .select({
      mealType: mealsTable.mealType,
      totalCalories: sql<number>`coalesce(sum(${foodsTable.calories} * ${mealsTable.servings}), 0)`,
      count: sql<number>`count(${mealsTable.id})::int`,
    })
    .from(mealsTable)
    .innerJoin(foodsTable, eq(mealsTable.foodId, foodsTable.id))
    .where(and(eq(mealsTable.date, params.data.date), eq(mealsTable.userId, req.userId)))
    .groupBy(mealsTable.mealType);

  const breakdown = rows.map((row) => ({
    mealType: row.mealType,
    totalCalories: Number(row.totalCalories),
    count: Number(row.count),
  }));

  res.json(GetMealTypeBreakdownResponse.parse(breakdown));
});

export default router;
