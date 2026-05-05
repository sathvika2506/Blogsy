import { v4 as uuidv4 } from "uuid";
import { marked } from "marked";
import pool from "../config/db.js";

// GET / — home
export async function getHome(req, res) {
  const result = await pool.query(`
    SELECT p.*, u.name AS author_name, u.avatar_url AS author_avatar,
      COUNT(DISTINCT l.id) AS like_count,
      COUNT(DISTINCT c.id) AS comment_count
    FROM posts p
    LEFT JOIN users u ON p.user_id = u.id
    LEFT JOIN likes l ON l.post_id = p.id
    LEFT JOIN comments c ON c.post_id = p.id
    WHERE p.status = 'published'
    GROUP BY p.id, u.name, u.avatar_url
    ORDER BY p.created_at DESC
    LIMIT 12
  `);
  res.render("home", { posts: result.rows });
}

// GET /compose
export async function getCompose(req, res) {
  res.render("compose", { error: null, draft: null });
}

// POST /compose
export async function postCompose(req, res) {
  const { postTitle, postBody, tags, status, cover_image } = req.body;
  const userId = req.session.userId;
  try {
    const tagArray = tags ? tags.split(",").map(t => t.trim()).filter(Boolean) : [];
    const postId = uuidv4();
    await pool.query(
      "INSERT INTO posts (id, title, content, user_id, tags, status, cover_image, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())",
      [postId, postTitle, postBody, userId, tagArray, status || "published", cover_image || null]
    );
    res.redirect(status === "draft" ? "/dashboard" : `/posts/${postId}`);
  } catch (err) {
    console.error(err);
    res.render("compose", { error: "Failed to save post.", draft: req.body });
  }
}

// GET /posts/:postId
export async function getPost(req, res) {
  const { postId } = req.params;
  const userId = req.session.userId;
  try {
    // Increment views
    await pool.query("UPDATE posts SET views = COALESCE(views, 0) + 1 WHERE id = $1", [postId]);

    const result = await pool.query(`
      SELECT p.*, u.name AS author_name, u.avatar_url AS author_avatar, u.bio AS author_bio,
        COUNT(DISTINCT l.id) AS like_count,
        COUNT(DISTINCT c.id) AS comment_count
      FROM posts p
      LEFT JOIN users u ON p.user_id = u.id
      LEFT JOIN likes l ON l.post_id = p.id
      LEFT JOIN comments c ON c.post_id = p.id
      WHERE p.id = $1
      GROUP BY p.id, u.name, u.avatar_url, u.bio
    `, [postId]);

    const post = result.rows[0];
    if (!post) return res.status(404).render("error", { message: "Post not found." });

    // Render markdown content
    post.rendered_content = marked(post.content || "");

    // Comments
    const commentsResult = await pool.query(`
      SELECT c.*, u.name AS author_name, u.avatar_url AS author_avatar
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.post_id = $1
      ORDER BY c.created_at ASC
    `, [postId]);

    // User interaction state
    let userLiked = false, userBookmarked = false;
    if (userId) {
      const likeCheck = await pool.query("SELECT id FROM likes WHERE post_id=$1 AND user_id=$2", [postId, userId]);
      userLiked = likeCheck.rows.length > 0;
      const bmCheck = await pool.query("SELECT id FROM bookmarks WHERE post_id=$1 AND user_id=$2", [postId, userId]);
      userBookmarked = bmCheck.rows.length > 0;
    }

    // Recommended posts (same tags)
    let recommended = [];
    if (post.tags && post.tags.length > 0) {
      const recResult = await pool.query(`
        SELECT p.id, p.title, p.content, p.tags, u.name AS author_name
        FROM posts p
        LEFT JOIN users u ON p.user_id = u.id
        WHERE p.id != $1 AND p.status = 'published' AND p.tags && $2
        ORDER BY p.created_at DESC LIMIT 3
      `, [postId, post.tags]);
      recommended = recResult.rows;
    }

    res.render("post", {
      post,
      comments: commentsResult.rows,
      userLiked,
      userBookmarked,
      recommended
    });
  } catch (err) {
    console.error(err);
    res.status(500).render("error", { message: "Error loading post." });
  }
}

// GET /posts/:postId/edit
export async function getEdit(req, res) {
  const { postId } = req.params;
  const userId = req.session.userId;
  try {
    const result = await pool.query("SELECT * FROM posts WHERE id = $1", [postId]);
    const post = result.rows[0];
    if (!post) return res.status(404).render("error", { message: "Post not found." });
    if (post.user_id && post.user_id !== userId && req.session.role !== "admin") {
      return res.status(403).render("error", { message: "You can only edit your own posts." });
    }
    res.render("edit", { post });
  } catch (err) {
    res.status(500).render("error", { message: "Error loading editor." });
  }
}

// POST /posts/:postId/edit
export async function postEdit(req, res) {
  const { postId } = req.params;
  const { postTitle, postBody, tags, status, cover_image } = req.body;
  const userId = req.session.userId;
  try {
    const tagArray = tags ? tags.split(",").map(t => t.trim()).filter(Boolean) : [];
    const existing = await pool.query("SELECT user_id FROM posts WHERE id = $1", [postId]);
    if (existing.rows[0]?.user_id && existing.rows[0].user_id !== userId && req.session.role !== "admin") {
      return res.status(403).render("error", { message: "Unauthorized." });
    }
    await pool.query(
      "UPDATE posts SET title=$1, content=$2, tags=$3, status=$4, cover_image=$5 WHERE id=$6",
      [postTitle, postBody, tagArray, status || "published", cover_image || null, postId]
    );
    res.redirect(`/posts/${postId}`);
  } catch (err) {
    console.error(err);
    res.status(500).render("error", { message: "Error updating post." });
  }
}

// POST /posts/:postId/delete
export async function deletePost(req, res) {
  const { postId } = req.params;
  const userId = req.session.userId;
  try {
    const existing = await pool.query("SELECT user_id FROM posts WHERE id = $1", [postId]);
    if (existing.rows[0]?.user_id && existing.rows[0].user_id !== userId && req.session.role !== "admin") {
      return res.status(403).render("error", { message: "Unauthorized." });
    }
    await pool.query("DELETE FROM posts WHERE id = $1", [postId]);
    res.redirect("/dashboard");
  } catch (err) {
    res.status(500).render("error", { message: "Error deleting post." });
  }
}

// GET /search
export async function getSearch(req, res) {
  const { query, tag } = req.query;
  try {
    let result;
    if (tag) {
      result = await pool.query(`
        SELECT p.*, u.name AS author_name FROM posts p
        LEFT JOIN users u ON p.user_id = u.id
        WHERE p.status='published' AND $1 = ANY(p.tags)
        ORDER BY p.created_at DESC
      `, [tag]);
    } else if (query) {
      result = await pool.query(`
        SELECT p.*, u.name AS author_name FROM posts p
        LEFT JOIN users u ON p.user_id = u.id
        WHERE p.status='published' AND (LOWER(p.title) LIKE $1 OR LOWER(p.content) LIKE $1)
        ORDER BY p.created_at DESC
      `, [`%${query.toLowerCase()}%`]);
    } else {
      result = { rows: [] };
    }
    res.render("search", { posts: result.rows, searchQuery: query || tag || "", isTag: !!tag });
  } catch (err) {
    res.status(500).render("error", { message: "Search failed." });
  }
}
