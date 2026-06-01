import { pgTable, serial, integer, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const goalsTable = pgTable("goals", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull().default(""),
  dailyCalories: integer("daily_calories").notNull().default(2000),
  dailyProtein: integer("daily_protein").notNull().default(150),
  dailyCarbs: integer("daily_carbs").notNull().default(250),
  dailyFat: integer("daily_fat").notNull().default(65),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertGoalSchema = createInsertSchema(goalsTable).omit({ id: true, updatedAt: true, userId: true });
export type InsertGoal = z.infer<typeof insertGoalSchema>;
export type Goal = typeof goalsTable.$inferSelect;
