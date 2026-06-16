import { pgTable, uuid, text, numeric, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const foodsTable = pgTable("foods", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  calories: real("calories"),
  protein: real("protein"),
  carbs: real("carbs"),
  fat: real("fat"),
  servingSize: text("serving_size"),
  default_servings: numeric("default_servings").default("1"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const insertFoodSchema = createInsertSchema(foodsTable).omit({ id: true, createdAt: true });
export type InsertFood = z.infer<typeof insertFoodSchema>;
export type Food = typeof foodsTable.$inferSelect;