import { query } from "@/app/lib/db";

let ensuredUserAuthColumns = false;

export const ensureUserAuthSchema = async () => {
  if (ensuredUserAuthColumns) {
    return;
  }

  await query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255),
    ADD COLUMN IF NOT EXISTS salt VARCHAR(255)
  `);

  ensuredUserAuthColumns = true;
};
