import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface AIAnalysisResult {
  overallAssessment: string;
  painPoints: PainPoint[];
  missedOpportunities: string[];
  competitorAdvantage: string;
  urgencyStatement: string;
}

export interface PainPoint {
  category: string;
  issue: string;
  impact: string;
  solution: string;
  severity: "critical" | "high" | "medium" | "low";
}

export async function analyzeWithAI(
  url: string,
  html: string,
  basicAnalysis: {
    ssl: { passed: boolean; score: number };
    mobile: { passed: boolean; score: number };
    seo: { passed: boolean; score: number };
    speed: { passed: boolean; score: number; message: string };
  }
): Promise<AIAnalysisResult> {
  // Truncate HTML to avoid token limits (keep first 15000 chars)
  const truncatedHtml = html.slice(0, 15000);

  const prompt = `You are a website analysis expert helping a web development agency identify problems with potential clients' websites. Analyze this website and identify pain points that would convince the business owner they need a new website.

Website URL: ${url}

Basic Analysis Results:
- SSL/Security: ${basicAnalysis.ssl.passed ? "Passed" : "Failed"} (Score: ${basicAnalysis.ssl.score}/100)
- Mobile Friendly: ${basicAnalysis.mobile.passed ? "Passed" : "Failed"} (Score: ${basicAnalysis.mobile.score}/100)
- SEO: ${basicAnalysis.seo.passed ? "Passed" : "Failed"} (Score: ${basicAnalysis.seo.score}/100)
- Page Speed: ${basicAnalysis.speed.message} (Score: ${basicAnalysis.speed.score}/100)

Website HTML (truncated):
${truncatedHtml}

Analyze this website and provide your analysis in the following JSON format:
{
  "overallAssessment": "A 2-3 sentence summary of the website's main issues and how they're hurting the business",
  "painPoints": [
    {
      "category": "Category name (e.g., 'Design', 'Performance', 'SEO', 'Mobile', 'Trust/Credibility', 'Conversion')",
      "issue": "Clear description of the specific problem",
      "impact": "How this hurts their business (lost customers, lower rankings, etc.)",
      "solution": "How a modern website would fix this",
      "severity": "critical|high|medium|low"
    }
  ],
  "missedOpportunities": [
    "List 3-4 specific opportunities they're missing (e.g., 'No online booking', 'No customer reviews displayed', 'No email capture')"
  ],
  "competitorAdvantage": "A statement about how their competitors with modern websites are likely outperforming them",
  "urgencyStatement": "A compelling reason why they should act now (without being pushy)"
}

Focus on issues that would genuinely help the business owner understand why their current website is costing them money or customers. Be specific and actionable. Return ONLY valid JSON, no other text.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type");
    }

    // Parse the JSON response
    const analysis = JSON.parse(content.text) as AIAnalysisResult;
    return analysis;
  } catch {
    // Return a fallback analysis if AI fails
    return generateFallbackAnalysis(basicAnalysis);
  }
}

function generateFallbackAnalysis(basicAnalysis: {
  ssl: { passed: boolean; score: number };
  mobile: { passed: boolean; score: number };
  seo: { passed: boolean; score: number };
  speed: { passed: boolean; score: number };
}): AIAnalysisResult {
  const painPoints: PainPoint[] = [];

  if (!basicAnalysis.ssl.passed) {
    painPoints.push({
      category: "Security",
      issue: "Website lacks SSL security certificate",
      impact: "Visitors see 'Not Secure' warnings, hurting trust and driving customers away",
      solution: "A modern website includes SSL encryption by default, building customer trust",
      severity: "critical",
    });
  }

  if (!basicAnalysis.mobile.passed) {
    painPoints.push({
      category: "Mobile Experience",
      issue: "Website is not optimized for mobile devices",
      impact: "Over 60% of web traffic is mobile - you're losing the majority of potential customers",
      solution: "A responsive design ensures perfect display on all devices",
      severity: "critical",
    });
  }

  if (!basicAnalysis.seo.passed) {
    painPoints.push({
      category: "Search Visibility",
      issue: "Missing critical SEO elements",
      impact: "Your business is invisible in Google searches, giving competitors all the traffic",
      solution: "Proper SEO structure helps you rank higher and get found by customers",
      severity: "high",
    });
  }

  if (!basicAnalysis.speed.passed) {
    painPoints.push({
      category: "Performance",
      issue: "Slow page load times",
      impact: "53% of visitors leave if a page takes more than 3 seconds to load",
      solution: "Optimized code and modern hosting deliver lightning-fast experiences",
      severity: "high",
    });
  }

  return {
    overallAssessment:
      "Your website has several technical issues that are likely costing you customers and search engine visibility. These problems are common with older websites but are easily fixed with a modern rebuild.",
    painPoints,
    missedOpportunities: [
      "No clear call-to-action to convert visitors into leads",
      "Missing customer testimonials or social proof",
      "No email capture to build your customer list",
      "Limited or no integration with modern tools",
    ],
    competitorAdvantage:
      "Businesses in your industry with modern, fast-loading websites are capturing the customers you're missing. Every day without an update means more business going to competitors.",
    urgencyStatement:
      "The longer these issues persist, the more potential customers you lose. A free consultation can show you exactly how to fix these problems.",
  };
}
