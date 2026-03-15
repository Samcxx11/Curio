import NewsAPI from "newsapi";
import pool from "../db/db.js";
import axios from "axios";
import fs from "fs";
import path from "path";

const newsapi = new NewsAPI(process.env.NEWS_API_KEY);

async function getNewsEmbedding(news) {

  const response = await axios.post("http://localhost:8000/calculate_embeddings/news", {
        title: news.title,
        description: news.description
    });
  return response.data.embedding;

}

async function fetchNews() {

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

        //save article in .csv file
        const csvFilePath = path.resolve("src/services/news_articles.csv");      
        const csvHeaders = "title,description,embedding\n";

        // Write headers if file does not exist
        if (!fs.existsSync(csvFilePath)) {
            console.log("Creating CSV file with headers");
            fs.writeFileSync(csvFilePath, csvHeaders);
        }

        // Escape double quotes and commas in CSV fields
        function escapeCsvField(field) {
            if (!field) return "";
            return `"${String(field).replace(/"/g, '""')}"`;
        }
        const news = {
            title: article.title,
            description: article.description || ""
        };
        const embedding = await getNewsEmbedding(news);
        const csvLine = `${escapeCsvField(article.title)},${escapeCsvField(article.description)},${escapeCsvField(embedding)}\n`;
        fs.appendFileSync(csvFilePath, csvLine);
          
    }

  } catch (err) {

    console.error("News ingestion error:", err);

  }

}

export default fetchNews;