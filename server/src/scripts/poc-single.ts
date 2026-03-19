import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

// Load .env from root directory (one level up from server/)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../../../.env') });

const TINYFISH_API = 'https://agent.tinyfish.ai/v1';
const API_KEY = process.env.TINYFISH_API_KEY!;

interface RunResponse {
  run_id: string;
}

interface StatusResponse {
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  result?: any;
  error?: string;
}

function formatTime(): string {
  const now = new Date();
  return now.toTimeString().split(' ')[0];
}

async function main() {
  const startTime = Date.now();

  if (!API_KEY) {
    console.error('Error: TINYFISH_API_KEY not found in environment variables');
    process.exit(1);
  }

  console.log('Starting TinyFish POC - Single Run');
  console.log('Target: https://www.producthunt.com/products/notion\n');

  // Step 1: Start async run
  console.log('Initiating async run...');
  const runResponse = await fetch(`${TINYFISH_API}/automation/run-async`, {
    method: 'POST',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: 'https://www.producthunt.com/products/notion',
      goal: 'Extract the product name, tagline, total upvote count, and text of the top 3 user reviews. Return ONLY valid JSON: { product_name: string, tagline: string, upvotes: number, reviews: string[] }',
      browser_profile: 'lite',
    }),
  });

  if (!runResponse.ok) {
    console.error('Failed to start run:', await runResponse.text());
    process.exit(1);
  }

  const { run_id } = (await runResponse.json()) as RunResponse;
  console.log(`Run started: ${run_id}\n`);

  // Step 2 & 3: Poll for completion
  const POLL_INTERVAL = 3000; // 3 seconds
  const TIMEOUT = 360000; // 360 seconds (6 minutes)

  while (Date.now() - startTime < TIMEOUT) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));

    const statusResponse = await fetch(`${TINYFISH_API}/runs/${run_id}`, {
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (!statusResponse.ok) {
      const errorText = await statusResponse.text();
      console.error(`Failed to poll status (${statusResponse.status}):`, errorText.substring(0, 200));
      process.exit(1);
    }

    const statusData = (await statusResponse.json()) as StatusResponse;
    console.log(`[${formatTime()}] Polling... status=${statusData.status}`);

    // Step 4: Handle COMPLETED
    if (statusData.status === 'COMPLETED') {
      const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log('\n✅ Run completed successfully!');
      console.log(`⏱️  Total elapsed time: ${elapsedSeconds}s\n`);
      console.log('Result:');
      console.log(JSON.stringify(statusData.result, null, 2));
      process.exit(0);
    }

    // Step 5: Handle FAILED
    if (statusData.status === 'FAILED') {
      console.error('\n❌ Run failed!');
      console.error('Error:', statusData.error || 'Unknown error');
      process.exit(1);
    }
  }

  // Step 6: Handle timeout
  console.error('\n⏰ Timeout — TinyFish took too long (>360s / 6 minutes)');
  process.exit(1);
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
