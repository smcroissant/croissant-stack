import { user, account, verification, session, sessionRelations, accountRelations, userRelations} from "./auth-schema";
import { pgTable, text, timestamp, boolean, index } from "drizzle-orm/pg-core";

export const planets = pgTable("planets", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export const schema = {
  user,
  account,
  verification,
  session,
  sessionRelations,
  accountRelations,
  userRelations
}