import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

pool.connect((err) => {
  if (err) {
    console.error("Database connection error:", err);
  } else {
    console.log("✅ Connected to Neon PostgreSQL");
  }
});

export default pool;