import express from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  getHome, getCompose, postCompose, getPost,
  getEdit, postEdit, deletePost, getSearch
} from "../controllers/blogController.js";

const router = express.Router();

router.get("/", getHome);
router.get("/search", getSearch);
router.get("/compose", requireAuth, getCompose);
router.post("/compose", requireAuth, postCompose);
router.get("/posts/:postId", getPost);
router.get("/posts/:postId/edit", requireAuth, getEdit);
router.post("/posts/:postId/edit", requireAuth, postEdit);
router.post("/posts/:postId/delete", requireAuth, deletePost);

export default router;
