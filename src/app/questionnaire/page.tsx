import { Header, Footer } from "@/components/landing";
import { LeadForm } from "@/components/questionnaire/LeadForm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Get Started | Simple Growth Solutions",
  description:
    "Tell us about your business and get a free website or website analysis.",
};

export default function QuestionnairePage() {
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

          <div className="mx-auto max-w-2xl">
            {/* Header */}
            <div className="mb-10 text-center">
              <h1 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
                Let&apos;s Get to Know Your Business
              </h1>
              <p className="text-lg text-muted-foreground">
                Fill out this quick form and we&apos;ll be in touch within 24 hours.
                If you have an existing website, we&apos;ll send you a free analysis
                report.
              </p>
            </div>

            {/* Form Card */}
            <div className="rounded-2xl border bg-card p-6 shadow-sm md:p-8">
              <LeadForm />
            </div>

            {/* Trust indicators */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <svg
                  className="h-5 w-5 text-secondary"
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
                No credit card required
              </div>
              <div className="flex items-center gap-2">
                <svg
                  className="h-5 w-5 text-secondary"
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
                100% free to start
              </div>
              <div className="flex items-center gap-2">
                <svg
                  className="h-5 w-5 text-secondary"
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
                Response within 24h
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
