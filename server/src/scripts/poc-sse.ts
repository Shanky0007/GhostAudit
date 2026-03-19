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

  console.log('Starting TinyFish POC - SSE Streaming');
  console.log('Target: https://stripe.com/pricing\n');

  console.log('Initiating SSE stream...\n');

  const response = await fetch(`${TINYFISH_API}/automation/run-sse`, {
    method: 'POST',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
    },
    body: JSON.stringify({
      url: 'https://stripe.com/pricing',
      goal: 'Extract all pricing plan names and their monthly prices. Return ONLY valid JSON array: [{ plan_name: string, monthly_price: string }]',
      browser_profile: 'lite',
    }),
  });

  console.log('Response status:', response.status, response.statusText);
  console.log('Content-Type:', response.headers.get('content-type'));
  console.log();

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Failed to start SSE stream:', errorText.substring(0, 500));
    process.exit(1);
  }

  if (!response.body) {
    console.error('No response body received');
    process.exit(1);
  }

  console.log('Stream started, reading events...\n');

  // Read the SSE stream
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      // Check timeout
      if (Date.now() - startTime > TIMEOUT) {
        console.error('\n⏰ Timeout — TinyFish took too long (>360s / 6 minutes)');
        reader.cancel();
        process.exit(1);
      }

      const { done, value } = await reader.read();

      if (done) {
        console.log('\n✅ Stream ended');
        break;
      }

      // Decode the chunk and add to buffer
      buffer += decoder.decode(value, { stream: true });

      // Process complete lines
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.substring(6); // Remove "data: " prefix

          try {
            const event = JSON.parse(jsonStr) as any;
            
            // Handle different event types
            if (event.type === 'STARTED') {
              console.log(`[${formatTime()}] EVENT type=STARTED run_id=${event.run_id}`);
            } else if (event.type === 'STREAMING_URL') {
              console.log(`[${formatTime()}] EVENT type=STREAMING_URL`);
              console.log(`           Watch live: ${event.streaming_url}`);
            } else if (event.type === 'PROGRESS') {
              console.log(`[${formatTime()}] EVENT type=PROGRESS`);
              if (event.purpose) {
                console.log(`           Action: ${event.purpose}`);
              }
            } else if (event.type === 'HEARTBEAT') {
              // Silent - just keep-alive
            } else if (event.type === 'COMPLETE') {
              const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
              console.log(`[${formatTime()}] EVENT type=COMPLETE`);
              
              if (event.status === 'COMPLETED') {
                console.log('\n✅ Run completed successfully!');
                console.log(`⏱️  Total elapsed time: ${elapsedSeconds}s\n`);
                console.log('Result:');
                console.log(JSON.stringify(event.result, null, 2));
                process.exit(0);
              } else {
                console.error('\n❌ Run failed!');
                console.error('Status:', event.status);
                console.error('Error:', event.error?.message || 'Unknown error');
                process.exit(1);
              }
            } else {
              console.log(`[${formatTime()}] EVENT type=${event.type}`);
            }
          } catch (parseError) {
            // Ignore parse errors for non-JSON lines
          }
        }
      }
    }
  } catch (error) {
    console.error('Stream error:', error);
    process.exit(1);
  }

  // If we get here, stream ended without COMPLETE event
  console.error('\n❌ Stream ended without completion event');
  process.exit(1);
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
