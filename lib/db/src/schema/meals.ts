import { pgTable, text, serial, timestamp, real, integer, date, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { foodsTable } from "./foods";

export const mealsTable = pgTable("meals", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull().default(""),
  foodId: integer("food_id").notNull().references(() => foodsTable.id, { onDelete: "cascade" }),
  mealType: text("meal_type").notNull(),
  servings: real("servings").notNull(),
  date: date("date").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertMealSchema = createInsertSchema(mealsTable).omit({ id: true, createdAt: true, userId: true });
export type InsertMeal = z.infer<typeof insertMealSchema>;
export type Meal = typeof mealsTable.$inferSelect;
