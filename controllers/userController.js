import pool from "../config/db.js";

// GET /dashboard
export async function getDashboard(req, res) {
  const userId = req.session.userId;
  try {
    const postsResult = await pool.query(`
      SELECT p.*,
        COUNT(DISTINCT l.id) AS like_count,
        COUNT(DISTINCT c.id) AS comment_count,
        COALESCE(p.views, 0) AS views
      FROM posts p
      LEFT JOIN likes l ON l.post_id = p.id
      LEFT JOIN comments c ON c.post_id = p.id
      WHERE p.user_id = $1
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `, [userId]);

    const userResult = await pool.query("SELECT * FROM users WHERE id = $1", [userId]);
    const user = userResult.rows[0];

    // Notifications
    const notifResult = await pool.query(`
      SELECT n.*, u.name AS from_name, u.avatar_url AS from_avatar, p.title AS post_title
      FROM notifications n
      LEFT JOIN users u ON n.from_user_id = u.id
      LEFT JOIN posts p ON n.post_id = p.id
      WHERE n.user_id = $1
      ORDER BY n.created_at DESC LIMIT 10
    `, [userId]);

    // Mark notifications as read
    await pool.query("UPDATE notifications SET read = TRUE WHERE user_id = $1", [userId]);

    // Analytics totals
    const totals = postsResult.rows.reduce((acc, p) => {
      acc.views += parseInt(p.views) || 0;
      acc.likes += parseInt(p.like_count) || 0;
      acc.comments += parseInt(p.comment_count) || 0;
      return acc;
    }, { views: 0, likes: 0, comments: 0 });

    res.render("dashboard", {
      posts: postsResult.rows,
      user,
      notifications: notifResult.rows,
      totals
    });
  } catch (err) {
    console.error(err);
    res.status(500).render("error", { message: "Error loading dashboard." });
  }
}

// GET /profile/edit
export async function getEditProfile(req, res) {
  const userId = req.session.userId;
  const result = await pool.query("SELECT * FROM users WHERE id = $1", [userId]);
  res.render("profile-edit", { user: result.rows[0], error: null, success: null });
}

// POST /profile/edit
export async function postEditProfile(req, res) {
  const userId = req.session.userId;
  const { name, bio, twitter, instagram, website, avatar_url } = req.body;
  try {
    await pool.query(
      "UPDATE users SET name=$1, bio=$2, twitter=$3, instagram=$4, website=$5, avatar_url=$6 WHERE id=$7",
      [name, bio || null, twitter || null, instagram || null, website || null, avatar_url || null, userId]
    );
    // Update session
    req.session.user = { ...req.session.user, name, avatar_url: avatar_url || req.session.user.avatar_url };
    const result = await pool.query("SELECT * FROM users WHERE id = $1", [userId]);
    res.render("profile-edit", { user: result.rows[0], error: null, success: "Profile updated!" });
  } catch (err) {
    console.error(err);
    const result = await pool.query("SELECT * FROM users WHERE id = $1", [userId]);
    res.render("profile-edit", { user: result.rows[0], error: "Failed to update profile.", success: null });
  }
}

// GET /author/:userId
export async function getAuthorProfile(req, res) {
  const { userId } = req.params;
  try {
    const userResult = await pool.query("SELECT id, name, bio, avatar_url, twitter, instagram, website, created_at FROM users WHERE id = $1", [userId]);
    if (userResult.rows.length === 0) return res.status(404).render("error", { message: "Author not found." });
    const author = userResult.rows[0];

    const postsResult = await pool.query(`
      SELECT p.*, COUNT(DISTINCT l.id) AS like_count
      FROM posts p
      LEFT JOIN likes l ON l.post_id = p.id
      WHERE p.user_id = $1 AND p.status = 'published'
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `, [userId]);

    res.render("author", { author, posts: postsResult.rows });
  } catch (err) {
    res.status(500).render("error", { message: "Error loading author profile." });
  }
}

// GET /bookmarks
export async function getBookmarks(req, res) {
  const userId = req.session.userId;
  try {
    const result = await pool.query(`
      SELECT p.*, u.name AS author_name FROM bookmarks b
      JOIN posts p ON b.post_id = p.id
      LEFT JOIN users u ON p.user_id = u.id
      WHERE b.user_id = $1
      ORDER BY b.created_at DESC
    `, [userId]);
    res.render("bookmarks", { posts: result.rows });
  } catch (err) {
    res.status(500).render("error", { message: "Error loading bookmarks." });
  }
}
