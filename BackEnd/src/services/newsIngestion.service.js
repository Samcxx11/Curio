import NewsAPI from "newsapi";
import pool from "../db/db.js";
import axios from "axios";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {createNewsEmbedding,cat_embedding} from "../controllers/newsEmbed.controllers.js";

const newsapi = new NewsAPI(process.env.NEWS_API_KEY);

// ── Call the embeddings server (port 8000) ────────────────────────────────────
const getNewsEmbedding = async ({ title, description }) => {
    const response = await axios.post("http://localhost:8000/calculate_embeddings/news", {
        title,
        description: description || ""
    });
    return response.data.embedding;
};

// ── Call the detection server (port 8001) ─────────────────────────────────────
const getNewsScore = async ({ title, description, source }) => {
    try {
        const response = await axios.post("http://localhost:8001/score", {
            title,
            description: description || "",
            source: source || ""
        });
        return response.data; // { fake_score, clickbait_score, source_score, total_score }
    } catch (err) {
        console.error("Detection API error:", err.message);
        return { fake_score: 0.5, clickbait_score: 0.5, source_score: 0.5, total_score: 50 };
    }
};

// ── Upsert source, return SID ─────────────────────────────────────────────────
const upsertSource = async (client, sourceName) => {
    const domain = sourceName?.toLowerCase().replace(/\s+/g, "") || "unknown";
    const res = await client.query(
        `INSERT INTO sources (s_name, domain_name)
         VALUES ($1, $2)
         ON CONFLICT (domain_name) DO UPDATE SET s_name = EXCLUDED.s_name
         RETURNING SID`,
        [sourceName || "Unknown", domain]
    );
    return res.rows[0].sid;
};

// ── Upsert author, return AID ─────────────────────────────────────────────────
const upsertAuthor = async (client, authorName) => {
    const name = authorName || "Unknown";
    const res = await client.query(
        `INSERT INTO authors (a_name)
         VALUES ($1)
         ON CONFLICT DO NOTHING
         RETURNING AID`,
        [name]
    );
    if (res.rows.length > 0) return res.rows[0].aid;
    // Already existed — fetch it
    const existing = await client.query(
        `SELECT AID FROM authors WHERE a_name = $1 LIMIT 1`, [name]
    );
    return existing.rows[0].aid;
};

// ── Main ingestion function ───────────────────────────────────────────────────
const fetchNews = async () => {
    let client;
    try {
        const sources = await newsapi.v2.sources({ language: "en" });
        const response = await newsapi.v2.everything({
            language: "en",
            sortBy: "publishedAt",
            pageSize: 100,
            sources: sources.sources.map(s => s.id).join(",")
        });

        const articles = response.articles;
        console.log(`Fetched ${articles.length} articles`);

        client = await pool.connect();

        for (const article of articles) {
            // Skip articles missing required fields
            if (!article.title || !article.url) continue;

            try {
                // Check for duplicate URL
                const exists = await client.query(
                    `SELECT 1 FROM news WHERE url = $1`, [article.url]
                );
                if (exists.rows.length > 0) continue;

                // Resolve SID and AID
                const sid = await upsertSource(client, article.source?.name);
                const aid = await upsertAuthor(client, article.author);

                // Insert news row (CatID = 1 as default — update with classifier later)
                const newsResult = await client.query(
                    `INSERT INTO news (title, description, url, published_at, SID, AID, CatID)
                     VALUES ($1, $2, $3, $4, $5, $6, 1)
                     RETURNING NID`,
                    [
                        article.title,
                        article.description || "",
                        article.url,
                        article.publishedAt,
                        sid,
                        aid
                    ]
                );
                const nid = newsResult.rows[0].nid;
                console.log(`Saved article: [${nid}] ${article.title.slice(0, 60)}…`);

                // Get embedding (fire-and-forget pattern — skip if service is down)
                let embedding = null;
                try {
                    embedding = await getNewsEmbedding({
                        title: article.title,
                        description: article.description
                    });
                    await client.query(
                        `INSERT INTO news_embeddings (NID, embed) VALUES ($1, $2)`,
                        [nid, JSON.stringify(embedding)]
                    );
                } catch (embedErr) {
                    console.warn(`Embedding skipped for ${nid}:`, embedErr.message);
                }

                // 5. Get fake/clickbait score and save it
                const scores = await getNewsScore({
                    title: article.title,
                    description: article.description,
                    source: article.source?.name
                });
                await client.query(
                    `INSERT INTO fake_score (NID, clickbait_score, f_score)
                     VALUES ($1, $2, $3)
                     ON CONFLICT (NID) DO UPDATE
                       SET clickbait_score = EXCLUDED.clickbait_score,
                           f_score = EXCLUDED.f_score`,
                    [nid, scores.clickbait_score, scores.total_score]
                );

                console.log(`Saved: [${nid}] ${article.title.slice(0, 60)}…`);

            } catch (articleErr) {
                // Log per-article errors without aborting the whole batch
                console.error(`Failed to save article: ${article.url}`, articleErr.message);
            }
          }
          // After processing all articles, update category embeddings
          await cat_embedding();
      } catch (err) {
          console.error("News ingestion error:", err);
      } finally {
          if (client) client.release();
      }
};

export default fetchNews;
