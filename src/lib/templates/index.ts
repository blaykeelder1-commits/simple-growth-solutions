// Website template definitions for the free build pipeline
// Each template is an industry-specific starter with sections, colors, and content structure

export interface TemplateSection {
  id: string;
  type: "hero" | "about" | "services" | "menu" | "gallery" | "testimonials" | "contact" | "cta" | "team" | "pricing" | "faq" | "hours" | "booking";
  title: string;
  required: boolean;
}

export interface WebsiteTemplate {
  id: string;
  name: string;
  industry: string;
  description: string;
  previewImage: string; // path to preview screenshot
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  sections: TemplateSection[];
  defaultContent: {
    heroHeadline: string;
    heroSubheadline: string;
    ctaText: string;
  };
}

export const TEMPLATES: WebsiteTemplate[] = [
  {
    id: "restaurant",
    name: "Restaurant & Food Service",
    industry: "food_beverage",
    description: "Warm, inviting design with menu integration, online ordering CTAs, and reservation booking.",
    previewImage: "/templates/restaurant-preview.png",
    colors: {
      primary: "#B91C1C",   // warm red
      secondary: "#92400E", // amber brown
      accent: "#F59E0B",    // gold
      background: "#FFFBEB", // warm cream
      text: "#1C1917",
    },
    fonts: {
      heading: "Playfair Display",
      body: "Inter",
    },
    sections: [
      { id: "hero", type: "hero", title: "Hero Banner", required: true },
      { id: "about", type: "about", title: "Our Story", required: true },
      { id: "menu", type: "menu", title: "Menu Highlights", required: true },
      { id: "gallery", type: "gallery", title: "Photo Gallery", required: false },
      { id: "testimonials", type: "testimonials", title: "Reviews", required: false },
      { id: "hours", type: "hours", title: "Hours & Location", required: true },
      { id: "booking", type: "booking", title: "Reservations", required: false },
      { id: "contact", type: "contact", title: "Contact", required: true },
    ],
    defaultContent: {
      heroHeadline: "Authentic Flavors, Unforgettable Experience",
      heroSubheadline: "Family recipes crafted with passion — dine in, take out, or let us cater your next event.",
      ctaText: "View Our Menu",
    },
  },
  {
    id: "professional",
    name: "Professional Services",
    industry: "services",
    description: "Clean, trust-building design for lawyers, accountants, consultants, and service professionals.",
    previewImage: "/templates/professional-preview.png",
    colors: {
      primary: "#1E40AF",   // navy blue
      secondary: "#1E3A5F", // dark blue
      accent: "#3B82F6",    // bright blue
      background: "#F8FAFC", // cool white
      text: "#0F172A",
    },
    fonts: {
      heading: "DM Sans",
      body: "Inter",
    },
    sections: [
      { id: "hero", type: "hero", title: "Hero Banner", required: true },
      { id: "services", type: "services", title: "Our Services", required: true },
      { id: "about", type: "about", title: "About Us", required: true },
      { id: "team", type: "team", title: "Our Team", required: false },
      { id: "testimonials", type: "testimonials", title: "Client Testimonials", required: true },
      { id: "faq", type: "faq", title: "FAQ", required: false },
      { id: "cta", type: "cta", title: "Free Consultation", required: true },
      { id: "contact", type: "contact", title: "Contact", required: true },
    ],
    defaultContent: {
      heroHeadline: "Expert Solutions for Your Business",
      heroSubheadline: "Trusted by hundreds of businesses — let us help you achieve your goals.",
      ctaText: "Schedule a Consultation",
    },
  },
  {
    id: "retail",
    name: "Retail & E-commerce",
    industry: "retail",
    description: "Modern, product-focused design with shopping CTAs, featured products, and promotional sections.",
    previewImage: "/templates/retail-preview.png",
    colors: {
      primary: "#7C3AED",   // purple
      secondary: "#5B21B6", // deep purple
      accent: "#F472B6",    // pink
      background: "#FAFAFA", // light gray
      text: "#18181B",
    },
    fonts: {
      heading: "Plus Jakarta Sans",
      body: "Inter",
    },
    sections: [
      { id: "hero", type: "hero", title: "Hero Banner", required: true },
      { id: "services", type: "services", title: "Featured Products", required: true },
      { id: "about", type: "about", title: "Our Brand", required: true },
      { id: "gallery", type: "gallery", title: "Product Gallery", required: false },
      { id: "testimonials", type: "testimonials", title: "Customer Reviews", required: true },
      { id: "pricing", type: "pricing", title: "Special Offers", required: false },
      { id: "contact", type: "contact", title: "Visit Us", required: true },
    ],
    defaultContent: {
      heroHeadline: "Discover Something New",
      heroSubheadline: "Curated products that make a difference — shop online or visit us today.",
      ctaText: "Shop Now",
    },
  },
  {
    id: "automotive",
    name: "Automotive",
    industry: "automotive",
    description: "Bold, high-contrast design for auto shops, dealerships, and car services.",
    previewImage: "/templates/automotive-preview.png",
    colors: {
      primary: "#DC2626",   // red
      secondary: "#171717", // near black
      accent: "#FBBF24",    // yellow
      background: "#FAFAFA",
      text: "#171717",
    },
    fonts: {
      heading: "Montserrat",
      body: "Open Sans",
    },
    sections: [
      { id: "hero", type: "hero", title: "Hero Banner", required: true },
      { id: "services", type: "services", title: "Our Services", required: true },
      { id: "about", type: "about", title: "About the Shop", required: true },
      { id: "gallery", type: "gallery", title: "Our Work", required: false },
      { id: "testimonials", type: "testimonials", title: "Customer Reviews", required: true },
      { id: "hours", type: "hours", title: "Hours & Location", required: true },
      { id: "booking", type: "booking", title: "Book an Appointment", required: false },
      { id: "contact", type: "contact", title: "Contact", required: true },
    ],
    defaultContent: {
      heroHeadline: "Expert Auto Care You Can Trust",
      heroSubheadline: "Factory-trained technicians, honest pricing, and fast turnaround — bring your vehicle to the best.",
      ctaText: "Book a Service",
    },
  },
  {
    id: "healthcare",
    name: "Healthcare & Wellness",
    industry: "healthcare",
    description: "Calming, accessible design for clinics, dentists, therapists, and wellness centers.",
    previewImage: "/templates/healthcare-preview.png",
    colors: {
      primary: "#059669",   // teal green
      secondary: "#0D9488", // teal
      accent: "#34D399",    // mint
      background: "#F0FDF4", // soft green
      text: "#14532D",
    },
    fonts: {
      heading: "Nunito Sans",
      body: "Inter",
    },
    sections: [
      { id: "hero", type: "hero", title: "Hero Banner", required: true },
      { id: "services", type: "services", title: "Our Services", required: true },
      { id: "team", type: "team", title: "Meet Our Team", required: true },
      { id: "about", type: "about", title: "About Our Practice", required: true },
      { id: "testimonials", type: "testimonials", title: "Patient Reviews", required: true },
      { id: "faq", type: "faq", title: "FAQ", required: false },
      { id: "booking", type: "booking", title: "Book an Appointment", required: true },
      { id: "contact", type: "contact", title: "Contact & Location", required: true },
    ],
    defaultContent: {
      heroHeadline: "Your Health, Our Priority",
      heroSubheadline: "Compassionate care from experienced professionals — accepting new patients.",
      ctaText: "Book an Appointment",
    },
  },
];

export function getTemplate(id: string): WebsiteTemplate | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

export function getTemplatesByIndustry(industry: string): WebsiteTemplate[] {
  return TEMPLATES.filter((t) => t.industry === industry);
}
