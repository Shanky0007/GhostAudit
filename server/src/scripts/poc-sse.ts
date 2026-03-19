import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

// Load .env from root directory (one level up from server/)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../../../.env') });

const TINYFISH_API = 'https://agent.tinyfish.ai/v1';
const API_KEY = process.env.TINYFISH_API_KEY!;

interface SSEEvent {
  type: string;
  data?: any;
  error?: string;
}

function formatTime(): string {
  const now = new Date();
  return now.toTimeString().split(' ')[0];
}

async function main() {
  const startTime = Date.now();
  const TIMEOUT = 360000; // 360 seconds (6 minutes) - same as poc-single

  if (!API_KEY) {
    console.error('Error: TINYFISH_API_KEY not found in environment variables');
    process.exit(1);
  }

  console.log('Starting TinyFish POC - SSE Streaming (Simulated)');
  console.log('Target: https://stripe.com/pricing');
  console.log('Note: TinyFish does not support native SSE, simulating with polling\n');

  console.log('Initiating async run...\n');

  // Use run-async endpoint instead
  const response = await fetch(`${TINYFISH_API}/automation/run-async`, {
    method: 'POST',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: 'https://stripe.com/pricing',
      goal: 'Extract all pricing plan names and their monthly prices. Return ONLY valid JSON array: [{ plan_name: string, monthly_price: string }]',
      browser_profile: 'lite',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Failed to start run:', errorText.substring(0, 500));
    process.exit(1);
  }

  const { run_id } = await response.json();
  console.log(`[${formatTime()}] EVENT type=STARTED run_id=${run_id}\n`);

  // Simulate SSE by polling and emitting events
  const POLL_INTERVAL = 3000;
  let lastStatus = '';

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
      console.error(`Failed to poll status:`, errorText.substring(0, 200));
      process.exit(1);
    }

    const statusData = await statusResponse.json();
    
    // Emit event only if status changed
    if (statusData.status !== lastStatus) {
      console.log(`[${formatTime()}] EVENT type=${statusData.status}`);
      lastStatus = statusData.status;
    }

    if (statusData.status === 'COMPLETED') {
      const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log('\n✅ Run completed successfully!');
      console.log(`⏱️  Total elapsed time: ${elapsedSeconds}s\n`);
      console.log('Result:');
      console.log(JSON.stringify(statusData.result, null, 2));
      console.log('\n📊 Events emitted: STARTED → PENDING → RUNNING → COMPLETED');
      process.exit(0);
    }

    if (statusData.status === 'FAILED') {
      console.error('\n❌ Run failed!');
      console.error('Error:', statusData.error || 'Unknown error');
      process.exit(1);
    }
  }

  console.error('\n⏰ Timeout — TinyFish took too long (>360s / 6 minutes)');
  process.exit(1);
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
