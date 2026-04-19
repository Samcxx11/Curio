import {asyncHandler} from '../utils/asyncHandler.js';
import pool from '../db/db.js';
import {ApiError} from '../utils/ApiError.js';
import {ApiResponse} from '../utils/ApiResponse.js';

const recommend_user = asyncHandler(async (req, res) => {

    //---------------------------------------------
    // Steps for recommendation:
    // Check if recommendations for the user already exist in the database
    // 1. Get user ID
    // 2. Get recent news
    // 3. Get user embedding
    // 4. Query run to compare embeddings
    // 5. Save results in a table and delete old recommendations
    // 7. Send response
    //---------------------------------------------

    // Get user ID
    const userID = req.user.uid;
    console.log("User ID:", userID);

    // Check if recommendations for the user already exist in the database
    let client;
    try {
        client = await pool.connect();
        const existingRecommendationsQuery = `
            SELECT nid 
            FROM user_recommendations
            WHERE uid = $1 AND 
            recommended_at >= NOW() - INTERVAL '5 minutes'
        `;
        const existingRecommendationsResult = await pool.query(
            existingRecommendationsQuery, 
            [userID]
        );
        if (existingRecommendationsResult.rows.length > 0) {
            console.log("Existing recommendations found for user:", userID);
            return res
            .status(200)
            .json(new ApiResponse(
                true, 
                "Existing recommendations found", 
                existingRecommendationsResult.rows
            ));
        }

        // Get recent news
        const recentNewsQuery = `
            SELECT NID
            FROM news
            WHERE published_at >= NOW() - INTERVAL '6 hours'
            ORDER BY published_at DESC
        `;
        const recentNewsResult = await pool.query(recentNewsQuery);
        const recentNewsIDs = recentNewsResult.rows.map(row => row.nid);
        if (recentNewsIDs.length === 0) {
            throw new ApiError(404, "No recent news found");
        }
        console.log("Recent News IDs:", recentNewsIDs);

        // Query to get the user's embedding
        const userEmbeddingQuery = `
            SELECT embed 
            FROM user_embeddings 
            WHERE uid = $1`;
        const userEmbeddingResult = await pool.query(
            userEmbeddingQuery, 
            [userID]
        );
        if (userEmbeddingResult.rows.length === 0) {
            throw new ApiError(404, "User embedding not found");
        }
        const userEmbedding = userEmbeddingResult.rows[0].embed;
        console.log("User Embedding:", userEmbedding);

        // Query to run and compare embeddings
        const recommendationQuery = `
            SELECT NID, title, published_at, url, SID, AID
            FROM news_embeddings J JOIN news N ON J.NID = N.NID
            WHERE NID = ANY($1)
            ORDER BY (embed <=> $2)
            LIMIT 20
        `;
        const recommendationResult = await pool.query(
            recommendationQuery, 
            [recentNewsIDs, userEmbedding]
        );
        console.log("Recommended News:", recommendationResult.rows);

        // Save all recommended results in a table (optional, can be skipped if not needed)
        const deleteOldRecommendationsQuery = `
            DELETE FROM user_recommendations 
            WHERE uid = $1 AND recommended_at < NOW() - INTERVAL '5 minutes'
        `;
        await pool.query(
            deleteOldRecommendationsQuery, 
            [userID]
        );
        const saveRecommendationsQuery = `
            INSERT INTO user_recommendations (uid, nid, recommended_at)
            VALUES ($1, $2, NOW())
        `;
        for (const news of recommendationResult.rows) {
            await pool.query(
                saveRecommendationsQuery, 
                [userID, news.nid]
            );
        }
    } catch (err) {
        console.error("Recommendation error:", err);
        throw new ApiError(500, "An error occurred while generating recommendations");
    } finally {
        if (client) {
            client.release();
        }
    }
    //Send response
    res
    .status(200)
    .json(new ApiResponse(
        true, 
        "Recommendations generated successfully", 
        recommendationResult.rows
    ));
});

export { recommend_user };

