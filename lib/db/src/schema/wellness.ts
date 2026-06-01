import { pgTable, text, serial, timestamp, integer, varchar } from "drizzle-orm/pg-core";

export const wellnessLogTable = pgTable("wellness_log", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull().default(""),
  date: varchar("date", { length: 10 }).notNull(),
  caloriesBurned: integer("calories_burned"),
  mood: text("mood"),
  stressLevel: integer("stress_level"),
  bedtime: varchar("bedtime", { length: 5 }),
  wakeTime: varchar("wake_time", { length: 5 }),
  supplements: text("supplements"),
  medications: text("medications"),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type WellnessLog = typeof wellnessLogTable.$inferSelect;
