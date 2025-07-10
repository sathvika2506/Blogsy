// index.js (without authentication)

import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import { v4 as uuidv4 } from "uuid";

const { Pool } = pg;
const app = express();
const port = 3000;

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "posts",
  password: "Vistara@123",
  port: 5432,
});

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.get("/", async (req, res) => {
  const result = await pool.query("SELECT * FROM posts ORDER BY id DESC");
  res.render("home", { posts: result.rows });
});

app.get("/compose", (req, res) => {
  res.render("compose");
});

app.post("/compose", async (req, res) => {
  const { postTitle, postBody } = req.body;
  await pool.query(
    "INSERT INTO posts (id, title, content) VALUES ($1, $2, $3)",
    [uuidv4(), postTitle, postBody]
  );
  res.redirect("/");
});

app.get("/posts/:postId", async (req, res) => {
  const postId = req.params.postId;
  const result = await pool.query("SELECT * FROM posts WHERE id = $1", [postId]);
  const post = result.rows[0];
  if (post) {
    res.render("post", { title: post.title, content: post.content });
  } else {
    res.status(404).send("Post not found");
  }
});

app.get("/posts/:postId/edit", async (req, res) => {
  const postId = req.params.postId;
  const result = await pool.query("SELECT * FROM posts WHERE id = $1", [postId]);
  const post = result.rows[0];
  if (post) {
    res.render("edit", {
      id: post.id,
      title: post.title,
      content: post.content
    });
  } else {
    res.status(404).send("Post not found");
  }
});
app.get("/search", async (req, res) => {
  const query = req.query.query;
  try {
    const result = await pool.query(
      "SELECT * FROM posts WHERE LOWER(title) LIKE $1 OR LOWER(content) LIKE $1",
      [`%${query.toLowerCase()}%`]
    );
    res.render("search", { posts: result.rows, searchQuery: query });
  } catch (err) {
    res.status(500).send("Error searching posts");
  }
});

app.post("/posts/:postId/edit", async (req, res) => {
  const postId = req.params.postId;
  const { postTitle, postBody } = req.body;
  await pool.query(
    "UPDATE posts SET title = $1, content = $2 WHERE id = $3",
    [postTitle, postBody, postId]
  );
  res.redirect("/");
});

app.post("/posts/:postId/delete", async (req, res) => {
  const postId = req.params.postId;
  await pool.query("DELETE FROM posts WHERE id = $1", [postId]);
  res.redirect("/");
});

app.get("/about", (req, res) => {
  res.render("about");
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
