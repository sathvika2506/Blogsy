import pg from "pg";

const { Pool } = pg;

console.log("DATABASE_URL:", process.env.DATABASE_URL);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

pool.connect()
  .then(() => {
    console.log("✅ Connected to Neon PostgreSQL");
  })
  .catch((err) => {
    console.error("❌ DB CONNECTION ERROR:", err);
  });

export default pool;