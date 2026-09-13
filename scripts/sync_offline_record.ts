import { executeOfflineRecordPushToGitHub, formatARTDate, isWeekendInART } from "../src/lib/offlineBlogRecord.js";

async function main() {
  console.log("==================================================");
  console.log("MERIDIAN RESEARCH JOURNAL - OFFLINE BLOG RECORD AUTOMATION");
  console.log("==================================================");
  
  const now = new Date();
  const dateStr = formatARTDate(now);
  const isWeekend = isWeekendInART(now);

  console.log(`Current ART Date: ${dateStr}`);
  console.log(`Is Weekend: ${isWeekend ? "YES (- Weekend)" : "NO (Article Title)"}`);
  console.log("Target File: https://github.com/LuuOW/Meridian-Research-Journal/blob/main/offline_blog_record");
  console.log("Executing push straight to main modifying ONLY offline_blog_record...");

  try {
    const result = await executeOfflineRecordPushToGitHub({ date: now });
    if (result.success) {
      console.log("SUCCESS!");
      console.log(`Message: ${result.message}`);
      if (result.commitUrl) {
        console.log(`Commit URL: ${result.commitUrl}`);
      }
      console.log("Recorded Entry:");
      console.log(result.entry);
      process.exit(0);
    } else {
      console.error("PUSH FAILED:");
      console.error(result.error || result.message);
      process.exit(1);
    }
  } catch (err: any) {
    console.error("FATAL ERROR during offline record automation:", err);
    process.exit(1);
  }
}

main();
