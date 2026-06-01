import { pgTable, text, serial, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const foodsTable = pgTable("foods", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  calories: real("calories").notNull(),
  protein: real("protein").notNull(),
  carbs: real("carbs").notNull(),
  fat: real("fat").notNull(),
  servingSize: text("serving_size").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertFoodSchema = createInsertSchema(foodsTable).omit({ id: true, createdAt: true });
export type InsertFood = z.infer<typeof insertFoodSchema>;
export type Food = typeof foodsTable.$inferSelect;
