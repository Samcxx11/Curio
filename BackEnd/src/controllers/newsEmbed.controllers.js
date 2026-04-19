import pool from "../db/db.js";
import axios from "axios";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { get } from "http";
import { asyncHandler } from "../utils/asyncHandler.js";
import { meanEmbedding, normalize } from "../utils/helperFunc.utils.js";

const createNewsEmbedding = asyncHandler(async (req, res) => {
    const news = req.body.news;
    if(news.length === 0) {
        throw new ApiError(400, "News data is required for embedding calculation");
    }
    let embedding = [];
    for(const key in news) {
        const response = await axios.post("http://localhost:8000/calculate_embeddings/news", {
            title: key.title,
            description: key.description
        });
        embedding.push({
            NID : key.NID,
            embed: response.data.embedding
        });
    }
    let client;
    try {
        client = await pool.connect();
        const insertQuery = `
            INSERT INTO news_embeddings (NID, embed)
            VALUES ($1, $2)
        `;
        for (const emb of embedding) {
            await client.query(
                insertQuery,
                [emb.NID, emb.embed]
            );
        }
    } catch (err) {
        console.error("Database error:", err);
        throw new ApiError(500, "An error occurred while saving news embeddings");
    } finally {
        if (client) {
            client.release();
        }
    }
    return response.data.embedding;

});

const cat_embedding = asyncHandler(async (req, res) => {
    let client;
    try {
        client = await pool.connect();

        //retrieve all categories
        const categoryQuery = `
            SELECT*
            FROM categories
        `;
        const categoryResult = await client.query(categoryQuery);
        const categories = categoryResult.rows;
        const alpha = 0.2;

        //calculate embeddings for each category
        for(const category of categories) {
            const find_cat = `
                SELECT news_embeddings.NID, news_embeddings.embed, news.CatID
                FROM news_embeddings
                JOIN news ON news_embeddings.NID = news.NID
                WHERE news.CatID = $1
            `;
            const newsResult = await client.query(
                find_cat, 
                [category.catid]
            );
            const newsEmbeddings = normalize(meanEmbedding(newsResult.rows.map(row => row.embed)));
            if(category.embedding === null) {
                category.embedding = newsEmbeddings;
            }
            else {
                category.embedding = normalize(category.embedding.map((val, idx) =>
                    (1 - alpha) * val + alpha * newsEmbeddings[idx]
                ));
            }
            const updateQuery = `
                UPDATE categories
                SET embedding = $1
                WHERE CatID = $2
            `;
            await client.query(
                updateQuery, 
                [category.embedding, category.catid]
            );
        }
    } catch (err) {
        console.error("Database error:", err);
        throw new ApiError(500, "An error occurred while saving category embeddings");
    } finally {
        if (client) {
            client.release();
        }
    }
});

export default {
    createNewsEmbedding,
    cat_embedding
};