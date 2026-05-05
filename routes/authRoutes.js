import express from "express";
import {
  getLogin, postLogin, getRegister, postRegister, getLogout,
  getForgotPassword, postForgotPassword, getResetPassword, postResetPassword
} from "../controllers/authController.js";

const router = express.Router();

router.get("/login", getLogin);
router.post("/login", postLogin);
router.get("/register", getRegister);
router.post("/register", postRegister);
router.get("/logout", getLogout);
router.get("/forgot-password", getForgotPassword);
router.post("/forgot-password", postForgotPassword);
router.get("/reset-password/:token", getResetPassword);
router.post("/reset-password/:token", postResetPassword);

export default router;
