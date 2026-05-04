import {asyncHandler} from '../utils/asyncHandler.js';
import pool from '../db/db.js';
import {ApiError} from '../utils/ApiError.js';
import {ApiResponse} from '../utils/ApiResponse.js';

const recommend_user = asyncHandler(async (req, res) => {
    const userID = req.body.uid;
    let client;
    let recommendedNews = []; // moved outside try

    try {
        client = await pool.connect();

        // Check existing recommendations (within 5 mins)
        const existingResult = await client.query(
            `SELECT n.nid, n.title, n.url, n.published_at, s.s_name as source
             FROM user_recommendations ur
             JOIN news n ON ur.nid = n.nid
             JOIN sources s ON n.sid = s.sid
             WHERE ur.uid = $1 
             AND ur.recommended_at >= NOW() - INTERVAL '5 minutes'`,
            [userID]
        );

        if (existingResult.rows.length > 0) {
            return res.status(200).json(new ApiResponse(
                200,
                existingResult.rows,
                "Existing recommendations found"
            ));
        }

        // Get recent news IDs
        const recentNewsResult = await client.query(
            `SELECT NID FROM news
             WHERE published_at >= NOW() - INTERVAL '6 hours'
             ORDER BY published_at DESC`
        );
        console.log("Recent news IDs:", recentNewsResult);
        const recentNewsIDs = recentNewsResult.rows.map(row => row.nid);

        if (recentNewsIDs.length === 0) {
            throw new ApiError(404, "No recent news found");
        }

        // Get user embedding
        const userEmbeddingResult = await client.query(
            `SELECT embed FROM user_embeddings WHERE uid = $1`,
            [userID]
        );

        if (userEmbeddingResult.rows.length === 0) {
            throw new ApiError(404, "User embedding not found");
        }
        const userEmbedding = userEmbeddingResult.rows[0].embed;

        // Get recommendations by similarity
        const recommendationResult = await client.query(
            `SELECT n.nid, n.title, n.published_at, n.url, n.sid, n.aid,
                    s.s_name as source
             FROM news_embeddings ne
             JOIN news n ON ne.nid = n.nid
             JOIN sources s ON n.sid = s.sid
             WHERE n.nid = ANY($1)
             ORDER BY (ne.embed <=> $2)
             LIMIT 20`,
            [recentNewsIDs, userEmbedding]
        );

        recommendedNews = recommendationResult.rows;

        // Clear old recommendations and save new ones
        await client.query(
            `DELETE FROM user_recommendations WHERE uid = $1`,
            [userID]
        );

        for (const news of recommendedNews) {
            await client.query(
                `INSERT INTO user_recommendations (uid, nid, recommended_at)
                 VALUES ($1, $2, NOW())`,
                [userID, news.nid]
            );
        }

    } catch (err) {
        console.error("Recommendation error:", err);
        throw new ApiError(500, err.message || "Error generating recommendations");
    } finally {
        if (client) client.release();
    }

    return res.status(200).json(new ApiResponse(
        200,
        recommendedNews,
        "Recommendations generated successfully"
    ));
});

export { recommend_user };

