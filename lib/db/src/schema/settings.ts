import { pgTable, varchar, text, timestamp } from "drizzle-orm/pg-core";

export const settingsTable = pgTable("settings", {
  key: varchar("key", { length: 255 }).primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type Setting = typeof settingsTable.$inferSelect;
