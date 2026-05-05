import express from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  generateSummary, generateTags, generateTitles, improveContent, askBlog
} from "../controllers/aiController.js";

const router = express.Router();

router.post("/ai/summary", requireAuth, generateSummary);
router.post("/ai/tags", requireAuth, generateTags);
router.post("/ai/titles", requireAuth, generateTitles);
router.post("/ai/improve", requireAuth, improveContent);
router.post("/ai/ask", askBlog);

export default router;
