import { Persona } from '../../../packages/shared-types/src/index.js';

interface GeoConfig {
  country: string;
  city: string;
  proxy_code: string;
}

interface DeviceBrowserCombo {
  device: 'desktop' | 'mobile';
  browser: 'chrome' | 'firefox' | 'safari';
}

export class PersonaEngine {
  private geos: GeoConfig[] = [
    { country: 'US', city: 'New York', proxy_code: 'US' },
    { country: 'UK', city: 'London', proxy_code: 'GB' },
    { country: 'DE', city: 'Berlin', proxy_code: 'DE' },
    { country: 'FR', city: 'Paris', proxy_code: 'FR' },
    { country: 'IN', city: 'Mumbai', proxy_code: 'IN' },
    { country: 'BR', city: 'São Paulo', proxy_code: 'BR' },
    { country: 'NG', city: 'Lagos', proxy_code: 'NG' },
    { country: 'SG', city: 'Singapore', proxy_code: 'SG' },
    { country: 'AU', city: 'Sydney', proxy_code: 'AU' },
    { country: 'CA', city: 'Toronto', proxy_code: 'CA' },
  ];

  private planTiers: Array<'free' | 'starter' | 'pro' | 'business' | 'enterprise' | 'churned' | 'reactivated'> = [
    'free',
    'starter',
    'pro',
    'enterprise',
    'churned',
  ];

  private deviceBrowserCombos: DeviceBrowserCombo[] = [
    { device: 'desktop', browser: 'chrome' },
    { device: 'desktop', browser: 'firefox' },
    { device: 'desktop', browser: 'safari' },
    { device: 'mobile', browser: 'safari' },
    { device: 'mobile', browser: 'chrome' },
  ];

  private accountAgeMap: Record<string, number> = {
    new: 3,
    recent: 30,
    established: 180,
    veteran: 540,
    legacy: 1095,
  };

  private purchaseHistories: Array<'never' | 'once' | 'repeat' | 'lapsed' | 'active_subscriber'> = [
    'never',
    'once',
    'repeat',
    'lapsed',
    'active_subscriber',
  ];

  private channels: Array<'organic' | 'google_ads' | 'linkedin' | 'referral' | 'direct' | 'trial_to_paid'> = [
    'organic',
    'google_ads',
    'linkedin',
    'referral',
    'direct',
    'trial_to_paid',
  ];

  private sessionStates: Array<'fresh' | 'abandoned_cart' | 'post_login' | 'post_checkout' | 'idle_30d'> = [
    'fresh',
    'abandoned_cart',
    'post_login',
    'post_checkout',
    'idle_30d',
  ];

  private getLocale(country: string): string {
    const localeMap: Record<string, string> = {
      IN: 'en-IN',
      DE: 'de-DE',
      BR: 'pt-BR',
      FR: 'fr-FR',
    };
    return localeMap[country] || 'en-US';
  }

  private calculatePriorityScore(persona: Omit<Persona, 'priority_score' | 'wave_number'>): number {
    let score = 0.3;

    if (persona.device === 'mobile') {
      score += 0.2;
    }

    if (['IN', 'BR', 'NG'].includes(persona.geo.country)) {
      score += 0.15;
    }

    if (['legacy', 'veteran'].includes(persona.account_age_label)) {
      score += 0.2;
    }

    if (['pro', 'enterprise'].includes(persona.plan_tier)) {
      score += 0.15;
    }

    return Math.min(1.0, Math.round(score * 100) / 100);
  }

  private getTinyFishConfig(country: string) {
    return {
      browser_profile: (['IN', 'BR', 'NG'].includes(country) ? 'stealth' : 'lite') as 'lite' | 'stealth',
      proxy_config: {
        enabled: true,
        country_code: this.geos.find((g) => g.country === country)?.proxy_code || country,
      },
    };
  }

  private random<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  private getAccountAgeLabel(days: number): 'new' | 'recent' | 'established' | 'veteran' | 'legacy' {
    if (days <= 3) return 'new';
    if (days <= 30) return 'recent';
    if (days <= 180) return 'established';
    if (days <= 540) return 'veteran';
    return 'legacy';
  }

  generate(): Persona[] {
    const personas: Persona[] = [];
    const geoCounter = new Map<string, number>();
    const tierCounter = new Map<string, number>();
    let mobileCount = 0;
    let legacyCount = 0;
    let churnedCount = 0;

    // Priority personas that MUST exist
    const priorityPersonas: Array<Partial<Persona>> = [
      {
        geo: this.geos.find((g) => g.country === 'IN')!,
        plan_tier: 'pro',
        device: 'mobile',
        browser: 'safari',
        account_age_label: 'legacy',
        account_age_days: 1095,
      },
      {
        geo: this.geos.find((g) => g.country === 'DE')!,
        plan_tier: 'enterprise',
        device: 'desktop',
        browser: 'chrome',
      },
      {
        geo: this.geos.find((g) => g.country === 'BR')!,
        plan_tier: 'pro',
        device: 'mobile',
        browser: 'chrome',
        account_age_label: 'veteran',
        account_age_days: 540,
      },
    ];

    // Generate priority personas first
    priorityPersonas.forEach((template, idx) => {
      const geo = template.geo!;
      const accountAgeDays = template.account_age_days || this.random(Object.values(this.accountAgeMap));
      const accountAgeLabel = template.account_age_label || this.getAccountAgeLabel(accountAgeDays);

      const personaBase = {
        persona_id: `p_${geo.country.toLowerCase()}_${template.plan_tier}_${template.browser}_${template.device}_${String(idx + 1).padStart(3, '0')}`,
        account_age_days: accountAgeDays,
        account_age_label: accountAgeLabel,
        plan_tier: template.plan_tier!,
        geo,
        device: template.device!,
        browser: template.browser!,
        locale: this.getLocale(geo.country),
        purchase_history: this.random(this.purchaseHistories),
        acquisition_channel: this.random(this.channels),
        session_state: this.random(this.sessionStates),
        tinyfish_config: this.getTinyFishConfig(geo.country),
      };

      const priority_score = this.calculatePriorityScore(personaBase);

      personas.push({
        ...personaBase,
        priority_score,
        wave_number: 0, // Will be assigned after sorting
      });

      geoCounter.set(geo.country, (geoCounter.get(geo.country) || 0) + 1);
      tierCounter.set(template.plan_tier!, (tierCounter.get(template.plan_tier!) || 0) + 1);
      if (template.device === 'mobile') mobileCount++;
      if (accountAgeLabel === 'legacy') legacyCount++;
      if (template.plan_tier === 'churned') churnedCount++;
    });

    // Generate remaining personas with stratification
    let personaIndex = priorityPersonas.length;
    while (personas.length < 50) {
      // Ensure stratification requirements
      let geo = this.random(this.geos);
      let planTier = this.random(this.planTiers);
      let combo = this.random(this.deviceBrowserCombos);
      let accountAgeDays = this.random(Object.values(this.accountAgeMap));

      // Enforce geo coverage
      if (personas.length < 40) {
        const uncoveredGeos = this.geos.filter((g) => !geoCounter.has(g.country));
        if (uncoveredGeos.length > 0) {
          geo = this.random(uncoveredGeos);
        }
      }

      // Enforce tier minimums (5 each)
      if (personas.length < 40) {
        const underrepresentedTiers = this.planTiers.filter((t) => (tierCounter.get(t) || 0) < 5);
        if (underrepresentedTiers.length > 0) {
          planTier = this.random(underrepresentedTiers);
        }
      }

      // Enforce mobile minimum (12)
      if (mobileCount < 12 && personas.length < 45) {
        combo = this.random(this.deviceBrowserCombos.filter((c) => c.device === 'mobile'));
      }

      // Enforce legacy minimum (8)
      if (legacyCount < 8 && personas.length < 45) {
        accountAgeDays = 1095;
      }

      // Enforce churned minimum (5)
      if (churnedCount < 5 && personas.length < 45) {
        planTier = 'churned';
      }

      const accountAgeLabel = this.getAccountAgeLabel(accountAgeDays);

      const personaBase = {
        persona_id: `p_${geo.country.toLowerCase()}_${planTier}_${combo.browser}_${combo.device}_${String(personaIndex + 1).padStart(3, '0')}`,
        account_age_days: accountAgeDays,
        account_age_label: accountAgeLabel,
        plan_tier: planTier,
        geo,
        device: combo.device,
        browser: combo.browser,
        locale: this.getLocale(geo.country),
        purchase_history: this.random(this.purchaseHistories),
        acquisition_channel: this.random(this.channels),
        session_state: this.random(this.sessionStates),
        tinyfish_config: this.getTinyFishConfig(geo.country),
      };

      const priority_score = this.calculatePriorityScore(personaBase);

      personas.push({
        ...personaBase,
        priority_score,
        wave_number: 0,
      });

      geoCounter.set(geo.country, (geoCounter.get(geo.country) || 0) + 1);
      tierCounter.set(planTier, (tierCounter.get(planTier) || 0) + 1);
      if (combo.device === 'mobile') mobileCount++;
      if (accountAgeLabel === 'legacy') legacyCount++;
      if (planTier === 'churned') churnedCount++;
      personaIndex++;
    }

    // Sort by priority_score descending
    personas.sort((a, b) => b.priority_score - a.priority_score);

    // Assign wave numbers
    const concurrency = parseInt(process.env.AGENT_CONCURRENCY || '2');
    return assignWaves(personas, concurrency);
  }
}

export function assignWaves(personas: Persona[], concurrency: number): Persona[] {
  return personas.map((persona, index) => ({
    ...persona,
    wave_number: Math.ceil((index + 1) / concurrency),
  }));
}
