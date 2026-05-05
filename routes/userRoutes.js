import express from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  getDashboard, getEditProfile, postEditProfile,
  getAuthorProfile, getBookmarks
} from "../controllers/userController.js";

const router = express.Router();

router.get("/dashboard", requireAuth, getDashboard);
router.get("/profile/edit", requireAuth, getEditProfile);
router.post("/profile/edit", requireAuth, postEditProfile);
router.get("/author/:userId", getAuthorProfile);
router.get("/bookmarks", requireAuth, getBookmarks);

export default router;
