// Unified AI Chat API
// Handles conversational queries across CashFlow AI and Business Chauffeur
// Provides the "talk to your business sidekick" experience

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  buildUnifiedContext,
  formatContextForAI,
  type UnifiedPlatformContext,
} from "@/lib/shared/platform-context";
import {
  getIndustryProfile,
  getQuickInsights,
  type IndustrySubtype,
} from "@/lib/industry";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface ChatRequest {
  message: string;
  conversationHistory?: ChatMessage[];
}

export interface ChatResponse {
  message: string;
  suggestions?: string[];
  relatedData?: {
    type: "invoice" | "client" | "insight" | "recommendation";
    id: string;
    title: string;
  }[];
  actions?: {
    label: string;
    action: string;
    params?: Record<string, string>;
  }[];
}

const SYSTEM_PROMPT = `You are the AI assistant for Simple Growth Solutions, a unified business intelligence platform. You serve as the user's "ultimate business sidekick" - helping them understand their business data, make informed decisions, and grow their business.

## Your Platforms

You have access to data from multiple integrated platforms:

1. **CashFlow AI** - Accounts receivable management
   - Tracks invoices, payments, and client payment behaviors
   - Calculates health scores and risk levels
   - Provides collection recommendations
   - Forecasts cash inflows 30/60/90 days out
   - Charges 8% of collected amounts

2. **Business Chauffeur** - Operations intelligence ($200/month)
   - Connects to POS systems (Square, Clover, Toast)
   - Connects to accounting (QuickBooks, Xero)
   - Connects to review platforms (Google, Yelp)
   - Connects to payroll (Gusto)
   - Connects to bank accounts (Plaid)
   - Provides industry-specific insights
   - Analyzes customer acquisition channels
   - Identifies seasonal patterns
   - Benchmarks against regional competitors

3. **Cybersecurity Platform** (coming soon)
   - Security monitoring and protection

## Industry Intelligence Capabilities

When the user's industry is known, you can provide:
- **Customer Acquisition Analysis**: "I see you get a lot of customers through [channel], we could increase focus there"
- **Seasonal Pattern Insights**: "This is typically a slow period - running specials could increase revenue by 15-20%"
- **Regional Benchmarking**: "Your pricing puts you in the top X% for your area"
- **Growth Strategies**: Industry-specific tactics with potential impact estimates

## Your Personality

- Be friendly, professional, and genuinely helpful
- Speak like a trusted business advisor, not a robot
- Use simple language - avoid jargon unless the user uses it first
- Be concise but thorough - respect the user's time
- Show enthusiasm when sharing positive insights
- Be empathetic when discussing challenges

## Critical Language Requirements

ALWAYS use suggestive, non-directive language:
- Say "could", "might", "consider", "potential" instead of "should", "must", "need to"
- Frame suggestions as possibilities: "You could consider..." not "You should..."
- Use hedging: "Based on the data, one approach could be..."
- Never give direct financial, legal, or business advice
- Always remind users to consult qualified professionals for major decisions

## Response Guidelines

1. **Answer the question directly first**, then provide context
2. **Use specific numbers** from their data when available
3. **Connect dots** across systems when relevant (e.g., "Your payroll timing might be affecting cash flow")
4. **Provide industry context** when available (e.g., "In the pet grooming industry, this is typical")
5. **Suggest next steps** as possibilities, not directives
6. **Be honest** about data limitations or uncertainty

## When You Don't Have Data

If the user asks about something you don't have data for:
- Acknowledge the limitation
- Explain what integration or data would help
- Offer to help with what you do know

## Formatting

- Use markdown for readability
- Use bullet points for lists
- Bold key numbers and insights
- Keep responses focused and scannable`;

// Generate suggested follow-up questions based on context
function generateSuggestions(
  context: UnifiedPlatformContext,
  userMessage: string,
  hasIndustryProfile: boolean = false
): string[] {
  const suggestions: string[] = [];

  // CashFlow AI suggestions
  if (context.cashFlowAI) {
    if (context.cashFlowAI.overdueReceivables > 0) {
      suggestions.push("Which clients should I follow up with first?");
    }
    if (context.cashFlowAI.pendingRecommendations.length > 0) {
      suggestions.push("What are your top recommendations for improving collections?");
    }
    suggestions.push("How does my cash flow look for next month?");
  }

  // Business Chauffeur suggestions
  if (context.businessChauffeur) {
    if (context.businessChauffeur.payroll) {
      suggestions.push("Is my payroll cost healthy compared to revenue?");
    }
    suggestions.push("What's affecting my business health score?");
    suggestions.push("Are there any patterns I should know about?");
  }

  // Industry-specific suggestions
  if (hasIndustryProfile) {
    suggestions.push("Where are most of my customers coming from?");
    suggestions.push("Is this a slow season for my business?");
    suggestions.push("How do my prices compare to others in my area?");
    suggestions.push("What could I do to increase revenue this month?");
  }

  // Bank data suggestions
  if (context.bankData) {
    suggestions.push("How's my runway looking?");
    suggestions.push("What are my biggest expenses?");
  }

  // General suggestions
  suggestions.push("How can I improve my overall business health?");
  suggestions.push("What should I focus on this week?");

  // Return top 3-4 unique suggestions, excluding ones similar to user's message
  const filtered = suggestions.filter(s =>
    !userMessage.toLowerCase().includes(s.toLowerCase().slice(0, 20))
  );

  return filtered.slice(0, 4);
}

// Identify related data entities from the response
function identifyRelatedData(
  context: UnifiedPlatformContext,
  response: string
): ChatResponse["relatedData"] {
  const related: ChatResponse["relatedData"] = [];

  // Check if response mentions specific clients
  if (context.cashFlowAI?.topOverdueClients) {
    context.cashFlowAI.topOverdueClients.forEach(client => {
      if (response.toLowerCase().includes(client.name.toLowerCase())) {
        related.push({
          type: "client",
          id: client.name, // Would use actual ID in production
          title: client.name,
        });
      }
    });
  }

  // Check if response mentions recommendations
  if (context.cashFlowAI?.pendingRecommendations) {
    context.cashFlowAI.pendingRecommendations.forEach(rec => {
      if (response.toLowerCase().includes(rec.title.toLowerCase())) {
        related.push({
          type: "recommendation",
          id: rec.type,
          title: rec.title,
        });
      }
    });
  }

  return related.slice(0, 5);
}

// Generate action buttons based on context and response
function generateActions(
  context: UnifiedPlatformContext,
  userMessage: string,
  response: string
): ChatResponse["actions"] {
  const actions: ChatResponse["actions"] = [];

  // If discussing overdue invoices
  if (
    userMessage.toLowerCase().includes("overdue") ||
    userMessage.toLowerCase().includes("collect") ||
    response.toLowerCase().includes("overdue")
  ) {
    actions.push({
      label: "View Overdue Invoices",
      action: "navigate",
      params: { path: "/dashboard/cashflow/invoices?status=overdue" },
    });
  }

  // If discussing clients
  if (
    userMessage.toLowerCase().includes("client") ||
    response.toLowerCase().includes("client")
  ) {
    actions.push({
      label: "View Clients",
      action: "navigate",
      params: { path: "/dashboard/cashflow/clients" },
    });
  }

  // If discussing health or insights
  if (
    userMessage.toLowerCase().includes("health") ||
    userMessage.toLowerCase().includes("insight")
  ) {
    actions.push({
      label: "View Business Health",
      action: "navigate",
      params: { path: "/dashboard/chauffeur/unified" },
    });
  }

  // If discussing payroll
  if (
    userMessage.toLowerCase().includes("payroll") ||
    userMessage.toLowerCase().includes("employee")
  ) {
    actions.push({
      label: "View Payroll Analytics",
      action: "navigate",
      params: { path: "/dashboard/payroll" },
    });
  }

  return actions.slice(0, 3);
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's organization
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { organization: true },
    });

    if (!user?.organizationId) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 400 }
      );
    }

    const body: ChatRequest = await request.json();
    const { message, conversationHistory = [] } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Build unified context
    const context = await buildUnifiedContext(user.organizationId);

    if (!context) {
      return NextResponse.json(
        { error: "Failed to load business context" },
        { status: 500 }
      );
    }

    // Get organization settings for industry intelligence
    const orgSettings = await prisma.organizationSettings.findUnique({
      where: { organizationId: user.organizationId },
    });

    // Build industry context if available
    let industryContext = "";
    if (orgSettings?.industrySubtype) {
      const industrySubtype = orgSettings.industrySubtype as IndustrySubtype;
      const region = orgSettings.region || "TX";
      const profile = getIndustryProfile(industrySubtype);

      // Get quick insights based on available metrics
      const avgTicket = context.cashFlowAI
        ? Math.round(context.cashFlowAI.totalReceivables / 100)
        : 5000;
      const monthlyRevenue = context.bankData?.monthlyIncome || 0;

      const quickInsights = getQuickInsights(industrySubtype, region, {
        averageTicket: avgTicket,
        monthlyRevenue: monthlyRevenue * 100, // Convert to cents
        repeatRate: 0.4, // Would calculate from actual data
      });

      industryContext = `
## Industry Intelligence (${profile.displayName})
Region: ${region}
- Typical customer visits ${profile.averageVisitsPerYear}x/year
- Industry repeat rate: ${Math.round(profile.repeatCustomerRate * 100)}%
- Primary acquisition channels: ${profile.primaryChannels.slice(0, 3).join(", ")}
- Seasonal pattern: ${profile.seasonalPatterns.find(p => p.month === new Date().getMonth() + 1)?.notes || "Normal demand"}

Quick Insights:
${quickInsights.map(i => `- ${i}`).join("\n")}
`;
    }

    // Check for API key
    const apiKey = process.env.GOOGLE_AI_API_KEY;

    if (!apiKey) {
      // Return a helpful response without AI
      return NextResponse.json({
        message: `I'd love to help you with that! However, the AI assistant isn't configured yet.

Here's what I can tell you from your data:

${formatContextForAI(context)}
${industryContext}

To enable full conversational AI, please configure the GOOGLE_AI_API_KEY environment variable.`,
        suggestions: generateSuggestions(context, message, !!orgSettings?.industrySubtype),
        actions: generateActions(context, message, ""),
      });
    }

    // Build conversation messages
    const contextSummary = formatContextForAI(context);

    const messages: { role: "user" | "assistant"; content: string }[] = [
      // Include recent conversation history (last 10 messages)
      ...conversationHistory.slice(-10).map(msg => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
      // Current message with context
      {
        role: "user" as const,
        content: `Current Business Data:
---
${contextSummary}
${industryContext}
---

User Question: ${message}`,
      },
    ];

    // Call Gemini API
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Build the full prompt with system context
    const fullPrompt = `${SYSTEM_PROMPT}

${messages.map(m => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`).join("\n\n")}`;

    const result = await model.generateContent(fullPrompt);
    const geminiResponse = await result.response;
    const assistantMessage = geminiResponse.text();

    // Generate response metadata
    const suggestions = generateSuggestions(context, message, !!orgSettings?.industrySubtype);
    const relatedData = identifyRelatedData(context, assistantMessage);
    const actions = generateActions(context, message, assistantMessage);

    // Log the conversation for analytics (optional)
    try {
      await prisma.chatMessage.create({
        data: {
          organizationId: user.organizationId,
          userId: user.id,
          role: "user",
          content: message,
        },
      });

      await prisma.chatMessage.create({
        data: {
          organizationId: user.organizationId,
          userId: user.id,
          role: "assistant",
          content: assistantMessage,
        },
      });
    } catch {
      // Chat logging is optional - don't fail the request
      console.warn("[Chat API] Failed to log chat messages");
    }

    return NextResponse.json({
      message: assistantMessage,
      suggestions,
      relatedData,
      actions,
    });
  } catch (error) {
    console.error("[Chat API] Error:", error);

    if (error instanceof Error && error.message.includes("rate limit")) {
      return NextResponse.json(
        { error: "AI service is busy. Please try again in a moment." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: "Failed to process your message. Please try again." },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve conversation history
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user?.organizationId) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);

    const messages = await prisma.chatMessage.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    // Reverse to get chronological order
    const chronological = messages.reverse().map(msg => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.createdAt.toISOString(),
    }));

    return NextResponse.json({ messages: chronological });
  } catch (error) {
    console.error("[Chat API] Error fetching history:", error);
    return NextResponse.json(
      { error: "Failed to load conversation history" },
      { status: 500 }
    );
  }
}
