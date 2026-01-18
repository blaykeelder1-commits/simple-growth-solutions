"use client";

import { cn } from "@/lib/utils";
import { Bot, Target, ShoppingCart, Zap, LucideIcon } from "lucide-react";

export interface AIFeature {
  id: string;
  title: string;
  description: string;
  icon: "Bot" | "Target" | "ShoppingCart" | "Zap";
}

const iconMap: Record<string, LucideIcon> = {
  Bot,
  Target,
  ShoppingCart,
  Zap,
};

interface AIFeatureCardProps {
  feature: AIFeature;
  className?: string;
}

export function AIFeatureCard({ feature, className }: AIFeatureCardProps) {
  const Icon = iconMap[feature.icon] || Bot;

  return (
    <div
      className={cn(
        "group relative rounded-xl border border-gray-200 bg-white p-5 transition-all duration-300",
        "hover:border-purple-300 hover:shadow-lg hover:-translate-y-0.5",
        className
      )}
    >
      <div className="flex items-start gap-4">
        <div className="rounded-lg bg-gradient-to-br from-purple-100 to-blue-100 p-2.5 group-hover:from-purple-200 group-hover:to-blue-200 transition-colors">
          <Icon className="h-5 w-5 text-purple-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 mb-1">{feature.title}</h4>
          <p className="text-sm text-gray-600 leading-relaxed">{feature.description}</p>
        </div>
      </div>
    </div>
  );
}

// Default AI features data
export const defaultAIFeatures: AIFeature[] = [
  {
    id: "chatbot",
    title: "AI Chatbot",
    description: "24/7 customer support that captures leads while you sleep",
    icon: "Bot",
  },
  {
    id: "lead-capture",
    title: "Smart Lead Capture",
    description: "Intelligent forms that adapt to visitor behavior",
    icon: "Target",
  },
  {
    id: "checkout",
    title: "Smooth Checkout",
    description: "Friction-free purchasing experience",
    icon: "ShoppingCart",
  },
  {
    id: "speed",
    title: "Lightning Fast",
    description: "Sub-second load times on all devices",
    icon: "Zap",
  },
];

// Grid component for displaying multiple AI feature cards
interface AIFeatureGridProps {
  features?: AIFeature[];
  className?: string;
}

export function AIFeatureGrid({ features = defaultAIFeatures, className }: AIFeatureGridProps) {
  return (
    <div className={cn("grid gap-4 grid-cols-1 sm:grid-cols-2", className)}>
      {features.map((feature) => (
        <AIFeatureCard key={feature.id} feature={feature} />
      ))}
    </div>
  );
}
