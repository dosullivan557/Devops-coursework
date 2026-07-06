import { query } from "@/app/lib/db";

let ensuredPlatformSchema = false;

export const ensurePlatformSchema = async () => {
  if (ensuredPlatformSchema) {
    return;
  }

  await query(`
    CREATE TABLE IF NOT EXISTS platform (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await query(`
    ALTER TABLE teams
    ADD COLUMN IF NOT EXISTS platform_id INTEGER
  `);

  ensuredPlatformSchema = true;
};
