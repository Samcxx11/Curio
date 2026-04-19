import NewsAPI from "newsapi";
import pool from "../db/db.js";
import axios from "axios";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const newsapi = new NewsAPI(process.env.NEWS_API_KEY);

const fetchNews = asyncHandler(async () => {
  try {

    const sources = await newsapi.v2.sources({
        language: 'en'
    });
    const response = await newsapi.v2.everything({
        language: "en",
        sortBy: "publishedAt",
        pageSize: 100,
        sources: sources.sources.map(source => source.id).join(",")
    });

    const articles = response.articles;

    console.log("Fetched:", articles.length);
    console.log("First:", articles[0].title);
    console.log("Last:", articles[articles.length - 1].title);

    for (const article of articles) {
      const news = {
        title: article.title,
        description: article.description,
        published_at: article.publishedAt,
        source: article.source.name,
        author: article.author,
        url: article.url

      }
      const embed_input = {
          title: article.title,
          description: article.description || ""
      };
      const embedding = await getNewsEmbedding(embed_input);
    }
    return res
      .status(200)
      .json(new ApiResponse(
        true, 
        "News fetched successfully", 
        { ...news, embedding }
      ));

  } catch (err) {

    console.error("News ingestion error:", err);

  }

});

export default {
  fetchNews,
  getNewsEmbedding
};