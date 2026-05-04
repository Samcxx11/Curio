import pool from "../db/db.js";
import axios from "axios";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { get } from "http";
import { asyncHandler } from "../utils/asyncHandler.js";
import { meanEmbedding, normalize } from "../utils/helperFunc.utils.js";

const newUserEmbedding = asyncHandler(async (req, res) => {
    const userID = req.user.uid;
    const categories = req.body.categories;
    if(categories.length === 0) {
        throw new ApiError(400, "At least one category is required for embedding calculation");
    }
    let client;
    try {
        client = await pool.connect();
        const categoryQuery = `
            SELECT embeddings
            FROM categories
            WHERE category_name In ($1)
        `;
        const categoryResult = await client.query(
            categoryQuery, 
            [categories]
        );
        if (categoryResult.rows.length === 0) {
            throw new ApiError(404, "No embeddings found for the provided categories");
        }
        const categoryEmbeddings = categoryResult.rows.map(row => row.embeddings);
        const meanCategoryEmbedding = meanEmbedding(categoryEmbeddings);
        const normalizedEmbedding = normalize(meanCategoryEmbedding);
        const insertQuery = `
            INSERT INTO user_embeddings (uid, embed)
            VALUES ($1, $2)
            ON CONFLICT (uid) DO UPDATE SET embed = EXCLUDED.embed
        `;
        await client.query(
            insertQuery,
            [userID, normalizedEmbedding]
        );
    } catch (err) {
        console.error("Database error:", err);
        throw new ApiError(500, "An error occurred while saving user embedding");
    } finally {
        if (client) {
            client.release();
        }
    }
});

const updateUserEmbedding = asyncHandler(async (req, res) => {
    const userID = req.body.uid;
    const news = req.body.news;
    if(news.length === 0) {
        throw new ApiError(400, "News data is required for embedding calculation");
    }
    let client;
    try {
        client = await pool.connect();
        const userEmbeddingQuery = `
            SELECT embed
            FROM user_embeddings
            WHERE uid = $1
        `;
        const userEmbeddingResult = await client.query(
            userEmbeddingQuery,
            [userID]
        );
        if (userEmbeddingResult.rows.length === 0) {
            throw new ApiError(404, "User embedding not found");
        }
        const userEmbedding = userEmbeddingResult.rows[0].embed;

        for(const item of news){
            const newsID = item.nid;
            const newsQuery = `
                SELECT embed
                FROM news_embeddings
                WHERE NID = $1
            `;
            const newsResult = await client.query(
                newsQuery, 
                [newsID]
            );
            if (newsResult.rows.length === 0) {
                throw new ApiError(404, "No embedding found for the provided news ID");
            }
            const newsEmbedding = newsResult.rows[0].embed;
            
            const alpha = 0.2;
            const updatedEmbedding = normalize(userEmbedding.map((val, idx) => {
                return alpha * val + (1 - alpha) * newsEmbedding[idx];
            }));
            
            const updateQuery = `
                UPDATE user_embeddings
                SET embed = $1
                WHERE uid = $2
            `;
        }
        await client.query(
            updateQuery,
             [updatedEmbedding, userID]
        );
    } catch (err) {
        console.error("Database error:", err);
        throw new ApiError(500, "An error occurred while updating user embedding");
    } finally {
        if (client) {
            client.release();
        }
    }
});

export {
    newUserEmbedding,
    updateUserEmbedding
};