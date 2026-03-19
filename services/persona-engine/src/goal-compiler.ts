import { Persona, RevenuePath } from '../../../packages/shared-types/src/index.js';

export class GoalCompiler {
  compile(path: RevenuePath, persona: Persona): string {
    const sections: string[] = [];

    // SECTION 1 — Persona context
    sections.push(
      `You are acting as a real user with this exact profile:
- Account age: ${persona.account_age_days} days (${persona.account_age_label} user)
- Subscription plan: ${persona.plan_tier}
- Location: ${persona.geo.city}, ${persona.geo.country}
- Device: ${persona.device}
- Browser: ${persona.browser}
- Browser locale: ${persona.locale}
- Purchase history: ${persona.purchase_history}
- Acquisition channel: ${persona.acquisition_channel}
- Current session state: ${persona.session_state}

Behave naturally as this type of user would. Do not skip steps.`
    );

    // SECTION 2 — The task (from path.goal_template, unchanged)
    sections.push(path.goal_template);

    // SECTION 3 — Extra attention (P0 and revenue-critical paths only)
    const revenueCriticalPaths = ['RP-02', 'RP-03', 'RP-05', 'RP-06'];
    if (path.severity === 'P0' || revenueCriticalPaths.includes(path.id)) {
      sections.push(
        `Pay close attention to:
- Copy the EXACT price shown at every step (include currency symbol and billing period)
- Note if any discount, promotional offer, or retention incentive appeared (yes/no and exact text)
- Count every click and page load as a step
- Flag anything that seems inconsistent with what this type of user should experience`
      );
    }

    // SECTION 4 — Termination and output schema (always)
    const terminationList = path.termination_conditions.map((c) => `- ${c}`).join('\n');
    sections.push(
      `Stop and return results when ANY of these conditions is met:
${terminationList}

Return ONLY valid JSON. No other text before or after. Schema:
${JSON.stringify(path.output_schema, null, 2)}`
    );

    return sections.join('\n\n');
  }
}
