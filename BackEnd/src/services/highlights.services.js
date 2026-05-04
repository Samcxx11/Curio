import NewsAPI from 'newsapi';
import dotenv from 'dotenv';

dotenv.config();

const newsapi = new NewsAPI(process.env.NEWS_API_KEY);

async function getHeadlines() {
  console.log("Headlines response:");
  try {
    const response = await newsapi.v2.topHeadlines({
      language: 'en',
      country: 'us', // or 'in'
      pageSize: 10
    });
    console.log(response.articles);
  } catch (err) {
    console.error(err);
  }
}

getHeadlines();