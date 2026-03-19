import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import { PersonaEngine } from './generator.js';
import { GoalCompiler } from './goal-compiler.js';
import { REVENUE_PATHS, getRevenuePath } from './revenue-paths.js';
import { Persona } from '../../../packages/shared-types/src/index.js';

// Load environment variables
dotenv.config({ path: '../../.env' });

const fastify = Fastify({ logger: true });

// Enable CORS
await fastify.register(cors);

// Global state
let personas: Persona[] = [];
let compiler: GoalCompiler;
const AGENT_CONCURRENCY = parseInt(process.env.AGENT_CONCURRENCY || '2');
const totalWaves = Math.ceil(50 / AGENT_CONCURRENCY);

// Initialize on startup
async function initialize() {
  console.log('\n🚀 Initializing Persona Engine...\n');

  // Generate personas
  const engine = new PersonaEngine();
  personas = engine.generate();
  compiler = new GoalCompiler();

  // Log distribution by geo
  const geoDistribution = personas.reduce((acc, p) => {
    acc[p.geo.country] = (acc[p.geo.country] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('📍 Geographic Distribution:');
  Object.entries(geoDistribution)
    .sort(([, a], [, b]) => b - a)
    .forEach(([geo, count]) => {
      console.log(`   ${geo}: ${count}`);
    });

  // Log distribution by plan tier
  const tierDistribution = personas.reduce((acc, p) => {
    acc[p.plan_tier] = (acc[p.plan_tier] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('\n💳 Plan Tier Distribution:');
  Object.entries(tierDistribution)
    .sort(([, a], [, b]) => b - a)
    .forEach(([tier, count]) => {
      console.log(`   ${tier}: ${count}`);
    });

  // Log distribution by device
  const deviceDistribution = personas.reduce((acc, p) => {
    acc[p.device] = (acc[p.device] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('\n📱 Device Distribution:');
  Object.entries(deviceDistribution).forEach(([device, count]) => {
    console.log(`   ${device}: ${count}`);
  });

  // Log wave distribution
  console.log('\n🌊 Wave Distribution:');
  for (let wave = 1; wave <= totalWaves; wave++) {
    const wavePersonas = personas.filter((p) => p.wave_number === wave);
    const priorities = wavePersonas.map((p) => p.priority_score).join(', ');
    console.log(`   Wave ${wave}: ${wavePersonas.length} personas (priority: ${priorities})`);
  }

  console.log(`\n✅ Persona Engine ready — 50 personas · ${totalWaves} waves · concurrency=${AGENT_CONCURRENCY}\n`);
}

// Routes

fastify.get('/health', async () => {
  return {
    status: 'ok',
    persona_count: personas.length,
    concurrency: AGENT_CONCURRENCY,
    total_waves: totalWaves,
  };
});

fastify.get('/personas', async () => {
  return personas;
});

fastify.get<{ Params: { personaId: string } }>('/personas/:personaId', async (request, reply) => {
  const persona = personas.find((p) => p.persona_id === request.params.personaId);
  if (!persona) {
    reply.code(404);
    return { error: 'Persona not found' };
  }
  return persona;
});

fastify.get<{ Params: { waveNumber: string } }>('/personas/wave/:waveNumber', async (request, reply) => {
  const waveNumber = parseInt(request.params.waveNumber);
  if (isNaN(waveNumber) || waveNumber < 1 || waveNumber > totalWaves) {
    reply.code(400);
    return { error: `Invalid wave number. Must be between 1 and ${totalWaves}` };
  }
  const wavePersonas = personas.filter((p) => p.wave_number === waveNumber);
  return wavePersonas;
});

fastify.get('/revenue-paths', async () => {
  return REVENUE_PATHS;
});

fastify.get<{ Params: { pathId: string } }>('/revenue-paths/:pathId', async (request, reply) => {
  const path = getRevenuePath(request.params.pathId);
  if (!path) {
    reply.code(404);
    return { error: 'Revenue path not found' };
  }
  return path;
});

fastify.post<{ Body: { revenue_path_id: string; persona_id: string } }>('/compile-goal', async (request, reply) => {
  const { revenue_path_id, persona_id } = request.body;

  const path = getRevenuePath(revenue_path_id);
  if (!path) {
    reply.code(404);
    return { error: 'Revenue path not found' };
  }

  const persona = personas.find((p) => p.persona_id === persona_id);
  if (!persona) {
    reply.code(404);
    return { error: 'Persona not found' };
  }

  const compiled_goal = compiler.compile(path, persona);

  return {
    persona_id,
    revenue_path_id,
    wave_number: persona.wave_number,
    compiled_goal,
  };
});

fastify.post<{ Body: { revenue_path_id: string; wave_number: number } }>('/compile-wave', async (request, reply) => {
  const { revenue_path_id, wave_number } = request.body;

  const path = getRevenuePath(revenue_path_id);
  if (!path) {
    reply.code(404);
    return { error: 'Revenue path not found' };
  }

  if (isNaN(wave_number) || wave_number < 1 || wave_number > totalWaves) {
    reply.code(400);
    return { error: `Invalid wave number. Must be between 1 and ${totalWaves}` };
  }

  const wavePersonas = personas.filter((p) => p.wave_number === wave_number);

  const compiledGoals = wavePersonas.map((persona) => ({
    persona_id: persona.persona_id,
    wave_number: persona.wave_number,
    compiled_goal: compiler.compile(path, persona),
  }));

  return compiledGoals;
});

fastify.get('/wave-plan', async () => {
  const waves = [];

  for (let wave = 1; wave <= totalWaves; wave++) {
    const wavePersonas = personas.filter((p) => p.wave_number === wave);
    waves.push({
      wave_number: wave,
      persona_ids: wavePersonas.map((p) => p.persona_id),
      priority_scores: wavePersonas.map((p) => p.priority_score),
    });
  }

  return {
    concurrency: AGENT_CONCURRENCY,
    total_waves: totalWaves,
    estimated_minutes_per_wave: 5,
    estimated_total_minutes: totalWaves * 5,
    waves,
  };
});

// Start server
const start = async () => {
  try {
    await initialize();
    await fastify.listen({ port: 3002, host: '0.0.0.0' });
    console.log('🚀 Persona Engine HTTP service running on http://localhost:3002\n');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
