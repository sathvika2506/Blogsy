import pool from "./config/db.js";

async function migrate() {
  console.log("🔧 Running Blogsy database migrations...");
  try {
    // Enable uuid-ossp extension
    await pool.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

    // Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT,
        bio TEXT,
        avatar_url TEXT,
        twitter VARCHAR(100),
        instagram VARCHAR(100),
        website VARCHAR(255),
        role VARCHAR(20) DEFAULT 'user',
        reset_token TEXT,
        reset_token_expires TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log("✅ users table ready");

    // Ensure posts table exists (preserve existing data)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id UUID PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL
      );
    `);

    // We can't easily alter column types safely with just IF NOT EXISTS without risking exceptions
    // Let's drop and recreate the tables if we want a clean slate EXCEPT posts and users
    await pool.query('DROP TABLE IF EXISTS notifications;');
    await pool.query('DROP TABLE IF EXISTS bookmarks;');
    await pool.query('DROP TABLE IF EXISTS comments;');
    await pool.query('DROP TABLE IF EXISTS likes;');
    
    // Add new columns to posts (safe: IF NOT EXISTS per column)
    const postColumns = [
      ["user_id", "UUID REFERENCES users(id) ON DELETE SET NULL"],
      ["tags", "TEXT[] DEFAULT '{}'"],
      ["summary", "TEXT"],
      ["status", "VARCHAR(20) DEFAULT 'published'"],
      ["views", "INT DEFAULT 0"],
      ["cover_image", "TEXT"],
      ["created_at", "TIMESTAMPTZ DEFAULT NOW()"]
    ];
    for (const [col, def] of postColumns) {
      try {
        await pool.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS ${col} ${def};`);
      } catch (e) { /* column already exists */ }
    }

    // Likes
    await pool.query(`
      CREATE TABLE likes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(post_id, user_id)
      );
    `);
    console.log("✅ likes table ready");

    // Comments
    await pool.query(`
      CREATE TABLE comments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log("✅ comments table ready");

    // Bookmarks
    await pool.query(`
      CREATE TABLE bookmarks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(post_id, user_id)
      );
    `);
    console.log("✅ bookmarks table ready");

    // Notifications
    await pool.query(`
      CREATE TABLE notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        from_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
        type VARCHAR(20) NOT NULL,
        read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log("✅ notifications table ready");

    console.log("\n🎉 All migrations completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
    process.exit(1);
  }
}

migrate();
