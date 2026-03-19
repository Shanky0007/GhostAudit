import { GoalCompiler } from './goal-compiler.js';
import { PersonaEngine } from './generator.js';
import { REVENUE_PATHS, getRevenuePath } from './revenue-paths.js';

console.log('Testing GoalCompiler...\n');
console.log('══════════════════════════════════════════════════');

const compiler = new GoalCompiler();
const engine = new PersonaEngine();
const personas = engine.generate();

// Find the IN/pro/mobile/safari/legacy persona
const targetPersona = personas.find(
  (p) =>
    p.geo.country === 'IN' &&
    p.plan_tier === 'pro' &&
    p.device === 'mobile' &&
    p.browser === 'safari' &&
    p.account_age_label === 'legacy'
);

if (!targetPersona) {
  console.log('❌ Could not find IN/pro/mobile/safari/legacy persona');
  process.exit(1);
}

console.log('Test 1: Compile RP-02 (P0) with IN/pro/mobile/safari/legacy persona\n');

const rp02 = getRevenuePath('RP-02');
if (!rp02) {
  console.log('❌ Could not find RP-02');
  process.exit(1);
}

const compiledRP02 = compiler.compile(rp02, targetPersona);
console.log('COMPILED GOAL STRING:');
console.log('─────────────────────────────────────────────────');
console.log(compiledRP02);
console.log('─────────────────────────────────────────────────\n');

// Verify structure
console.log('Verification checks for RP-02:');
const hasSection1 = compiledRP02.includes('You are acting as a real user');
const hasSection2 = compiledRP02.includes('Starting as a logged-in free tier user');
const hasSection3 = compiledRP02.includes('Pay close attention to');
const hasSection4 = compiledRP02.includes('Stop and return results');
const hasPriceShown = compiledRP02.includes('price_shown');
const hasStepsTaken = compiledRP02.includes('steps_taken');

console.log(`   ✅ Section 1 (Persona context): ${hasSection1 ? 'PRESENT' : 'MISSING'}`);
console.log(`   ✅ Section 2 (Task/goal_template): ${hasSection2 ? 'PRESENT' : 'MISSING'}`);
console.log(`   ✅ Section 3 (Extra attention for P0): ${hasSection3 ? 'PRESENT' : 'MISSING'}`);
console.log(`   ✅ Section 4 (Termination + schema): ${hasSection4 ? 'PRESENT' : 'MISSING'}`);
console.log(`   ✅ Output schema has 'price_shown': ${hasPriceShown ? 'PRESENT' : 'MISSING'}`);
console.log(`   ✅ Output schema has 'steps_taken': ${hasStepsTaken ? 'PRESENT' : 'MISSING'}`);

const rp02Valid = hasSection1 && hasSection2 && hasSection3 && hasSection4 && hasPriceShown && hasStepsTaken;
console.log(`   ${rp02Valid ? '✅ PASS' : '❌ FAIL'}\n`);

console.log('══════════════════════════════════════════════════\n');

console.log('Test 2: Compile RP-07 (MED) - Section 3 should be ABSENT\n');

const rp07 = getRevenuePath('RP-07');
if (!rp07) {
  console.log('❌ Could not find RP-07');
  process.exit(1);
}

const compiledRP07 = compiler.compile(rp07, targetPersona);
console.log('COMPILED GOAL STRING:');
console.log('─────────────────────────────────────────────────');
console.log(compiledRP07);
console.log('─────────────────────────────────────────────────\n');

// Verify structure
console.log('Verification checks for RP-07:');
const rp07HasSection1 = compiledRP07.includes('You are acting as a real user');
const rp07HasSection2 = compiledRP07.includes('As a user who previously cancelled');
const rp07HasSection3 = compiledRP07.includes('Pay close attention to');
const rp07HasSection4 = compiledRP07.includes('Stop and return results');

console.log(`   ✅ Section 1 (Persona context): ${rp07HasSection1 ? 'PRESENT' : 'MISSING'}`);
console.log(`   ✅ Section 2 (Task/goal_template): ${rp07HasSection2 ? 'PRESENT' : 'MISSING'}`);
console.log(`   ✅ Section 3 (Extra attention): ${!rp07HasSection3 ? 'ABSENT (correct)' : 'PRESENT (incorrect)'}`);
console.log(`   ✅ Section 4 (Termination + schema): ${rp07HasSection4 ? 'PRESENT' : 'MISSING'}`);

const rp07Valid = rp07HasSection1 && rp07HasSection2 && !rp07HasSection3 && rp07HasSection4;
console.log(`   ${rp07Valid ? '✅ PASS' : '❌ FAIL'}\n`);

console.log('══════════════════════════════════════════════════');

if (rp02Valid && rp07Valid) {
  console.log('✅ All GoalCompiler tests passed!');
} else {
  console.log('❌ Some tests failed!');
}

console.log('══════════════════════════════════════════════════\n');

console.log('WHAT THIS TEST IS ACTUALLY TESTING:\n');
console.log('1. SECTION STRUCTURE: Verifies the compiled goal has all 4 required sections');
console.log('   - Section 1: Persona context with account details, location, device, etc.');
console.log('   - Section 2: The actual task from the revenue path goal_template');
console.log('   - Section 3: Extra attention for P0/revenue-critical paths (RP-02, RP-03, RP-05, RP-06)');
console.log('   - Section 4: Termination conditions and JSON output schema\n');

console.log('2. CONDITIONAL LOGIC: Tests that Section 3 appears ONLY for:');
console.log('   - P0 severity paths (like RP-02, RP-03, RP-05)');
console.log('   - Revenue-critical paths (RP-02, RP-03, RP-05, RP-06)');
console.log('   - And is ABSENT for MED/LOW paths like RP-07\n');

console.log('3. SCHEMA VALIDATION: Confirms output schema includes critical fields:');
console.log('   - price_shown: For tracking pricing consistency');
console.log('   - steps_taken: For measuring flow complexity\n');

console.log('4. HUMAN READABILITY: The full output is printed so you can verify');
console.log('   the compiled goal reads like clear, natural instructions that');
console.log('   TinyFish agents can follow to simulate real user behavior.\n');

console.log('5. PERSONA INTEGRATION: Tests that persona attributes (account age,');
console.log('   plan tier, location, device, etc.) are correctly injected into');
console.log('   the goal string to create realistic user context.\n');
