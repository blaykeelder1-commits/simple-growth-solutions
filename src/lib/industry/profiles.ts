// Industry Profiles System
// Comprehensive industry-specific intelligence for Business Chauffeur
// Enables tailored insights, benchmarks, and recommendations

export type IndustryCategory =
  | "pet_services"
  | "salon_spa"
  | "restaurant"
  | "retail"
  | "automotive"
  | "healthcare"
  | "professional_services"
  | "fitness"
  | "home_services"
  | "food_beverage";

export type IndustrySubtype =
  // Pet Services
  | "pet_grooming"
  | "pet_boarding"
  | "veterinary"
  | "pet_training"
  | "pet_daycare"
  // Salon & Spa
  | "hair_salon"
  | "nail_salon"
  | "barbershop"
  | "day_spa"
  | "med_spa"
  // Restaurant
  | "fast_casual"
  | "fine_dining"
  | "cafe_coffee"
  | "bar_nightclub"
  | "food_truck"
  // Retail
  | "boutique"
  | "convenience"
  | "specialty_retail"
  | "gift_shop"
  // Automotive
  | "auto_repair"
  | "car_wash"
  | "auto_detailing"
  | "tire_shop"
  // Healthcare
  | "dental"
  | "chiropractic"
  | "physical_therapy"
  | "optometry"
  // Professional Services
  | "accounting"
  | "legal"
  | "consulting"
  | "real_estate"
  // Fitness
  | "gym"
  | "yoga_studio"
  | "personal_training"
  | "martial_arts"
  // Home Services
  | "landscaping"
  | "cleaning"
  | "plumbing"
  | "hvac"
  | "electrical"
  // Food & Beverage
  | "bakery"
  | "catering"
  | "ice_cream"
  | "juice_bar";

// Customer acquisition channels
export type AcquisitionChannel =
  | "walk_in"
  | "online_booking"
  | "phone_call"
  | "referral"
  | "social_media"
  | "google_search"
  | "google_maps"
  | "yelp"
  | "facebook"
  | "instagram"
  | "tiktok"
  | "email_marketing"
  | "direct_mail"
  | "local_event"
  | "partnership"
  | "repeat_customer"
  | "gift_card"
  | "groupon_deal"
  | "loyalty_program"
  | "influencer_collab"
  | "doordash_ubereats"
  | "nextdoor"
  | "online_ordering"
  | "text_marketing";

// Seasonal pattern types
export interface SeasonalPattern {
  month: number; // 1-12
  demandMultiplier: number; // 1.0 = average, 1.5 = 50% above, 0.7 = 30% below
  notes: string;
}

// Key performance indicators for industry
export interface IndustryKPI {
  name: string;
  description: string;
  unit: "currency" | "percentage" | "number" | "time" | "rating";
  benchmarks: {
    poor: number;
    average: number;
    good: number;
    excellent: number;
  };
  higherIsBetter: boolean;
}

// Pricing tier benchmarks
export interface PricingBenchmark {
  service: string;
  lowEnd: number; // cents
  average: number;
  highEnd: number;
  premium: number;
}

// Complete industry profile
export interface IndustryProfile {
  category: IndustryCategory;
  subtype: IndustrySubtype;
  displayName: string;
  description: string;

  // Customer behavior
  typicalCustomerLifetimeMonths: number;
  averageVisitsPerYear: number;
  repeatCustomerRate: number; // 0-1

  // Acquisition channels ranked by typical effectiveness
  primaryChannels: AcquisitionChannel[];
  secondaryChannels: AcquisitionChannel[];
  emergingChannels: AcquisitionChannel[];

  // Seasonal patterns (demand multipliers by month)
  seasonalPatterns: SeasonalPattern[];
  peakSeason: string;
  slowSeason: string;

  // Financial benchmarks
  typicalMargins: {
    gross: number; // 0-1
    net: number;
  };
  laborCostPercentage: number; // of revenue
  rentCostPercentage: number;
  suppliesCostPercentage: number;

  // KPIs to track
  keyMetrics: IndustryKPI[];

  // Pricing benchmarks
  pricingBenchmarks: PricingBenchmark[];

  // Common challenges
  topChallenges: string[];

  // Growth opportunities
  growthStrategies: {
    strategy: string;
    potentialImpact: string;
    difficulty: "easy" | "medium" | "hard";
    timeToResults: string;
  }[];
}

// ==========================================
// INDUSTRY PROFILES DATABASE
// ==========================================

export const INDUSTRY_PROFILES: Record<IndustrySubtype, IndustryProfile> = {
  // ==========================================
  // PET SERVICES
  // ==========================================
  pet_grooming: {
    category: "pet_services",
    subtype: "pet_grooming",
    displayName: "Pet Grooming",
    description: "Professional grooming services for dogs, cats, and other pets",

    typicalCustomerLifetimeMonths: 36,
    averageVisitsPerYear: 8,
    repeatCustomerRate: 0.75,

    primaryChannels: ["referral", "google_maps", "repeat_customer"],
    secondaryChannels: ["yelp", "facebook", "instagram", "walk_in"],
    emergingChannels: ["tiktok", "online_booking", "partnership"],

    seasonalPatterns: [
      { month: 1, demandMultiplier: 0.8, notes: "Post-holiday slowdown" },
      { month: 2, demandMultiplier: 0.85, notes: "Winter slow period" },
      { month: 3, demandMultiplier: 0.95, notes: "Spring prep begins" },
      { month: 4, demandMultiplier: 1.1, notes: "Spring grooming surge" },
      { month: 5, demandMultiplier: 1.2, notes: "Pre-summer rush" },
      { month: 6, demandMultiplier: 1.25, notes: "Summer coat maintenance peak" },
      { month: 7, demandMultiplier: 1.15, notes: "Summer steady" },
      { month: 8, demandMultiplier: 1.1, notes: "Back to school timing" },
      { month: 9, demandMultiplier: 1.0, notes: "Fall transition" },
      { month: 10, demandMultiplier: 0.95, notes: "Fall maintenance" },
      { month: 11, demandMultiplier: 1.15, notes: "Pre-holiday grooming" },
      { month: 12, demandMultiplier: 1.3, notes: "Holiday peak - family photos, gatherings" },
    ],
    peakSeason: "December and May-June",
    slowSeason: "January-February",

    typicalMargins: { gross: 0.55, net: 0.15 },
    laborCostPercentage: 0.40,
    rentCostPercentage: 0.10,
    suppliesCostPercentage: 0.08,

    keyMetrics: [
      {
        name: "Average Ticket",
        description: "Average revenue per grooming appointment",
        unit: "currency",
        benchmarks: { poor: 3500, average: 5500, good: 7500, excellent: 10000 },
        higherIsBetter: true,
      },
      {
        name: "Appointments Per Day",
        description: "Number of grooming appointments completed daily",
        unit: "number",
        benchmarks: { poor: 3, average: 5, good: 7, excellent: 10 },
        higherIsBetter: true,
      },
      {
        name: "Rebooking Rate",
        description: "Percentage of clients who book next appointment before leaving",
        unit: "percentage",
        benchmarks: { poor: 0.20, average: 0.40, good: 0.60, excellent: 0.80 },
        higherIsBetter: true,
      },
      {
        name: "Client Retention Rate",
        description: "Percentage of clients who return within 90 days",
        unit: "percentage",
        benchmarks: { poor: 0.50, average: 0.65, good: 0.75, excellent: 0.85 },
        higherIsBetter: true,
      },
      {
        name: "No-Show Rate",
        description: "Percentage of booked appointments that no-show",
        unit: "percentage",
        benchmarks: { poor: 0.15, average: 0.08, good: 0.05, excellent: 0.02 },
        higherIsBetter: false,
      },
    ],

    pricingBenchmarks: [
      { service: "Small Dog Bath & Brush", lowEnd: 2500, average: 3500, highEnd: 5000, premium: 7500 },
      { service: "Small Dog Full Groom", lowEnd: 4000, average: 5500, highEnd: 7500, premium: 10000 },
      { service: "Medium Dog Full Groom", lowEnd: 5500, average: 7000, highEnd: 9000, premium: 12000 },
      { service: "Large Dog Full Groom", lowEnd: 7000, average: 8500, highEnd: 11000, premium: 15000 },
      { service: "Cat Grooming", lowEnd: 5000, average: 7500, highEnd: 10000, premium: 15000 },
      { service: "Nail Trim Only", lowEnd: 1000, average: 1500, highEnd: 2000, premium: 2500 },
      { service: "De-shedding Treatment", lowEnd: 2000, average: 3500, highEnd: 5000, premium: 7500 },
    ],

    topChallenges: [
      "Managing no-shows and last-minute cancellations",
      "Seasonal demand fluctuations",
      "Finding and retaining skilled groomers",
      "Handling difficult or aggressive pets",
      "Competing with mobile groomers and big-box stores",
    ],

    growthStrategies: [
      {
        strategy: "Implement online booking with automated reminders",
        potentialImpact: "Could reduce no-shows by 40-60% and increase bookings by 15%",
        difficulty: "easy",
        timeToResults: "1-2 months",
      },
      {
        strategy: "Launch a recurring grooming membership program",
        potentialImpact: "Could increase customer lifetime value by 30-50%",
        difficulty: "medium",
        timeToResults: "3-6 months",
      },
      {
        strategy: "Partner with local vets and pet stores for referrals",
        potentialImpact: "Could bring 20-30% new customer growth",
        difficulty: "medium",
        timeToResults: "2-4 months",
      },
      {
        strategy: "Add mobile grooming service for premium customers",
        potentialImpact: "Could add 25-40% revenue at higher margins",
        difficulty: "hard",
        timeToResults: "6-12 months",
      },
      {
        strategy: "Create holiday photo packages with local photographer",
        potentialImpact: "Could boost December revenue by 20-30%",
        difficulty: "easy",
        timeToResults: "1 month",
      },
    ],
  },

  // ==========================================
  // SALON & SPA
  // ==========================================
  hair_salon: {
    category: "salon_spa",
    subtype: "hair_salon",
    displayName: "Hair Salon",
    description: "Professional hair cutting, styling, and coloring services",

    typicalCustomerLifetimeMonths: 48,
    averageVisitsPerYear: 6,
    repeatCustomerRate: 0.70,

    primaryChannels: ["referral", "repeat_customer", "walk_in"],
    secondaryChannels: ["instagram", "google_maps", "facebook"],
    emergingChannels: ["tiktok", "online_booking", "influencer_collab"],

    seasonalPatterns: [
      { month: 1, demandMultiplier: 0.85, notes: "Post-holiday slowdown" },
      { month: 2, demandMultiplier: 0.90, notes: "Valentine's boost" },
      { month: 3, demandMultiplier: 1.0, notes: "Spring refresh" },
      { month: 4, demandMultiplier: 1.15, notes: "Prom/wedding season starts" },
      { month: 5, demandMultiplier: 1.25, notes: "Wedding/graduation peak" },
      { month: 6, demandMultiplier: 1.20, notes: "Summer wedding season" },
      { month: 7, demandMultiplier: 1.0, notes: "Summer steady" },
      { month: 8, demandMultiplier: 1.05, notes: "Back to school" },
      { month: 9, demandMultiplier: 1.0, notes: "Fall transition" },
      { month: 10, demandMultiplier: 1.05, notes: "Fall color trends" },
      { month: 11, demandMultiplier: 1.15, notes: "Pre-holiday prep" },
      { month: 12, demandMultiplier: 1.30, notes: "Holiday parties peak" },
    ],
    peakSeason: "December and April-June",
    slowSeason: "January",

    typicalMargins: { gross: 0.50, net: 0.12 },
    laborCostPercentage: 0.45,
    rentCostPercentage: 0.12,
    suppliesCostPercentage: 0.10,

    keyMetrics: [
      {
        name: "Average Ticket",
        description: "Average revenue per client visit",
        unit: "currency",
        benchmarks: { poor: 4500, average: 6500, good: 9000, excellent: 15000 },
        higherIsBetter: true,
      },
      {
        name: "Retail Per Service",
        description: "Product sales per service dollar",
        unit: "percentage",
        benchmarks: { poor: 0.05, average: 0.15, good: 0.25, excellent: 0.35 },
        higherIsBetter: true,
      },
      {
        name: "Rebooking Rate",
        description: "Clients who book next appointment before leaving",
        unit: "percentage",
        benchmarks: { poor: 0.30, average: 0.50, good: 0.70, excellent: 0.85 },
        higherIsBetter: true,
      },
      {
        name: "Chair Utilization",
        description: "Percentage of available appointment slots filled",
        unit: "percentage",
        benchmarks: { poor: 0.50, average: 0.65, good: 0.80, excellent: 0.90 },
        higherIsBetter: true,
      },
    ],

    pricingBenchmarks: [
      { service: "Women's Haircut", lowEnd: 3500, average: 5500, highEnd: 8500, premium: 15000 },
      { service: "Men's Haircut", lowEnd: 2000, average: 3000, highEnd: 4500, premium: 6500 },
      { service: "Full Color", lowEnd: 8000, average: 12000, highEnd: 18000, premium: 30000 },
      { service: "Highlights (Partial)", lowEnd: 7500, average: 11000, highEnd: 16000, premium: 25000 },
      { service: "Blowout", lowEnd: 3500, average: 5000, highEnd: 7500, premium: 12000 },
    ],

    topChallenges: [
      "Stylist turnover and retention",
      "No-shows and last-minute cancellations",
      "Increasing product sales",
      "Managing peak demand scheduling",
      "Social media presence and marketing",
    ],

    growthStrategies: [
      {
        strategy: "Implement text reminder system for appointments",
        potentialImpact: "Could reduce no-shows by 50% and recover $500-1500/month",
        difficulty: "easy",
        timeToResults: "1 month",
      },
      {
        strategy: "Create membership/subscription program",
        potentialImpact: "Could increase retention by 40% and predictable revenue",
        difficulty: "medium",
        timeToResults: "3-6 months",
      },
      {
        strategy: "Launch bridal/special event packages",
        potentialImpact: "Could add 15-25% revenue during peak season",
        difficulty: "medium",
        timeToResults: "2-3 months",
      },
    ],
  },

  // ==========================================
  // RESTAURANT
  // ==========================================
  fast_casual: {
    category: "restaurant",
    subtype: "fast_casual",
    displayName: "Fast Casual Restaurant",
    description: "Counter-service restaurant with higher quality food than fast food",

    typicalCustomerLifetimeMonths: 24,
    averageVisitsPerYear: 18,
    repeatCustomerRate: 0.55,

    primaryChannels: ["walk_in", "google_maps", "repeat_customer"],
    secondaryChannels: ["doordash_ubereats", "yelp", "instagram"],
    emergingChannels: ["tiktok", "loyalty_program", "online_ordering"],

    seasonalPatterns: [
      { month: 1, demandMultiplier: 0.85, notes: "Post-holiday health focus" },
      { month: 2, demandMultiplier: 0.90, notes: "Winter steady" },
      { month: 3, demandMultiplier: 1.0, notes: "Spring pickup" },
      { month: 4, demandMultiplier: 1.05, notes: "Spring steady" },
      { month: 5, demandMultiplier: 1.10, notes: "Outdoor seating boost" },
      { month: 6, demandMultiplier: 1.05, notes: "Summer lunch crowd" },
      { month: 7, demandMultiplier: 0.95, notes: "Vacation slowdown" },
      { month: 8, demandMultiplier: 1.0, notes: "Back to school/work" },
      { month: 9, demandMultiplier: 1.05, notes: "Fall business picks up" },
      { month: 10, demandMultiplier: 1.05, notes: "Fall steady" },
      { month: 11, demandMultiplier: 1.0, notes: "Pre-holiday" },
      { month: 12, demandMultiplier: 0.90, notes: "Holiday parties elsewhere" },
    ],
    peakSeason: "Spring and Fall lunch hours",
    slowSeason: "January and December",

    typicalMargins: { gross: 0.65, net: 0.08 },
    laborCostPercentage: 0.30,
    rentCostPercentage: 0.08,
    suppliesCostPercentage: 0.30,

    keyMetrics: [
      {
        name: "Average Check",
        description: "Average revenue per transaction",
        unit: "currency",
        benchmarks: { poor: 1000, average: 1400, good: 1800, excellent: 2500 },
        higherIsBetter: true,
      },
      {
        name: "Food Cost Percentage",
        description: "Cost of food as percentage of revenue",
        unit: "percentage",
        benchmarks: { poor: 0.38, average: 0.32, good: 0.28, excellent: 0.25 },
        higherIsBetter: false,
      },
      {
        name: "Table Turn Time",
        description: "Average time customer occupies table (minutes)",
        unit: "time",
        benchmarks: { poor: 45, average: 30, good: 22, excellent: 18 },
        higherIsBetter: false,
      },
      {
        name: "Daily Transactions",
        description: "Number of transactions per day",
        unit: "number",
        benchmarks: { poor: 80, average: 150, good: 250, excellent: 400 },
        higherIsBetter: true,
      },
    ],

    pricingBenchmarks: [
      { service: "Entree", lowEnd: 1000, average: 1400, highEnd: 1800, premium: 2200 },
      { service: "Side", lowEnd: 300, average: 450, highEnd: 600, premium: 800 },
      { service: "Beverage", lowEnd: 250, average: 350, highEnd: 500, premium: 700 },
      { service: "Combo Meal", lowEnd: 1200, average: 1600, highEnd: 2000, premium: 2500 },
    ],

    topChallenges: [
      "Food cost management and waste",
      "Staff scheduling and labor costs",
      "Delivery app commission fees",
      "Lunch rush efficiency",
      "Customer acquisition costs",
    ],

    growthStrategies: [
      {
        strategy: "Launch loyalty/rewards program",
        potentialImpact: "Could increase repeat visits by 25-35%",
        difficulty: "easy",
        timeToResults: "2-3 months",
      },
      {
        strategy: "Optimize delivery menu for profitability",
        potentialImpact: "Could improve delivery margins by 10-15%",
        difficulty: "medium",
        timeToResults: "1-2 months",
      },
      {
        strategy: "Implement catering for local businesses",
        potentialImpact: "Could add 20-30% revenue stream",
        difficulty: "medium",
        timeToResults: "3-6 months",
      },
    ],
  },

  // ==========================================
  // AUTOMOTIVE
  // ==========================================
  auto_repair: {
    category: "automotive",
    subtype: "auto_repair",
    displayName: "Auto Repair Shop",
    description: "Automotive maintenance and repair services",

    typicalCustomerLifetimeMonths: 60,
    averageVisitsPerYear: 3,
    repeatCustomerRate: 0.65,

    primaryChannels: ["repeat_customer", "referral", "google_maps"],
    secondaryChannels: ["google_search", "yelp", "nextdoor"],
    emergingChannels: ["online_booking", "text_marketing", "loyalty_program"],

    seasonalPatterns: [
      { month: 1, demandMultiplier: 0.85, notes: "Post-holiday slow" },
      { month: 2, demandMultiplier: 0.90, notes: "Winter maintenance" },
      { month: 3, demandMultiplier: 1.10, notes: "Spring prep - tire changes, AC" },
      { month: 4, demandMultiplier: 1.15, notes: "Spring road trip prep" },
      { month: 5, demandMultiplier: 1.10, notes: "Pre-summer checks" },
      { month: 6, demandMultiplier: 1.05, notes: "AC repairs peak" },
      { month: 7, demandMultiplier: 1.0, notes: "Summer steady" },
      { month: 8, demandMultiplier: 1.0, notes: "Back to school" },
      { month: 9, demandMultiplier: 1.05, notes: "Fall maintenance" },
      { month: 10, demandMultiplier: 1.15, notes: "Winter prep - tires, heating" },
      { month: 11, demandMultiplier: 1.10, notes: "Holiday travel prep" },
      { month: 12, demandMultiplier: 0.85, notes: "Holiday slowdown" },
    ],
    peakSeason: "March-April and October",
    slowSeason: "January and December",

    typicalMargins: { gross: 0.50, net: 0.12 },
    laborCostPercentage: 0.35,
    rentCostPercentage: 0.08,
    suppliesCostPercentage: 0.35,

    keyMetrics: [
      {
        name: "Average Repair Order",
        description: "Average revenue per repair ticket",
        unit: "currency",
        benchmarks: { poor: 25000, average: 40000, good: 55000, excellent: 75000 },
        higherIsBetter: true,
      },
      {
        name: "Labor Rate",
        description: "Hourly labor rate charged",
        unit: "currency",
        benchmarks: { poor: 8000, average: 11000, good: 14000, excellent: 18000 },
        higherIsBetter: true,
      },
      {
        name: "Technician Efficiency",
        description: "Billed hours vs clock hours",
        unit: "percentage",
        benchmarks: { poor: 0.70, average: 0.85, good: 1.0, excellent: 1.15 },
        higherIsBetter: true,
      },
      {
        name: "Customer Return Rate",
        description: "Customers returning within 12 months",
        unit: "percentage",
        benchmarks: { poor: 0.40, average: 0.55, good: 0.70, excellent: 0.85 },
        higherIsBetter: true,
      },
    ],

    pricingBenchmarks: [
      { service: "Oil Change (Synthetic)", lowEnd: 5000, average: 7500, highEnd: 10000, premium: 15000 },
      { service: "Brake Pad Replacement", lowEnd: 15000, average: 25000, highEnd: 35000, premium: 50000 },
      { service: "Tire Rotation", lowEnd: 2000, average: 3500, highEnd: 5000, premium: 7500 },
      { service: "Diagnostic Fee", lowEnd: 7500, average: 12500, highEnd: 17500, premium: 25000 },
    ],

    topChallenges: [
      "Finding and retaining qualified technicians",
      "Competing with dealerships and chains",
      "Parts sourcing and markup pressure",
      "Customer trust and transparency",
      "Keeping up with new vehicle technology",
    ],

    growthStrategies: [
      {
        strategy: "Implement digital vehicle inspections with photos",
        potentialImpact: "Could increase repair approval rate by 20-30%",
        difficulty: "medium",
        timeToResults: "2-3 months",
      },
      {
        strategy: "Launch fleet maintenance program for local businesses",
        potentialImpact: "Could add steady 15-25% revenue",
        difficulty: "medium",
        timeToResults: "3-6 months",
      },
      {
        strategy: "Create prepaid maintenance packages",
        potentialImpact: "Could improve cash flow and retention by 35%",
        difficulty: "easy",
        timeToResults: "1-2 months",
      },
    ],
  },

  // Add placeholder entries for other subtypes to satisfy TypeScript
  // In production, each would have full profiles like above
  pet_boarding: createPlaceholderProfile("pet_services", "pet_boarding", "Pet Boarding"),
  veterinary: createPlaceholderProfile("pet_services", "veterinary", "Veterinary Clinic"),
  pet_training: createPlaceholderProfile("pet_services", "pet_training", "Pet Training"),
  pet_daycare: createPlaceholderProfile("pet_services", "pet_daycare", "Pet Daycare"),
  nail_salon: createPlaceholderProfile("salon_spa", "nail_salon", "Nail Salon"),
  barbershop: createPlaceholderProfile("salon_spa", "barbershop", "Barbershop"),
  day_spa: createPlaceholderProfile("salon_spa", "day_spa", "Day Spa"),
  med_spa: createPlaceholderProfile("salon_spa", "med_spa", "Med Spa"),
  fine_dining: createPlaceholderProfile("restaurant", "fine_dining", "Fine Dining Restaurant"),
  cafe_coffee: createPlaceholderProfile("restaurant", "cafe_coffee", "Cafe/Coffee Shop"),
  bar_nightclub: createPlaceholderProfile("restaurant", "bar_nightclub", "Bar/Nightclub"),
  food_truck: createPlaceholderProfile("restaurant", "food_truck", "Food Truck"),
  boutique: createPlaceholderProfile("retail", "boutique", "Boutique"),
  convenience: createPlaceholderProfile("retail", "convenience", "Convenience Store"),
  specialty_retail: createPlaceholderProfile("retail", "specialty_retail", "Specialty Retail"),
  gift_shop: createPlaceholderProfile("retail", "gift_shop", "Gift Shop"),
  car_wash: createPlaceholderProfile("automotive", "car_wash", "Car Wash"),
  auto_detailing: createPlaceholderProfile("automotive", "auto_detailing", "Auto Detailing"),
  tire_shop: createPlaceholderProfile("automotive", "tire_shop", "Tire Shop"),
  dental: createPlaceholderProfile("healthcare", "dental", "Dental Practice"),
  chiropractic: createPlaceholderProfile("healthcare", "chiropractic", "Chiropractic"),
  physical_therapy: createPlaceholderProfile("healthcare", "physical_therapy", "Physical Therapy"),
  optometry: createPlaceholderProfile("healthcare", "optometry", "Optometry"),
  accounting: createPlaceholderProfile("professional_services", "accounting", "Accounting Firm"),
  legal: createPlaceholderProfile("professional_services", "legal", "Law Practice"),
  consulting: createPlaceholderProfile("professional_services", "consulting", "Consulting"),
  real_estate: createPlaceholderProfile("professional_services", "real_estate", "Real Estate"),
  gym: createPlaceholderProfile("fitness", "gym", "Gym/Fitness Center"),
  yoga_studio: createPlaceholderProfile("fitness", "yoga_studio", "Yoga Studio"),
  personal_training: createPlaceholderProfile("fitness", "personal_training", "Personal Training"),
  martial_arts: createPlaceholderProfile("fitness", "martial_arts", "Martial Arts Studio"),
  landscaping: createPlaceholderProfile("home_services", "landscaping", "Landscaping"),
  cleaning: createPlaceholderProfile("home_services", "cleaning", "Cleaning Service"),
  plumbing: createPlaceholderProfile("home_services", "plumbing", "Plumbing"),
  hvac: createPlaceholderProfile("home_services", "hvac", "HVAC"),
  electrical: createPlaceholderProfile("home_services", "electrical", "Electrical"),
  bakery: createPlaceholderProfile("food_beverage", "bakery", "Bakery"),
  catering: createPlaceholderProfile("food_beverage", "catering", "Catering"),
  ice_cream: createPlaceholderProfile("food_beverage", "ice_cream", "Ice Cream Shop"),
  juice_bar: createPlaceholderProfile("food_beverage", "juice_bar", "Juice Bar"),
};

// Helper to create placeholder profiles
function createPlaceholderProfile(
  category: IndustryCategory,
  subtype: IndustrySubtype,
  displayName: string
): IndustryProfile {
  return {
    category,
    subtype,
    displayName,
    description: `Professional ${displayName.toLowerCase()} services`,
    typicalCustomerLifetimeMonths: 36,
    averageVisitsPerYear: 6,
    repeatCustomerRate: 0.60,
    primaryChannels: ["referral", "google_maps", "repeat_customer"],
    secondaryChannels: ["yelp", "facebook", "walk_in"],
    emergingChannels: ["instagram", "online_booking"],
    seasonalPatterns: generateDefaultSeasonalPattern(),
    peakSeason: "Varies by location",
    slowSeason: "January-February",
    typicalMargins: { gross: 0.50, net: 0.10 },
    laborCostPercentage: 0.35,
    rentCostPercentage: 0.10,
    suppliesCostPercentage: 0.15,
    keyMetrics: [],
    pricingBenchmarks: [],
    topChallenges: [
      "Customer acquisition",
      "Staff retention",
      "Competition",
      "Cash flow management",
      "Marketing effectiveness",
    ],
    growthStrategies: [
      {
        strategy: "Implement referral program",
        potentialImpact: "Could increase new customers by 20-30%",
        difficulty: "easy",
        timeToResults: "2-3 months",
      },
      {
        strategy: "Launch online booking",
        potentialImpact: "Could reduce no-shows and increase bookings",
        difficulty: "easy",
        timeToResults: "1-2 months",
      },
    ],
  };
}

// Generate default seasonal pattern
function generateDefaultSeasonalPattern(): SeasonalPattern[] {
  return [
    { month: 1, demandMultiplier: 0.85, notes: "Post-holiday slowdown" },
    { month: 2, demandMultiplier: 0.90, notes: "Winter slow" },
    { month: 3, demandMultiplier: 1.0, notes: "Spring pickup" },
    { month: 4, demandMultiplier: 1.05, notes: "Spring steady" },
    { month: 5, demandMultiplier: 1.10, notes: "Pre-summer" },
    { month: 6, demandMultiplier: 1.05, notes: "Summer start" },
    { month: 7, demandMultiplier: 1.0, notes: "Summer steady" },
    { month: 8, demandMultiplier: 1.0, notes: "Late summer" },
    { month: 9, demandMultiplier: 1.05, notes: "Fall pickup" },
    { month: 10, demandMultiplier: 1.05, notes: "Fall steady" },
    { month: 11, demandMultiplier: 1.10, notes: "Pre-holiday" },
    { month: 12, demandMultiplier: 1.0, notes: "Holiday variable" },
  ];
}

// Get profile by subtype
export function getIndustryProfile(subtype: IndustrySubtype): IndustryProfile {
  return INDUSTRY_PROFILES[subtype];
}

// Get all profiles for a category
export function getProfilesByCategory(category: IndustryCategory): IndustryProfile[] {
  return Object.values(INDUSTRY_PROFILES).filter((p) => p.category === category);
}

// Get current month's demand multiplier
export function getCurrentSeasonalMultiplier(profile: IndustryProfile): {
  multiplier: number;
  notes: string;
  isSlowPeriod: boolean;
  isPeakPeriod: boolean;
} {
  const currentMonth = new Date().getMonth() + 1;
  const pattern = profile.seasonalPatterns.find((p) => p.month === currentMonth);

  if (!pattern) {
    return { multiplier: 1.0, notes: "No data", isSlowPeriod: false, isPeakPeriod: false };
  }

  return {
    multiplier: pattern.demandMultiplier,
    notes: pattern.notes,
    isSlowPeriod: pattern.demandMultiplier < 0.95,
    isPeakPeriod: pattern.demandMultiplier > 1.1,
  };
}
