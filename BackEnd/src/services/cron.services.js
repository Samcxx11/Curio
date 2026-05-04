import cron from "node-cron";
import newsServices from "./newsIngestion.service.js";

function startNewsCron() {

  console.log("News cron initialized");
  
  cron.schedule("*/1 * * * *", async () => { //Ingesting news at every minute
    console.log("Running news ingestion...");
    await newsServices.fetchNews();
  });
}

export { startNewsCron };