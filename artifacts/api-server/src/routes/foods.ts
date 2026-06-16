import { Router, type IRouter } from "express";
import { eq, ilike } from "drizzle-orm";
import { db, foodsTable } from "@workspace/db";
import {
  ListFoodsQueryParams,
  CreateFoodBody,
  GetFoodParams,
  UpdateFoodParams,
  UpdateFoodBody,
  DeleteFoodParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

// GET /api/foods - получить список продуктов
router.get("/api/foods", async (req, res): Promise<void> => {
  try {
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
    // Возвращаем данные без Zod валидации (проблема с UUID)
    res.json(foods);
  } catch (error) {
    console.error("Error in GET /api/foods:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/foods - создать новый продукт
router.post("/api/foods", async (req, res): Promise<void> => {
  try {
    const parsed = CreateFoodBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [food] = await db.insert(foodsTable).values(parsed.data).returning();
    res.status(201).json(food);
  } catch (error) {
    console.error("Error in POST /api/foods:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/foods/:id - получить продукт по ID
router.get("/api/foods/:id", async (req, res): Promise<void> => {
  try {
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

    res.json(food);
  } catch (error) {
    console.error("Error in GET /api/foods/:id:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/foods/:id - обновить продукт
router.patch("/api/foods/:id", async (req, res): Promise<void> => {
  try {
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

    res.json(food);
  } catch (error) {
    console.error("Error in PATCH /api/foods/:id:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/foods/:id - удалить продукт
router.delete("/api/foods/:id", async (req, res): Promise<void> => {
  try {
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
  } catch (error) {
    console.error("Error in DELETE /api/foods/:id:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;