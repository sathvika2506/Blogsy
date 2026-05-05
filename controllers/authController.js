import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import nodemailer from "nodemailer";
import pool from "../config/db.js";

const SALT_ROUNDS = 12;

// GET /login
export async function getLogin(req, res) {
  if (req.session.userId) return res.redirect("/dashboard");
  res.render("login", { error: req.query.error || null, success: req.query.success || null });
}

// POST /login
export async function postLogin(req, res) {
  const { email, password } = req.body;
  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email.toLowerCase()]);
    const user = result.rows[0];
    if (!user) return res.render("login", { error: "Invalid email or password.", success: null });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.render("login", { error: "Invalid email or password.", success: null });

    req.session.userId = user.id;
    req.session.user = { id: user.id, name: user.name, email: user.email, avatar_url: user.avatar_url };
    req.session.role = user.role;
    res.redirect("/dashboard");
  } catch (err) {
    console.error(err);
    res.render("login", { error: "Something went wrong. Please try again.", success: null });
  }
}

// GET /register
export async function getRegister(req, res) {
  if (req.session.userId) return res.redirect("/dashboard");
  res.render("register", { error: null });
}

// POST /register
export async function postRegister(req, res) {
  const { name, email, password, confirmPassword } = req.body;
  try {
    if (password !== confirmPassword) {
      return res.render("register", { error: "Passwords do not match." });
    }
    if (password.length < 8) {
      return res.render("register", { error: "Password must be at least 8 characters." });
    }
    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.render("register", { error: "An account with this email already exists." });
    }
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const userId = uuidv4();
    await pool.query(
      "INSERT INTO users (id, name, email, password_hash) VALUES ($1, $2, $3, $4)",
      [userId, name, email.toLowerCase(), hash]
    );
    res.redirect("/login?success=Account created! Please log in.");
  } catch (err) {
    console.error(err);
    res.render("register", { error: "Something went wrong. Please try again." });
  }
}

// GET /logout
export async function getLogout(req, res) {
  req.session.destroy(() => {
    res.redirect("/");
  });
}

// GET /forgot-password
export async function getForgotPassword(req, res) {
  res.render("forgot-password", { error: null, success: null });
}

// POST /forgot-password
export async function postForgotPassword(req, res) {
  const { email } = req.body;
  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email.toLowerCase()]);
    // Always show success to prevent user enumeration
    if (result.rows.length === 0) {
      return res.render("forgot-password", { error: null, success: "If that email exists, a reset link has been sent." });
    }
    const user = result.rows[0];
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 3600000); // 1 hour
    await pool.query(
      "UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3",
      [token, expires, user.id]
    );

    // Send email if configured
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
      });
      await transporter.sendMail({
        from: `"Blogsy" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: "Password Reset - Blogsy",
        html: `<p>Click <a href="${process.env.BASE_URL}/reset-password/${token}">here</a> to reset your password. This link expires in 1 hour.</p>`
      });
    }

    res.render("forgot-password", { error: null, success: "If that email exists, a reset link has been sent." });
  } catch (err) {
    console.error(err);
    res.render("forgot-password", { error: "Something went wrong.", success: null });
  }
}

// GET /reset-password/:token
export async function getResetPassword(req, res) {
  const { token } = req.params;
  const result = await pool.query(
    "SELECT * FROM users WHERE reset_token = $1 AND reset_token_expires > NOW()",
    [token]
  );
  if (result.rows.length === 0) {
    return res.render("reset-password", { error: "Invalid or expired reset link.", token: null });
  }
  res.render("reset-password", { error: null, token });
}

// POST /reset-password/:token
export async function postResetPassword(req, res) {
  const { token } = req.params;
  const { password, confirmPassword } = req.body;
  try {
    if (password !== confirmPassword) {
      return res.render("reset-password", { error: "Passwords do not match.", token });
    }
    if (password.length < 8) {
      return res.render("reset-password", { error: "Password must be at least 8 characters.", token });
    }
    const result = await pool.query(
      "SELECT * FROM users WHERE reset_token = $1 AND reset_token_expires > NOW()",
      [token]
    );
    if (result.rows.length === 0) {
      return res.render("reset-password", { error: "Invalid or expired reset link.", token: null });
    }
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    await pool.query(
      "UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2",
      [hash, result.rows[0].id]
    );
    res.redirect("/login?success=Password reset successfully. Please log in.");
  } catch (err) {
    console.error(err);
    res.render("reset-password", { error: "Something went wrong.", token });
  }
}
