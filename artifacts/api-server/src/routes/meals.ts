import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, mealsTable, foodsTable } from "@workspace/db";
import { triggerSync } from "../lib/sync-log";
import {
  ListMealsQueryParams,
  ListMealsResponse,
  CreateMealBody,
  GetMealParams,
  GetMealResponse,
  UpdateMealParams,
  UpdateMealBody,
  UpdateMealResponse,
  DeleteMealParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function getMealWithFood(mealId: number, userId: string) {
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
    .where(and(eq(mealsTable.id, mealId), eq(mealsTable.userId, userId)));

  if (!rows[0]) return null;
  const row = rows[0];
  return {
    ...row,
    calories: row.calories * row.servings,
    protein: row.protein * row.servings,
    carbs: row.carbs * row.servings,
    fat: row.fat * row.servings,
  };
}

router.get("/meals", async (req, res): Promise<void> => {
  const params = ListMealsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

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
    .where(and(eq(mealsTable.date, params.data.date), eq(mealsTable.userId, req.userId)))
    .orderBy(mealsTable.createdAt);

  const meals = rows.map((row) => ({
    ...row,
    calories: row.calories * row.servings,
    protein: row.protein * row.servings,
    carbs: row.carbs * row.servings,
    fat: row.fat * row.servings,
  }));

  res.json(ListMealsResponse.parse(meals));
});

router.post("/meals", async (req, res): Promise<void> => {
  const parsed = CreateMealBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [food] = await db.select().from(foodsTable).where(eq(foodsTable.id, parsed.data.foodId));
  if (!food) {
    res.status(400).json({ error: "Food not found" });
    return;
  }

  const [meal] = await db
    .insert(mealsTable)
    .values({
      userId: req.userId,
      foodId: parsed.data.foodId,
      mealType: parsed.data.mealType,
      servings: parsed.data.servings,
      date: parsed.data.date,
    })
    .returning();

  const result = await getMealWithFood(meal.id, req.userId);
  triggerSync(parsed.data.date, req.userId);
  res.status(201).json(GetMealResponse.parse(result));
});

router.get("/meals/:id", async (req, res): Promise<void> => {
  const params = GetMealParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const result = await getMealWithFood(params.data.id, req.userId);
  if (!result) {
    res.status(404).json({ error: "Meal not found" });
    return;
  }

  res.json(GetMealResponse.parse(result));
});

router.patch("/meals/:id", async (req, res): Promise<void> => {
  const params = UpdateMealParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateMealBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [meal] = await db
    .update(mealsTable)
    .set(parsed.data)
    .where(and(eq(mealsTable.id, params.data.id), eq(mealsTable.userId, req.userId)))
    .returning();

  if (!meal) {
    res.status(404).json({ error: "Meal not found" });
    return;
  }

  const result = await getMealWithFood(meal.id, req.userId);
  res.json(UpdateMealResponse.parse(result));
});

router.delete("/meals/:id", async (req, res): Promise<void> => {
  const params = DeleteMealParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [meal] = await db
    .delete(mealsTable)
    .where(and(eq(mealsTable.id, params.data.id), eq(mealsTable.userId, req.userId)))
    .returning();

  if (!meal) {
    res.status(404).json({ error: "Meal not found" });
    return;
  }

  triggerSync(meal.date, req.userId);
  res.sendStatus(204);
});

export default router;
