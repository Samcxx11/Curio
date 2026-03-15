import cron from "node-cron";
import fetchNews from "./newsIngestion.service.js";

function startNewsCron() {

  console.log("News cron initialized");

  cron.schedule("*/ * * * * *", async () => {
    console.log("Running news ingestion...");
    await fetchNews();
  });

}

export { startNewsCron };