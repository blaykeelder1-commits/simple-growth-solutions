import { z } from "zod";

export const leadFormSchema = z.object({
  businessName: z
    .string()
    .min(2, "Business name must be at least 2 characters")
    .max(100, "Business name must be less than 100 characters"),
  contactName: z
    .string()
    .min(2, "Contact name must be at least 2 characters")
    .max(100, "Contact name must be less than 100 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z
    .string()
    .min(10, "Please enter a valid phone number")
    .max(20, "Phone number is too long")
    .optional()
    .or(z.literal("")),
  hasWebsite: z.enum(["yes", "no"]),
  websiteUrl: z
    .string()
    .url("Please enter a valid URL (including https://)")
    .optional()
    .or(z.literal("")),
  industry: z.string().min(1, "Please select an industry"),
  challenges: z
    .string()
    .min(10, "Please describe your challenges in at least 10 characters")
    .max(1000, "Please keep your response under 1000 characters"),
});

export type LeadFormData = z.infer<typeof leadFormSchema>;

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
