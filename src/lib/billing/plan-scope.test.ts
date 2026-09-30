import { describe, it, expect } from "vitest";
import { describeScope, PLAN_SCOPE } from "./plan-scope";

describe("plan scope", () => {
  it("matches the pricing page change-request allowances", () => {
    expect(PLAN_SCOPE.website_managed.includes.join(" ")).toMatch(/2 change requests/);
    expect(PLAN_SCOPE.website_pro.includes.join(" ")).toMatch(/4 change requests/);
    expect(PLAN_SCOPE.website_premium.includes.join(" ")).toMatch(/10 change requests/);
  });

  it("every plan includes the website, Google Business Profile and SEO, and never social media", () => {
    for (const key of Object.keys(PLAN_SCOPE)) {
      const text = describeScope(key);
      expect(text).toMatch(/Google Business Profile/);
      expect(text).toMatch(/SEO/);
      expect(text).toMatch(/NOT included in any plan:[\s\S]*Social media/);
    }
  });

  it("Pro (Jorge's plan) offers the Premium upgrade; Premium offers an add-on quote", () => {
    expect(describeScope("website_pro")).toMatch(/Managed Premium \(\$129\/month\)/);
    expect(describeScope("website_premium")).toMatch(/one-time add-on/);
  });

  it("annual and bundle plans get their website tier, not 'none active'", () => {
    expect(describeScope("website_pro_annual")).toMatch(/PLAN: Managed Pro/);
    expect(describeScope("growth_bundle")).toMatch(/PLAN: Managed Pro/);
    expect(describeScope("enterprise_suite")).toMatch(/PLAN: Managed Premium/);
  });

  it("no active plan = promise nothing", () => {
    expect(describeScope(null)).toMatch(/Do not promise any work/);
  });
});

import { planDifference } from "./plan-scope";
describe("planDifference", () => {
  it("Pro → Managed lists what they lose, including the Pro features", () => {
    const lost = planDifference("website_pro", "website_managed").join(" | ");
    expect(lost).toMatch(/AI chatbot/);
    expect(lost).toMatch(/Lead capture forms/);
    expect(lost).toMatch(/4 change requests/);
    expect(lost).not.toMatch(/Google Business Profile/); // every plan keeps it
  });
});
