import {asyncHandler} from '../utils/asyncHandler.js';
import pool from '../db/db.js';
import {ApiError} from '../utils/ApiError.js';
import {ApiResponse} from '../utils/ApiResponse.js';
import axios from "axios";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import { spawn } from "child_process";
import { totalmem } from 'os';

const getNewsScore = async ({ title, description, source }) => {
    console.log("calculating score......");
    try {
        const response = await axios.post("http://localhost:8002/score", {
            title,
            description: description || "",
            source: source || ""
        });
        console.log("score of news ", response.data)
        return response.data; // { fake_score, clickbait_score, source_score, total_score }
    } catch (err) {
        console.error("Detection API error:", err.message);
        return { fake_score: 0.5, clickbait_score: 0.5, source_score: 0.5, total_score: 50 };
    }
};

const analyzeUrl = asyncHandler(async (req, res) => {
    console.log("ANALYZE URL CALLED WITH:", req.body);
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ message: "URL is required" });
  }

  try {
    // 🔹 1. Fetch HTML
    const response = await axios.get(url, {
    headers: {
      "User-Agent": "Mozilla/5.0"
    },
    timeout: 5000
  });

  const dom = new JSDOM(response.data, { url });
  const reader = new Readability(dom.window.document);

  const article = reader.parse();

  if (!article) {
    return res.status(400).json({
      message: "Could not extract article"
    });
  }

  const { title, textContent } = article;

  const scores = await getNewsScore({
    title,
    description: textContent,
    source: new URL(url).hostname
  });

  console.log("Final scores:", scores);

  return res.json(new ApiResponse(
    200,
    {
      title,
      content: textContent.slice(0, 1000),
      scores
    }
  ));
  } catch (err) {
    console.error("Error analyzing URL:", err.message);
    return res.status(500).json({ message: "Failed to analyze URL" });
  }
});

export default analyzeUrl;