import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';
import pLimit from 'p-limit';

// Load .env from root directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../../../.env') });

const TINYFISH_API = 'https://agent.tinyfish.ai/v1';
const API_KEY = process.env.TINYFISH_API_KEY!;
const CONCURRENCY = parseInt(process.env.AGENT_CONCURRENCY || '2');
const USE_SSE = process.env.USE_SSE === 'true'; // Toggle SSE vs Polling

interface Task {
  url: string;
  goal: string;
}

interface TaskResult {
  url: string;
  product: string;
  plansFound: number;
  timeSeconds: number;
  status: 'SUCCESS' | 'FAILED';
  error?: string;
}

const tasks: Task[] = [
  { url: 'https://stripe.com/pricing', goal: 'Extract plan names and prices as JSON array: [{ plan_name, price }]' },
  { url: 'https://notion.so/pricing', goal: 'Extract plan names and prices as JSON array: [{ plan_name, price }]' },
  { url: 'https://linear.app/pricing', goal: 'Extract plan names and prices as JSON array: [{ plan_name, price }]' },
  { url: 'https://vercel.com/pricing', goal: 'Extract plan names and prices as JSON array: [{ plan_name, price }]' },
  { url: 'https://supabase.com/pricing', goal: 'Extract plan names and prices as JSON array: [{ plan_name, price }]' },
  { url: 'https://render.com/pricing', goal: 'Extract plan names and prices as JSON array: [{ plan_name, price }]' },
];

function extractProductName(url: string): string {
  const match = url.match(/https?:\/\/([^.]+)\./);
  return match ? match[1].charAt(0).toUpperCase() + match[1].slice(1) : 'Unknown';
}

async function runTaskWithSSE(task: Task, taskName: string): Promise<TaskResult> {
  const startTime = Date.now();
  const product = extractProductName(task.url);

  try {
    const response = await fetch(`${TINYFISH_API}/automation/run-sse`, {
      method: 'POST',
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify({
        url: task.url,
        goal: task.goal,
        browser_profile: 'lite',
      }),
    });

    if (!response.ok || !response.body) {
      throw new Error(`Failed to start SSE stream: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    const TIMEOUT = 600000; // 10 minutes

    while (true) {
      if (Date.now() - startTime > TIMEOUT) {
        reader.cancel();
        throw new Error('Timeout - task took longer than 10 minutes');
      }

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const event = JSON.parse(line.substring(6));

            if (event.type === 'STARTED') {
              console.log(`  [${taskName}] Started (run_id: ${event.run_id})`);
            } else if (event.type === 'STREAMING_URL') {
              console.log(`  [${taskName}] Watch live: ${event.streaming_url}`);
            } else if (event.type === 'PROGRESS' && event.purpose) {
              console.log(`  [${taskName}] ${event.purpose}`);
            } else if (event.type === 'COMPLETE') {
              const timeSeconds = ((Date.now() - startTime) / 1000).toFixed(1);

              if (event.status === 'COMPLETED') {
                let plansFound = 0;
                try {
                  const result = event.result;
                  if (Array.isArray(result)) {
                    plansFound = result.length;
                  } else if (result && typeof result === 'object') {
                    const values = Object.values(result);
                    for (const value of values) {
                      if (Array.isArray(value)) {
                        plansFound = value.length;
                        break;
                      }
                    }
                  }
                } catch (e) {
                  plansFound = 0;
                }

                return {
                  url: task.url,
                  product,
                  plansFound,
                  timeSeconds: parseFloat(timeSeconds),
                  status: 'SUCCESS',
                };
              } else {
                throw new Error(event.error?.message || 'Run failed');
              }
            }
          } catch (parseError) {
            // Ignore parse errors
          }
        }
      }
    }

    throw new Error('Stream ended without completion');
  } catch (error) {
    const timeSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
    return {
      url: task.url,
      product,
      plansFound: 0,
      timeSeconds: parseFloat(timeSeconds),
      status: 'FAILED',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function runTaskWithPolling(task: Task, taskName: string): Promise<TaskResult> {
  const startTime = Date.now();
  const product = extractProductName(task.url);

  try {
    // Start async run
    const runResponse = await fetch(`${TINYFISH_API}/automation/run-async`, {
      method: 'POST',
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: task.url,
        goal: task.goal,
        browser_profile: 'lite',
      }),
    });

    if (!runResponse.ok) {
      throw new Error(`Failed to start run: ${await runResponse.text()}`);
    }

    const { run_id } = await runResponse.json();

    // Poll for completion with timeout
    const POLL_INTERVAL = 3000;
    const TIMEOUT = 600000; // 10 minutes per task

    while (Date.now() - startTime < TIMEOUT) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));

      const statusResponse = await fetch(`${TINYFISH_API}/runs/${run_id}`, {
        headers: {
          'X-API-Key': API_KEY,
          'Content-Type': 'application/json',
        },
      });

      if (!statusResponse.ok) {
        throw new Error(`Failed to poll status: ${statusResponse.status}`);
      }

      const statusData = await statusResponse.json();

      if (statusData.status === 'COMPLETED') {
        const timeSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
        
        // Count plans found
        let plansFound = 0;
        try {
          const result = statusData.result;
          if (Array.isArray(result)) {
            plansFound = result.length;
          } else if (result && typeof result === 'object') {
            // Handle nested result structures
            const values = Object.values(result);
            for (const value of values) {
              if (Array.isArray(value)) {
                plansFound = value.length;
                break;
              }
            }
          }
        } catch (e) {
          plansFound = 0;
        }

        return {
          url: task.url,
          product,
          plansFound,
          timeSeconds: parseFloat(timeSeconds),
          status: 'SUCCESS',
        };
      }

      if (statusData.status === 'FAILED') {
        throw new Error(statusData.error || 'Run failed');
      }
    }

    throw new Error('Timeout - task took longer than 10 minutes');
  } catch (error) {
    const timeSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
    return {
      url: task.url,
      product,
      plansFound: 0,
      timeSeconds: parseFloat(timeSeconds),
      status: 'FAILED',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Unified task runner - switches between SSE and Polling
async function runTask(task: Task, taskName: string): Promise<TaskResult> {
  return USE_SSE ? runTaskWithSSE(task, taskName) : runTaskWithPolling(task, taskName);
}

async function main() {
  const overallStartTime = Date.now();

  console.log('🚀 GhostAudit Bulk POC - Wave Execution Model');
  console.log(`📊 AGENT_CONCURRENCY=${CONCURRENCY}`);
  console.log(`🔄 Mode: ${USE_SSE ? 'SSE Streaming' : 'Polling'}`);
  console.log(`📋 Total tasks: ${tasks.length}`);
  
  const totalWaves = Math.ceil(tasks.length / CONCURRENCY);
  console.log(`🌊 Total waves: ${totalWaves}\n`);

  const results: TaskResult[] = [];

  // Split tasks into waves
  for (let waveNum = 1; waveNum <= totalWaves; waveNum++) {
    const startIdx = (waveNum - 1) * CONCURRENCY;
    const endIdx = Math.min(startIdx + CONCURRENCY, tasks.length);
    const waveTasks = tasks.slice(startIdx, endIdx);

    console.log(`▶ Wave ${waveNum}/${totalWaves} — dispatching ${waveTasks.length} agents`);
    console.log(`  Tasks: ${waveTasks.map(t => extractProductName(t.url)).join(', ')}\n`);

    // Run all tasks in this wave simultaneously
    const waveResults = await Promise.allSettled(
      waveTasks.map((task, idx) => {
        const taskName = extractProductName(task.url);
        return runTask(task, taskName);
      })
    );

    // Process results
    for (const result of waveResults) {
      if (result.status === 'fulfilled') {
        const taskResult = result.value;
        results.push(taskResult);
        
        const statusIcon = taskResult.status === 'SUCCESS' ? '✅' : '❌';
        console.log(`  ${statusIcon} ${taskResult.product} completed in ${taskResult.timeSeconds}s`);
      } else {
        console.log(`  ❌ Task failed: ${result.reason}`);
      }
    }

    console.log(`  Wave ${waveNum} complete\n`);
  }

  // Print summary table
  const overallTimeSeconds = ((Date.now() - overallStartTime) / 1000).toFixed(1);
  
  console.log('═'.repeat(70));
  console.log('📊 RESULTS SUMMARY');
  console.log('═'.repeat(70));
  console.log();
  console.log('| # | Product    | Plans Found | Time (s) | Status  |');
  console.log('|---|------------|-------------|----------|---------|');
  
  results.forEach((result, idx) => {
    const num = String(idx + 1).padEnd(1);
    const product = result.product.padEnd(10);
    const plans = String(result.plansFound).padEnd(11);
    const time = String(result.timeSeconds).padEnd(8);
    const status = result.status.padEnd(7);
    console.log(`| ${num} | ${product} | ${plans} | ${time} | ${status} |`);
  });
  
  console.log();
  console.log('═'.repeat(70));
  console.log(`⏱️  Total wall time: ${overallTimeSeconds}s`);
  console.log(`🌊 AGENT_CONCURRENCY=${CONCURRENCY} — ran ${totalWaves} waves`);
  console.log(`✅ Success: ${results.filter(r => r.status === 'SUCCESS').length}/${results.length}`);
  console.log(`❌ Failed: ${results.filter(r => r.status === 'FAILED').length}/${results.length}`);
  console.log('═'.repeat(70));
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
