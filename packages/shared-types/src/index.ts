import { z } from 'zod';

export const VERSION = "1.0.0";

// ============================================================================
// PERSONA
// ============================================================================

export const PersonaSchema = z.object({
  persona_id: z.string(),
  account_age_days: z.number(),
  account_age_label: z.enum(['new', 'recent', 'established', 'veteran', 'legacy']),
  plan_tier: z.enum(['free', 'starter', 'pro', 'business', 'enterprise', 'churned', 'reactivated']),
  geo: z.object({
    country: z.string(),
    city: z.string(),
    proxy_code: z.string(),
  }),
  device: z.enum(['desktop', 'mobile']),
  browser: z.enum(['chrome', 'firefox', 'safari']),
  locale: z.string(),
  purchase_history: z.enum(['never', 'once', 'repeat', 'lapsed', 'active_subscriber']),
  acquisition_channel: z.enum(['organic', 'google_ads', 'linkedin', 'referral', 'direct', 'trial_to_paid']),
  session_state: z.enum(['fresh', 'abandoned_cart', 'post_login', 'post_checkout', 'idle_30d']),
  priority_score: z.number().min(0).max(1),
  wave_number: z.number().int().positive(),
  tinyfish_config: z.object({
    browser_profile: z.enum(['lite', 'stealth']),
    proxy_config: z.object({
      enabled: z.boolean(),
      country_code: z.string(),
    }),
  }),
});

export type Persona = z.infer<typeof PersonaSchema>;

// ============================================================================
// REVENUE PATH
// ============================================================================

export const RevenuePathSchema = z.object({
  id: z.string(),
  name: z.string(),
  severity: z.enum(['P0', 'HIGH', 'MED', 'LOW']),
  goal_template: z.string(),
  termination_conditions: z.array(z.string()),
  output_schema: z.record(z.string(), z.unknown()),
});

export type RevenuePath = z.infer<typeof RevenuePathSchema>;

// ============================================================================
// AGENT RUN RESULT
// ============================================================================

export const AgentRunResultSchema = z.object({
  path_completed: z.boolean(),
  steps_taken: z.number(),
  final_url: z.string(),
  price_shown: z.string().optional(),
  cta_present: z.boolean().optional(),
  error_encountered: z.string().optional(),
  retention_offer_shown: z.boolean().optional(),
  offer_amount: z.string().optional(),
  redirect_chain: z.array(z.string()),
  anomaly_flags: z.array(z.string()),
});

export type AgentRunResult = z.infer<typeof AgentRunResultSchema>;

// ============================================================================
// AGENT RUN
// ============================================================================

export const AgentRunSchema = z.object({
  id: z.string(),
  batch_id: z.string(),
  persona_id: z.string(),
  persona_data: PersonaSchema,
  revenue_path_id: z.string(),
  wave_number: z.number().int().positive(),
  status: z.enum(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED']),
  tinyfish_run_id: z.string().optional(),
  result: AgentRunResultSchema.optional(),
  error: z.string().optional(),
  step_count: z.number().optional(),
  started_at: z.string(),
  completed_at: z.string().optional(),
});

export type AgentRun = z.infer<typeof AgentRunSchema>;

// ============================================================================
// ANOMALY
// ============================================================================

export const AnomalySchema = z.object({
  id: z.string(),
  batch_id: z.string(),
  anomaly_type: z.enum([
    'price_variance',
    'flow_length_deviation',
    'element_missing',
    'error_rate',
    'redirect_loop',
    'personalisation_missing',
    'demographic_disparity',
  ]),
  severity: z.enum(['P0', 'HIGH', 'MED', 'LOW']),
  affected_personas: z.array(z.string()),
  affected_segment_description: z.string(),
  evidence: z.record(z.string(), z.unknown()),
  estimated_mrr_impact: z.number().optional(),
  detected_at: z.string(),
  found_in_wave: z.number().int().positive(),
});

export type Anomaly = z.infer<typeof AnomalySchema>;

// ============================================================================
// RUN BATCH
// ============================================================================

export const RunBatchSchema = z.object({
  id: z.string(),
  target_url: z.string(),
  status: z.enum(['QUEUED', 'RUNNING', 'COMPLETE', 'FAILED']),
  agent_concurrency: z.number().int().positive(),
  total_waves: z.number().int().positive(),
  current_wave: z.number().int().nonnegative(),
  persona_count: z.number().int().nonnegative(),
  completed_runs: z.number().int().nonnegative(),
  failed_runs: z.number().int().nonnegative(),
  anomaly_count: z.number().int().nonnegative(),
  health_score: z.number().min(0).max(100).optional(),
  revenue_at_risk: z.number().optional(),
  narrative: z.string().optional(),
  priority_actions: z.array(z.string()).optional(),
  created_at: z.string(),
  completed_at: z.string().optional(),
});

export type RunBatch = z.infer<typeof RunBatchSchema>;

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

export function validatePersona(data: unknown): Persona {
  return PersonaSchema.parse(data);
}

export function validateRevenuePath(data: unknown): RevenuePath {
  return RevenuePathSchema.parse(data);
}

export function validateAgentRunResult(data: unknown): AgentRunResult {
  return AgentRunResultSchema.parse(data);
}

export function validateAgentRun(data: unknown): AgentRun {
  return AgentRunSchema.parse(data);
}

export function validateAnomaly(data: unknown): Anomaly {
  return AnomalySchema.parse(data);
}

export function validateRunBatch(data: unknown): RunBatch {
  return RunBatchSchema.parse(data);
}
