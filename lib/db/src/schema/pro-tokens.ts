import { pgTable, serial, text, timestamp, boolean } from "drizzle-orm/pg-core";

export const proAccessTokens = pgTable("pro_access_tokens", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  label: text("label").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  isRevoked: boolean("is_revoked").notNull().default(false),
});

export type ProAccessToken = typeof proAccessTokens.$inferSelect;
export type NewProAccessToken = typeof proAccessTokens.$inferInsert;
