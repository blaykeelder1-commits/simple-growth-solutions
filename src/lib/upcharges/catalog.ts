// Catalog of common one-off custom upcharges for website projects.
// The admin form prefills from this list. Prices are starting points — the
// admin can override per-quote.

export interface UpchargeTemplate {
  id: string;
  label: string;
  description: string;
  amountCents: number; // starting price; admin can override
}

export const UPCHARGE_CATALOG: UpchargeTemplate[] = [
  {
    id: "online_ordering",
    label: "Online Ordering Setup",
    description:
      "Add a full online ordering flow (menu, cart, checkout) with Square or Stripe payment processing on your site.",
    amountCents: 75000,
  },
  {
    id: "lead_funnel",
    label: "Custom Lead Funnel",
    description:
      "Multi-step lead capture funnel with conditional logic, follow-up email automation, and CRM integration.",
    amountCents: 60000,
  },
  {
    id: "payment_processing",
    label: "On-Site Payment Processing",
    description:
      "Accept payments directly on your website via Square or Stripe, including invoicing and recurring billing setup.",
    amountCents: 50000,
  },
  {
    id: "booking_system",
    label: "Appointment Booking System",
    description:
      "Embedded booking calendar with availability, reminders, and customer-facing rescheduling.",
    amountCents: 40000,
  },
  {
    id: "membership_area",
    label: "Members-Only Area",
    description:
      "Gated content area with login, member directory, and basic role-based access.",
    amountCents: 90000,
  },
  {
    id: "blog_setup",
    label: "Blog / Content Hub Setup",
    description:
      "Full blog system with categories, RSS, sitemap, and SEO-friendly URLs.",
    amountCents: 25000,
  },
  {
    id: "crm_integration",
    label: "CRM Integration",
    description:
      "Connect your contact forms and customer events to HubSpot, Salesforce, or your CRM of choice.",
    amountCents: 30000,
  },
  {
    id: "advanced_analytics",
    label: "Advanced Analytics & Reporting",
    description:
      "Custom analytics dashboards with conversion tracking, funnel analysis, and weekly email reports.",
    amountCents: 35000,
  },
  {
    id: "custom_other",
    label: "Custom Scope (Other)",
    description: "Custom work scoped to your specific request.",
    amountCents: 0, // admin will fill in
  },
];
