import bcrypt from "bcryptjs";
import { Pool } from "@neondatabase/serverless";

const { DATABASE_URL, DEMO_AUTH_EMAIL, DEMO_AUTH_PASSWORD } = process.env;
if (!DATABASE_URL || !DEMO_AUTH_EMAIL || !DEMO_AUTH_PASSWORD) {
  throw new Error("Set DATABASE_URL, DEMO_AUTH_EMAIL, and DEMO_AUTH_PASSWORD in .env.local first.");
}

const pool = new Pool({ connectionString: DATABASE_URL });
try {
  const passwordHash = await bcrypt.hash(DEMO_AUTH_PASSWORD, 12);
  await pool.query(
    `INSERT INTO users (name, email, "passwordHash")
     VALUES ($1, lower($2), $3)
     ON CONFLICT (email) DO UPDATE
       SET name = EXCLUDED.name, "passwordHash" = EXCLUDED."passwordHash"`,
    ["Demo Account", DEMO_AUTH_EMAIL, passwordHash],
  );
  console.log(`Seeded demo account: ${DEMO_AUTH_EMAIL}`);
} finally {
  await pool.end();
}
