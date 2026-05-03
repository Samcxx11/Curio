import { GoogleGenAI } from "@google/genai";
import NewsAPI from "newsapi";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

// ── Category map ──────────────────────────────────────────────────────────────
const CATEGORIES = {
    "World": 1,
    "Technology": 2,
    "Sports": 3,
    "Business": 4,
    "Science": 5,
    "Entertainment": 6,
    "Politics": 7,
    "Environment": 8
};

const DEFAULT_CAT_ID = 1;

// ── Generic Gemini call ───────────────────────────────────────────────────────
export const callAI = async (prompt) => {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
    });
    return response.text;
};

// ── Categorize a news article (returns array of CatIDs, minimum 1) ────────────
export const categorizeNews = async (title = "", description = "") => {
    try {
        const prompt = `You are a news categorizer. Given the news title and description below, classify it into one or more of these categories:
World, Technology, Sports, Business, Science, Entertainment, Politics, Environment

Rules:
- Reply with ONLY the category names that apply, separated by commas
- Minimum 1 category, maximum 3 categories
- No punctuation other than commas, no explanation
- Use exact category names as written above
- Example response: "Technology, Business" or "Sports" or "Science, Environment"

Title: ${title}
Description: ${description || "N/A"}

Categories:`;

        const result = await callAI(prompt);

        // Parse comma separated response into array of CatIDs
        const catIds = result
            .trim()
            .split(",")
            .map(c => c.trim().replace(/[^a-zA-Z\s]/g, "").trim())
            .filter(c => CATEGORIES[c])         // only keep valid category names
            .map(c => CATEGORIES[c]);           // convert to CatIDs

        // Remove duplicates
        const unique = [...new Set(catIds)];

        // Always return at least one category
        return unique.length > 0 ? unique : [DEFAULT_CAT_ID];

    } catch (err) {
        console.log("Gemini categorization failed:", err.message);
        return [DEFAULT_CAT_ID];
    }
};

// ── Summarize a news article ──────────────────────────────────────────────────
export const summarizeNews = async (title = "", body = "") => {
    try {
        const prompt = `Summarize the following news article in 2-3 sentences. Be concise and factual.

Title: ${title}
Content: ${body}

Summary:`;

        const result = await callAI(prompt);
        return result.trim();

    } catch (err) {
        console.warn("Gemini summarization failed:", err.message);
        return "";
    }
};