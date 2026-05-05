import pool from "./config/db.js";

async function forceResetDb() {
  console.log("🧨 Force resetting database...");
  try {
    await pool.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

    // Drop all tables
    await pool.query('DROP TABLE IF EXISTS notifications CASCADE;');
    await pool.query('DROP TABLE IF EXISTS bookmarks CASCADE;');
    await pool.query('DROP TABLE IF EXISTS comments CASCADE;');
    await pool.query('DROP TABLE IF EXISTS likes CASCADE;');
    await pool.query('DROP TABLE IF EXISTS posts CASCADE;');
    await pool.query('DROP TABLE IF EXISTS users CASCADE;');
    
    // Create Users
    await pool.query(`
      CREATE TABLE users (
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
    
    // Create Posts
    await pool.query(`
      CREATE TABLE posts (
        id UUID PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        tags TEXT[] DEFAULT '{}',
        summary TEXT,
        status VARCHAR(20) DEFAULT 'published',
        views INT DEFAULT 0,
        cover_image TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

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

    console.log("✅ All tables created successfully!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Reset failed:", err);
    process.exit(1);
  }
}

forceResetDb();
