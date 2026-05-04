import express from "express";
import analyzeUrl from "../controllers/analyze_url.controllers.js";

const router = express.Router();

router.route("/analyze-url").post(analyzeUrl);

export default router;