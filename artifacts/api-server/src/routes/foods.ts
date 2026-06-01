import { Router, type IRouter } from "express";
import { eq, ilike } from "drizzle-orm";
import { db, foodsTable } from "@workspace/db";
import {
  ListFoodsQueryParams,
  ListFoodsResponse,
  CreateFoodBody,
  GetFoodParams,
  GetFoodResponse,
  UpdateFoodParams,
  UpdateFoodBody,
  UpdateFoodResponse,
  DeleteFoodParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/foods", async (req, res): Promise<void> => {
  const params = ListFoodsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  let query = db.select().from(foodsTable);
  if (params.data.search) {
    query = query.where(ilike(foodsTable.name, `%${params.data.search}%`)) as typeof query;
  }

  const foods = await query.orderBy(foodsTable.name);
  res.json(ListFoodsResponse.parse(foods));
});

router.post("/foods", async (req, res): Promise<void> => {
  const parsed = CreateFoodBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [food] = await db.insert(foodsTable).values(parsed.data).returning();
  res.status(201).json(GetFoodResponse.parse(food));
});

router.get("/foods/:id", async (req, res): Promise<void> => {
  const params = GetFoodParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [food] = await db.select().from(foodsTable).where(eq(foodsTable.id, params.data.id));
  if (!food) {
    res.status(404).json({ error: "Food not found" });
    return;
  }

  res.json(GetFoodResponse.parse(food));
});

router.patch("/foods/:id", async (req, res): Promise<void> => {
  const params = UpdateFoodParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateFoodBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [food] = await db
    .update(foodsTable)
    .set(parsed.data)
    .where(eq(foodsTable.id, params.data.id))
    .returning();

  if (!food) {
    res.status(404).json({ error: "Food not found" });
    return;
  }

  res.json(UpdateFoodResponse.parse(food));
});

router.delete("/foods/:id", async (req, res): Promise<void> => {
  const params = DeleteFoodParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [food] = await db
    .delete(foodsTable)
    .where(eq(foodsTable.id, params.data.id))
    .returning();

  if (!food) {
    res.status(404).json({ error: "Food not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
