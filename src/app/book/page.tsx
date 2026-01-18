import { Header, Footer } from "@/components/landing";
import { ArrowLeft, Calendar, Clock, Video } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Book a Call | Simple Growth Solutions",
  description:
    "Schedule a free consultation to discuss your business goals and how we can help you grow online.",
};

export default function BookPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-b from-muted/30 to-background pt-24 pb-16">
        <div className="container mx-auto px-4 md:px-6">
          {/* Back link */}
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>

          <div className="mx-auto max-w-4xl">
            {/* Header */}
            <div className="mb-10 text-center">
              <h1 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
                Book Your Free Consultation
              </h1>
              <p className="text-lg text-muted-foreground">
                Pick a time that works for you. We&apos;ll discuss your business
                goals and create a plan to grow your online presence.
              </p>
            </div>

            {/* Info cards */}
            <div className="mb-10 grid gap-4 sm:grid-cols-3">
              <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">30 Minutes</p>
                  <p className="text-sm text-muted-foreground">Quick & focused</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <Video className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">Video Call</p>
                  <p className="text-sm text-muted-foreground">Via Zoom or Meet</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">100% Free</p>
                  <p className="text-sm text-muted-foreground">No obligation</p>
                </div>
              </div>
            </div>

            {/* Cal.com Embed Placeholder */}
            <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
              {/*
                Replace this placeholder with your Cal.com embed.

                Example using Cal.com inline embed:

                1. Install: npm install @calcom/embed-react
                2. Import: import Cal from "@calcom/embed-react"
                3. Use: <Cal calLink="your-username/30min" />

                Or use the script embed:
                <Script src="https://cal.com/embed.js" />
                <div data-cal-link="your-username/30min" />
              */}
              <div className="flex min-h-[500px] flex-col items-center justify-center p-8 text-center">
                <div className="mb-4 rounded-full bg-primary/10 p-4">
                  <Calendar className="h-10 w-10 text-primary" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">
                  Calendar Coming Soon
                </h3>
                <p className="mb-6 max-w-md text-muted-foreground">
                  We&apos;re setting up our scheduling system. In the meantime,
                  you can reach us directly.
                </p>
                <div className="space-y-3">
                  <a
                    href="mailto:hello@simplegrowthsolutions.com"
                    className="block text-primary hover:underline"
                  >
                    hello@simplegrowthsolutions.com
                  </a>
                  <p className="text-sm text-muted-foreground">
                    We typically respond within 24 hours
                  </p>
                </div>
              </div>
            </div>

            {/* What to expect */}
            <div className="mt-10 rounded-xl border bg-card p-6 md:p-8">
              <h3 className="mb-4 text-lg font-semibold">
                What to Expect on the Call
              </h3>
              <ul className="grid gap-4 sm:grid-cols-2">
                <li className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-full bg-secondary/20 p-1 text-secondary">
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    Discuss your business goals and challenges
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-full bg-secondary/20 p-1 text-secondary">
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    Review your current online presence
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-full bg-secondary/20 p-1 text-secondary">
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    Get actionable recommendations
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-full bg-secondary/20 p-1 text-secondary">
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    Learn about our free website offer
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
