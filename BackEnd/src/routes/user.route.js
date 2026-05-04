import express from "express";
import { newUserEmbedding, updateUserEmbedding } from "../controllers/userEmbed.controllers.js";

const router = express.Router();

router.route("/embedding/new").post(newUserEmbedding);
router.route("/embedding/update").post(updateUserEmbedding);

export default router;