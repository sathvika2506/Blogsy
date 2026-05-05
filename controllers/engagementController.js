import { v4 as uuidv4 } from "uuid";
import pool from "../config/db.js";

// POST /posts/:postId/like
export async function toggleLike(req, res) {
  const { postId } = req.params;
  const userId = req.session.userId;
  try {
    const existing = await pool.query("SELECT id FROM likes WHERE post_id=$1 AND user_id=$2", [postId, userId]);
    if (existing.rows.length > 0) {
      await pool.query("DELETE FROM likes WHERE post_id=$1 AND user_id=$2", [postId, userId]);
    } else {
      await pool.query("INSERT INTO likes (id, post_id, user_id) VALUES ($1,$2,$3)", [uuidv4(), postId, userId]);
      // Notify post owner
      const postResult = await pool.query("SELECT user_id FROM posts WHERE id=$1", [postId]);
      const ownerId = postResult.rows[0]?.user_id;
      if (ownerId && ownerId !== userId) {
        await pool.query(
          "INSERT INTO notifications (id, user_id, from_user_id, post_id, type) VALUES ($1,$2,$3,$4,'like')",
          [uuidv4(), ownerId, userId, postId]
        );
      }
    }
    const countResult = await pool.query("SELECT COUNT(*) FROM likes WHERE post_id=$1", [postId]);
    res.json({ liked: existing.rows.length === 0, count: parseInt(countResult.rows[0].count) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to toggle like." });
  }
}

// POST /posts/:postId/comment
export async function addComment(req, res) {
  const { postId } = req.params;
  const userId = req.session.userId;
  const { content } = req.body;
  try {
    if (!content?.trim()) return res.redirect(`/posts/${postId}`);
    await pool.query(
      "INSERT INTO comments (id, post_id, user_id, content) VALUES ($1,$2,$3,$4)",
      [uuidv4(), postId, userId, content.trim()]
    );
    // Notify post owner
    const postResult = await pool.query("SELECT user_id FROM posts WHERE id=$1", [postId]);
    const ownerId = postResult.rows[0]?.user_id;
    if (ownerId && ownerId !== userId) {
      await pool.query(
        "INSERT INTO notifications (id, user_id, from_user_id, post_id, type) VALUES ($1,$2,$3,$4,'comment')",
        [uuidv4(), ownerId, userId, postId]
      );
    }
    res.redirect(`/posts/${postId}#comments`);
  } catch (err) {
    console.error(err);
    res.redirect(`/posts/${postId}`);
  }
}

// POST /posts/:postId/bookmark
export async function toggleBookmark(req, res) {
  const { postId } = req.params;
  const userId = req.session.userId;
  try {
    const existing = await pool.query("SELECT id FROM bookmarks WHERE post_id=$1 AND user_id=$2", [postId, userId]);
    if (existing.rows.length > 0) {
      await pool.query("DELETE FROM bookmarks WHERE post_id=$1 AND user_id=$2", [postId, userId]);
      res.json({ bookmarked: false });
    } else {
      await pool.query("INSERT INTO bookmarks (id, post_id, user_id) VALUES ($1,$2,$3)", [uuidv4(), postId, userId]);
      res.json({ bookmarked: true });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to toggle bookmark." });
  }
}

// DELETE /comments/:commentId (admin or owner)
export async function deleteComment(req, res) {
  const { commentId } = req.params;
  const userId = req.session.userId;
  try {
    const result = await pool.query("SELECT * FROM comments WHERE id=$1", [commentId]);
    const comment = result.rows[0];
    if (!comment) return res.status(404).json({ error: "Not found." });
    if (comment.user_id !== userId && req.session.role !== "admin") {
      return res.status(403).json({ error: "Unauthorized." });
    }
    await pool.query("DELETE FROM comments WHERE id=$1", [commentId]);
    res.redirect(`/posts/${comment.post_id}#comments`);
  } catch (err) {
    res.status(500).json({ error: "Failed to delete comment." });
  }
}
