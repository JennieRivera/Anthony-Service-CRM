import {
  pgTable,
  text,
  timestamp,
  uuid,
  numeric,
  pgEnum,
} from "drizzle-orm/pg-core";

export const serviceTypeEnum = pgEnum("service_type", [
  "notary",
  "immigration",
  "tax",
  "credit_financing",
]);

export const dealStatusEnum = pgEnum("deal_status", [
  "new",
  "in_progress",
  "waiting_on_client",
  "completed",
  "cancelled",
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const contacts = pgTable("contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  fullName: text("full_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  preferredLanguage: text("preferred_language", { enum: ["en", "es"] })
    .notNull()
    .default("en"),
  notes: text("notes"),
});

export const deals = pgTable("deals", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  contactId: uuid("contact_id")
    .notNull()
    .references(() => contacts.id, { onDelete: "cascade" }),
  serviceType: serviceTypeEnum("service_type").notNull(),
  status: dealStatusEnum("status").notNull().default("new"),
  title: text("title").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }),
  notes: text("notes"),
});

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  dealId: uuid("deal_id")
    .notNull()
    .references(() => deals.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  blobUrl: text("blob_url").notNull(),
  uploadedBy: uuid("uploaded_by").references(() => users.id),
});

export type User = typeof users.$inferSelect;
export type Contact = typeof contacts.$inferSelect;
export type Deal = typeof deals.$inferSelect;
export type Document = typeof documents.$inferSelect;
