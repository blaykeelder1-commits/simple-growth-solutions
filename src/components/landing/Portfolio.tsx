"use client";

import { ArrowUpRight } from "lucide-react";
import { ScrollAnimation } from "@/components/ui/scroll-animation";

// Real, live sites we've built. To upgrade a card with a real screenshot, drop
// an image at /public/portfolio/<image> and set `image` below — the card swaps
// the brand panel for the screenshot automatically.
interface Work {
  name: string;
  url: string;
  domain: string;
  category: string;
  blurb: string;
  headline: string; // shown in the brand preview panel
  /** Tailwind gradient for the preview panel (approximates the site's brand). */
  gradient: string;
  /** Optional real screenshot at /portfolio/<file>. */
  image?: string;
}

const works: Work[] = [
  {
    name: "Waste Rescue KC",
    url: "https://wasterescuekc.com",
    domain: "wasterescuekc.com",
    category: "Service Business",
    blurb:
      "Dumpster rental serving the Kansas City metro. Bold, high-contrast design with 2-minute online booking.",
    headline: "Rent it. Fill it. We haul it.",
    gradient: "from-orange-500 via-orange-600 to-stone-800",
    image: "wasterescuekc.jpg",
  },
  {
    name: "RG 158 Venue",
    url: "https://rg158-venue.pages.dev",
    domain: "rg158-venue.pages.dev",
    category: "Entertainment Venue",
    blurb:
      "Live-music and event venue with online event listings and a built-in booking request flow.",
    headline: "Live music. Good times.",
    gradient: "from-violet-600 via-purple-700 to-indigo-900",
    image: "rg158-venue.jpg",
  },
  {
    name: "Tiny Home Wellness Resort",
    url: "https://tiny-home-wellness-resort.pages.dev",
    domain: "tiny-home-wellness-resort.pages.dev",
    category: "Hospitality",
    blurb:
      "A calm, premium resort brand — cedar-and-steel aesthetic built to convert browsers into bookings.",
    headline: "Rest. Reset. Restore.",
    gradient: "from-emerald-600 via-teal-700 to-slate-800",
    image: "tiny-home-wellness-resort.jpg",
  },
  {
    name: "IDDI",
    url: "https://iddisolutions.net",
    domain: "iddisolutions.net",
    category: "Software Product",
    blurb:
      "A polished SaaS marketing site for a vending-operator profit app — proof we scale from local shops to software.",
    headline: "Smarter vending. More profit.",
    gradient: "from-blue-600 via-indigo-700 to-slate-900",
    image: "iddisolutions.jpg",
  },
];

export function Portfolio() {
  return (
    <section
      id="work"
      className="relative py-20 md:py-28 bg-white overflow-hidden"
    >
      <div className="absolute inset-0">
        <div className="absolute -top-24 right-0 h-96 w-96 rounded-full bg-gradient-to-br from-blue-100/60 to-cyan-100/60 blur-3xl" />
        <div className="absolute bottom-0 -left-24 h-96 w-96 rounded-full bg-gradient-to-br from-purple-100/60 to-pink-100/60 blur-3xl" />
      </div>

      <div className="container relative mx-auto px-4 md:px-6">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <ScrollAnimation animation="fade-scale">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-100 to-purple-100 px-4 py-1.5 text-sm font-medium text-purple-700">
              Real Work
            </div>
          </ScrollAnimation>
          <ScrollAnimation animation="fade-up" delay={100}>
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl bg-gradient-to-r from-gray-900 via-purple-800 to-blue-800 bg-clip-text text-transparent">
              Sites We&apos;ve Built
            </h2>
          </ScrollAnimation>
          <ScrollAnimation animation="fade-up" delay={200}>
            <p className="text-lg text-gray-600">
              From local service businesses to full software products — every one
              live, fast, and built to bring in customers. Click any to see it real.
            </p>
          </ScrollAnimation>
        </div>

        <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-2">
          {works.map((w, index) => (
            <ScrollAnimation key={w.name} animation="fade-up" delay={index * 120}>
              <a
                href={w.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group block h-full overflow-hidden rounded-2xl border-2 border-gray-100 bg-white shadow-lg transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl"
              >
                {/* Browser chrome */}
                <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-4 py-2.5">
                  <span className="h-3 w-3 rounded-full bg-red-400" />
                  <span className="h-3 w-3 rounded-full bg-amber-400" />
                  <span className="h-3 w-3 rounded-full bg-emerald-400" />
                  <span className="ml-3 truncate rounded-md bg-white px-3 py-1 text-xs text-gray-500 ring-1 ring-gray-200">
                    {w.domain}
                  </span>
                </div>

                {/* Preview panel — screenshot if provided, else brand panel */}
                {w.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/portfolio/${w.image}`}
                    alt={`${w.name} website`}
                    loading="lazy"
                    decoding="async"
                    className="aspect-[16/10] w-full object-cover object-top"
                  />
                ) : (
                  <div
                    className={`relative flex aspect-[16/10] items-center justify-center bg-gradient-to-br ${w.gradient} p-8`}
                  >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_55%)]" />
                    <p className="relative text-center text-2xl font-bold leading-tight text-white drop-shadow md:text-3xl">
                      {w.headline}
                    </p>
                  </div>
                )}

                {/* Meta */}
                <div className="p-6">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                      {w.category}
                    </span>
                    <span className="inline-flex items-center text-sm font-medium text-blue-600 opacity-0 transition-opacity group-hover:opacity-100">
                      Visit live site
                      <ArrowUpRight className="ml-1 h-4 w-4" />
                    </span>
                  </div>
                  <h3 className="mb-1 text-xl font-semibold text-gray-900">{w.name}</h3>
                  <p className="text-sm text-gray-600">{w.blurb}</p>
                </div>
              </a>
            </ScrollAnimation>
          ))}
        </div>

        <ScrollAnimation animation="fade-up" delay={200}>
          <p className="mt-12 text-center text-gray-500">
            Yours could be next — and the build is{" "}
            <span className="font-semibold text-gray-900">free</span>.
          </p>
        </ScrollAnimation>
      </div>
    </section>
  );
}
