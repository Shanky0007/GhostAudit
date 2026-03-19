import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

// Load .env from root directory (one level up from server/)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../../../.env') });

const TINYFISH_API = 'https://agent.tinyfish.ai/v1';
const API_KEY = process.env.TINYFISH_API_KEY!;

async function checkAPI() {
  console.log('TinyFish API Diagnostic\n');
  console.log('API Key:', API_KEY ? `${API_KEY.substring(0, 20)}...` : 'NOT FOUND');
  console.log('API Base:', TINYFISH_API);
  console.log('\n--- Testing API Connection ---\n');

  // Test 1: Try to get account info or list runs
  try {
    console.log('Test 1: Checking API accessibility...');
    const response = await fetch(`${TINYFISH_API}/runs`, {
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json',
      },
    });
    
    console.log('Status:', response.status, response.statusText);
    const text = await response.text();
    
    if (response.ok) {
      console.log('✅ API is accessible');
      console.log('Response:', text.substring(0, 500));
    } else {
      console.log('❌ API returned error');
      console.log('Response:', text.substring(0, 500));
    }
  } catch (error) {
    console.error('❌ Failed to connect:', error);
  }

  console.log('\n--- Testing Simple Run ---\n');

  // Test 2: Try a simpler goal
  try {
    console.log('Test 2: Creating a simple run...');
    const runResponse = await fetch(`${TINYFISH_API}/automation/run-async`, {
      method: 'POST',
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: 'https://example.com',
        goal: 'Extract the page title',
        browser_profile: 'lite',
      }),
    });

    console.log('Status:', runResponse.status, runResponse.statusText);
    const responseText = await runResponse.text();
    
    if (runResponse.ok) {
      const data = JSON.parse(responseText);
      console.log('✅ Run created:', data.run_id);
      console.log('\nFull response:', JSON.stringify(data, null, 2));
      
      // Check status once
      console.log('\nChecking status after 5 seconds...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const statusResponse = await fetch(`${TINYFISH_API}/runs/${data.run_id}`, {
        headers: {
          'X-API-Key': API_KEY,
          'Content-Type': 'application/json',
        },
      });
      
      const statusText = await statusResponse.text();
      console.log('Status response:', statusText.substring(0, 500));
    } else {
      console.log('❌ Failed to create run');
      console.log('Response:', responseText.substring(0, 500));
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkAPI().catch(console.error);
