export const industries = [
  "Restaurant / Food Service",
  "Retail / E-commerce",
  "Professional Services",
  "Healthcare / Medical",
  "Real Estate",
  "Construction / Trades",
  "Beauty / Wellness",
  "Fitness / Sports",
  "Education / Training",
  "Technology / Software",
  "Manufacturing",
  "Non-profit",
  "Other",
] as const;

export type Industry = (typeof industries)[number];
