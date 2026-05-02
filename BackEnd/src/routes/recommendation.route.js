import express from "express";
import {recommend_user} from "../controllers/recommendation.controllers.js";

const router = express.Router();

router.route("/").post(
    recommend_user
); 

export default router;