import express from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  toggleLike, addComment, toggleBookmark, deleteComment
} from "../controllers/engagementController.js";

const router = express.Router();

router.post("/posts/:postId/like", requireAuth, toggleLike);
router.post("/posts/:postId/comment", requireAuth, addComment);
router.post("/posts/:postId/bookmark", requireAuth, toggleBookmark);
router.post("/comments/:commentId/delete", requireAuth, deleteComment);

export default router;
