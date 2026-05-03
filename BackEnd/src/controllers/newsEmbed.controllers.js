import pool from "../db/db.js";
import axios from "axios";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { meanEmbedding, normalize } from "../utils/helperFunc.utils.js";

// ── Helper: parse pgvector string to JS array ─────────────────────────────────
// pgvector returns embeddings as "[0.1,0.2,...]" strings — must be parsed
const parseEmbed = (e) => {
    if (!e) return null;
    try {
        const parsed = typeof e === 'string' ? JSON.parse(e) : e;
        if (!Array.isArray(parsed)) return null;
        if (parsed.some(v => isNaN(v))) return null; // reject NaN arrays
        return parsed;
    } catch {
        return null;
    }
};

// ── Helper: format JS array to pgvector string "[0.1,0.2,...]" ───────────────
const formatEmbed = (arr) => `[${arr.join(',')}]`;

// ─────────────────────────────────────────────────────────────────────────────
// createNewsEmbedding
// Called as a route handler: POST /api/news/embeddings
// Body: { news: [{ NID, title, description }, ...] }
// ─────────────────────────────────────────────────────────────────────────────
const createNewsEmbedding = asyncHandler(async (req, res) => {
    const news = req.body.news;

    if (!news || news.length === 0) {
        throw new ApiError(400, "News data is required for embedding calculation");
    }

    const embeddings = [];

    for (const item of news) {
        try {
            const response = await axios.post(
                "http://localhost:8000/calculate_embeddings/news",
                {
                    title: item.title,
                    description: item.description || ""
                },
                { timeout: 10000 }
            );
            embeddings.push({
                NID: item.NID,
                embed: response.data.embedding
            });
        } catch (err) {
            console.warn(`Embedding failed for NID ${item.NID}:`, err.message);
        }
    }

    if (embeddings.length === 0) {
        throw new ApiError(500, "No embeddings could be calculated");
    }

    let client;
    try {
        client = await pool.connect();
        for (const emb of embeddings) {
            await client.query(
                `INSERT INTO news_embeddings (NID, embed)
                 VALUES ($1, $2)
                 ON CONFLICT (NID) DO UPDATE SET embed = EXCLUDED.embed`,
                [emb.NID, formatEmbed(emb.embed)]
            );
        }
    } catch (err) {
        console.error("Database error:", err);
        throw new ApiError(500, "An error occurred while saving news embeddings");
    } finally {
        if (client) client.release();
    }

    return res
        .status(200)
        .json(new ApiResponse(200, { count: embeddings.length }, "Embeddings saved successfully"));
});

// ─────────────────────────────────────────────────────────────────────────────
// cat_embedding
// NOT a route handler — called directly as a function (e.g. from cron/ingestion)
// Updates the embedding for each category based on its news articles
// ─────────────────────────────────────────────────────────────────────────────
const cat_embedding = async () => {
    let client;
    try {
        client = await pool.connect();

        const categoryResult = await client.query(`SELECT * FROM categories`);
        const categories = categoryResult.rows;
        const alpha = 0.2;

        for (const category of categories) {
            const newsResult = await client.query(
                `SELECT news_embeddings.embed
                 FROM news_embeddings
                 JOIN news ON news_embeddings.NID = news.NID
                 WHERE news.CatID = $1`,
                [category.catid]
            );

            // No articles for this category yet — skip until first article arrives
            if (newsResult.rows.length === 0) continue;

            // Parse each embed from pgvector string to JS array, filter out bad ones
            const rawEmbeds = newsResult.rows
                .map(row => parseEmbed(row.embed))
                .filter(e => e !== null);

            if (rawEmbeds.length === 0) continue;

            const newsEmbeddings = normalize(meanEmbedding(rawEmbeds));

            // Parse existing category embedding if present
            const existingEmbed = parseEmbed(category.embeddings);

            let updatedEmbedding;
            if (existingEmbed === null) {
                // New category — initialize with current news embeddings
                updatedEmbedding = newsEmbeddings;
            } else {
                // Existing category — blend with exponential moving average
                updatedEmbedding = normalize(
                    existingEmbed.map((val, idx) =>
                        (1 - alpha) * val + alpha * newsEmbeddings[idx]
                    )
                );
            }

            // Save back to DB in correct pgvector format
            await client.query(
                `UPDATE categories SET embeddings = $1 WHERE CatID = $2`,
                [formatEmbed(updatedEmbedding), category.catid]
            );

            console.log(`✅ Category [${category.catid}] embedding updated`);
        }

    } catch (err) {
        console.error("Database error:", err);
        throw new ApiError(500, "An error occurred while saving category embeddings");
    } finally {
        if (client) client.release();
    }
};

export {
    createNewsEmbedding,
    cat_embedding
};