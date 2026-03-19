import type { RevenuePath } from '../../../packages/shared-types/src/index.js';

// Standard output schema for all revenue paths
const STANDARD_OUTPUT_SCHEMA = {
  path_completed: 'boolean',
  steps_taken: 'number',
  final_url: 'string',
  price_shown: 'string | null',
  cta_present: 'boolean | null',
  error_encountered: 'string | null',
  retention_offer_shown: 'boolean | null',
  offer_amount: 'string | null',
  redirect_chain: 'array of strings',
  anomaly_flags: 'array of strings',
};

// Standard termination conditions for all paths
const STANDARD_TERMINATION_CONDITIONS = [
  'CAPTCHA or bot detection page appeared',
  'Login wall appeared unexpectedly',
  '404 or error page reached',
  '5 minutes elapsed',
  'Payment confirmation page reached',
];

export const REVENUE_PATHS: RevenuePath[] = [
  // RP-01: Signup → Activation (HIGH)
  {
    id: 'RP-01',
    name: 'Signup → Activation',
    severity: 'HIGH',
    goal_template: 'Navigate to the signup page. Complete registration with a new account. Confirm email if required. Complete onboarding steps. Reach the main dashboard or first key feature.',
    termination_conditions: STANDARD_TERMINATION_CONDITIONS,
    output_schema: STANDARD_OUTPUT_SCHEMA,
  },

  // RP-02: Freemium → Paid Upgrade (P0)
  {
    id: 'RP-02',
    name: 'Freemium → Paid Upgrade',
    severity: 'P0',
    goal_template: 'Starting as a logged-in free tier user, find a feature that requires a paid plan. Click the upgrade prompt. Navigate upgrade flow. Select the Pro plan. Proceed to checkout. Record the EXACT price shown at every single step.',
    termination_conditions: [
      ...STANDARD_TERMINATION_CONDITIONS,
      'Checkout page fully loaded with price visible',
    ],
    output_schema: STANDARD_OUTPUT_SCHEMA,
  },

  // RP-03: Annual Renewal (P0)
  {
    id: 'RP-03',
    name: 'Annual Renewal',
    severity: 'P0',
    goal_template: 'Navigate to billing or subscription settings. Find the renewal or subscription management option. Record the exact renewal price shown. Attempt to proceed with renewal confirmation.',
    termination_conditions: STANDARD_TERMINATION_CONDITIONS,
    output_schema: STANDARD_OUTPUT_SCHEMA,
  },

  // RP-04: Plan Change (HIGH)
  {
    id: 'RP-04',
    name: 'Plan Change',
    severity: 'HIGH',
    goal_template: 'Navigate to plan settings. Attempt to change from current plan to the next tier up. Record all prices shown, any proration amount displayed, and the confirmation message.',
    termination_conditions: STANDARD_TERMINATION_CONDITIONS,
    output_schema: STANDARD_OUTPUT_SCHEMA,
  },

  // RP-05: Checkout Completion (P0)
  {
    id: 'RP-05',
    name: 'Checkout Completion',
    severity: 'P0',
    goal_template: 'Add a product or the lowest-tier paid plan to cart. Proceed through checkout. If a coupon code field exists, enter TEST10. Fill in required fields with test data (do not submit real payment). Record every price, fee, and total shown at every step.',
    termination_conditions: STANDARD_TERMINATION_CONDITIONS,
    output_schema: STANDARD_OUTPUT_SCHEMA,
  },

  // RP-06: Cancellation + Retention (HIGH)
  {
    id: 'RP-06',
    name: 'Cancellation + Retention',
    severity: 'HIGH',
    goal_template: 'Navigate to account or subscription settings. Initiate the cancellation or unsubscribe flow. Go through the ENTIRE cancellation flow without skipping any steps. Record: exact number of steps required, whether any discount or retention offer appeared, and what the offer said.',
    termination_conditions: STANDARD_TERMINATION_CONDITIONS,
    output_schema: STANDARD_OUTPUT_SCHEMA,
  },

  // RP-07: Win-Back / Reactivation (MED)
  {
    id: 'RP-07',
    name: 'Win-Back / Reactivation',
    severity: 'MED',
    goal_template: 'As a user who previously cancelled, navigate to the reactivation or re-subscribe page. Record: pricing shown to returning user, any special returning user offer, whether previous account data is accessible.',
    termination_conditions: STANDARD_TERMINATION_CONDITIONS,
    output_schema: STANDARD_OUTPUT_SCHEMA,
  },

  // RP-08: Referral Flow (MED)
  {
    id: 'RP-08',
    name: 'Referral Flow',
    severity: 'MED',
    goal_template: 'Navigate to the referral program page. Find the referral link generator. Check if a referral link is produced. Note the referral credit amount offered. Check if the referral parameter persists in URLs when navigating.',
    termination_conditions: STANDARD_TERMINATION_CONDITIONS,
    output_schema: STANDARD_OUTPUT_SCHEMA,
  },

  // RP-09: Enterprise Contact Form (HIGH)
  {
    id: 'RP-09',
    name: 'Enterprise Contact Form',
    severity: 'HIGH',
    goal_template: 'Navigate to the Enterprise or Contact Sales page. Complete the contact form with plausible business information. Submit the form. Record whether a confirmation appeared and what it said.',
    termination_conditions: STANDARD_TERMINATION_CONDITIONS,
    output_schema: STANDARD_OUTPUT_SCHEMA,
  },

  // RP-10: Seat Expansion (HIGH)
  {
    id: 'RP-10',
    name: 'Seat Expansion',
    severity: 'HIGH',
    goal_template: 'Navigate to team or member management settings. Find the flow to add a new team member or purchase an additional seat. Record the per-seat price shown and any total cost displayed.',
    termination_conditions: STANDARD_TERMINATION_CONDITIONS,
    output_schema: STANDARD_OUTPUT_SCHEMA,
  },
];

/**
 * Get a revenue path by ID
 */
export function getRevenuePath(id: string): RevenuePath | undefined {
  return REVENUE_PATHS.find((path) => path.id === id);
}

// Validation on module load
if (REVENUE_PATHS.length !== 10) {
  throw new Error(`Expected 10 revenue paths, got ${REVENUE_PATHS.length}`);
}

const p0Paths = REVENUE_PATHS.filter((p) => p.severity === 'P0');
if (p0Paths.length !== 3) {
  throw new Error(`Expected 3 P0 paths, got ${p0Paths.length}`);
}
