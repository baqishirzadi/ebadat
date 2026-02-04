// Helper script to configure and deploy the `dua-autonomous` Supabase Edge Function
// Usage:
//   node scripts/setup-dua-autonomous.js
//
// This script:
// 1) Ensures .env exists with required keys
// 2) Runs `supabase secrets set --env-file .env`
// 3) Deploys the `dua-autonomous` function
// 4) Sends a test dua request and prints the response

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const PROJECT_DIR = "/Users/ahmad/Desktop/EbadatApp";
const FUNCTION_NAME = "dua-autonomous";
const FUNCTION_URL =
  "https://igsmyoghkkyetsyqbqlm.supabase.co/functions/v1/dua-autonomous";
const ENV_FILE = path.join(PROJECT_DIR, ".env");

function run(cmd) {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
}

function main() {
  // 1) Check .env
  if (!fs.existsSync(ENV_FILE)) {
    console.error(
      ".env file missing! Please create it with at least: OPENAI_API_KEY, SB_URL (or SUPABASE_URL), SERVICE_ROLE_KEY (or SUPABASE_SERVICE_ROLE_KEY)."
    );
    process.exit(1);
  }
  console.log(".env file found ✅");

  // 2) Set Supabase secrets from .env
  console.log("\nSetting Supabase secrets from .env...");
  run(`cd ${PROJECT_DIR} && supabase secrets set --env-file .env`);

  // 3) Deploy the function (does NOT touch index.ts)
  console.log("\nDeploying Edge Function...");
  run(`cd ${PROJECT_DIR} && supabase functions deploy ${FUNCTION_NAME}`);

  // 4) Test the function with a sample dua
  console.log("\nTesting function with sample dua...");
  const testPayload = JSON.stringify({
    message: "یک دعا برای آرامش دل میخواهم",
    gender: "male",
    language: "fa",
  }).replace(/"/g, '\\"'); // escape for shell

  const curlCmd = `curl -sS -H "Content-Type: application/json" -d "${testPayload}" ${FUNCTION_URL}`;
  console.log(`\n$ ${curlCmd}`);
  try {
    const result = execSync(curlCmd, { encoding: "utf8" });
    console.log("Function test result:", result);
  } catch (err) {
    console.error("Error calling function:", err.message);
  }

  console.log("\n✅ dua-autonomous setup script completed.");
}

main();

