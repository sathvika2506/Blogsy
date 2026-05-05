import express from "express";
import session from "express-session";
import bodyParser from "body-parser";
import dotenv from "dotenv";
dotenv.config();

import { attachUser } from "./middleware/auth.js";
import authRoutes from "./routes/authRoutes.js";
import blogRoutes from "./routes/blogRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import engagementRoutes from "./routes/engagementRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";

const app = express();
const port = process.env.PORT || 3000;

// View engine
app.set("view engine", "ejs");
app.set("views", "./views");

// Static files
app.use(express.static("public"));

// Body parsing
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// Session
app.use(session({
  secret: process.env.SESSION_SECRET || "blogsy_secret_key",
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 } // 7 days
}));

// Attach user to all views
app.use(attachUser);

// Routes
app.use("/", authRoutes);
app.use("/", blogRoutes);
app.use("/", userRoutes);
app.use("/", engagementRoutes);
app.use("/", aiRoutes);

// About page
app.get("/about", (req, res) => res.render("about"));

// 404 fallback
app.use((req, res) => {
  res.status(404).render("error", { message: "Page not found." });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render("error", { message: "Something went wrong." });
});

app.listen(port, () => {
  console.log(`✨ Blogsy running on http://localhost:${port}`);
});