import Link from "next/link";

// Internal preview chooser — three landing-page directions for SGS.
// Pick one, then we'll replace the production homepage with that direction.
export const metadata = {
  title: "Landing Previews | SGS Internal",
  robots: { index: false, follow: false },
};

const options = [
  {
    href: "/preview/clean",
    name: "Option A — Clean & Modern",
    tagline: "Linear / Stripe vibe",
    swatch: "from-slate-900 to-slate-700",
    description:
      "Tight Inter typography, generous whitespace, pure white with one strong accent. Lets the work speak. Best if SGS wants to feel premium and professional without being loud.",
  },
  {
    href: "/preview/bold",
    name: "Option B — Bold & Design-Forward",
    tagline: "Framer / Webflow vibe",
    swatch: "from-orange-500 to-amber-400",
    description:
      "Editorial type, oversized headlines, vibrant single accent, asymmetric layouts, large device mockups. Best if SGS wants to flex design chops and stand out from every competitor.",
  },
  {
    href: "/preview/trust",
    name: "Option C — Trust-First & Friendly",
    tagline: "Squarespace / Mailchimp vibe",
    swatch: "from-emerald-600 to-teal-500",
    description:
      "Warm cream + sage palette, real-feeling testimonials, before/after audit screenshots, inline pricing, business-owner-friendly copy. Best if SGS wants to feel like the 'friendly local website company.'",
  },
];

export default function PreviewIndex() {
  return (
    <div className="min-h-screen bg-gray-50 py-16 px-6">
      <div className="max-w-5xl mx-auto">
        <p className="text-xs font-semibold tracking-widest text-gray-500 uppercase mb-2">
          Internal · Pick One
        </p>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          Landing-Page Directions
        </h1>
        <p className="text-gray-600 mb-10 max-w-2xl">
          Three full-page mockups. Click through each, then tell me which one to
          ship as the live homepage.
        </p>

        <div className="grid gap-6 md:grid-cols-3">
          {options.map((opt) => (
            <Link
              key={opt.href}
              href={opt.href}
              className="block rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all"
            >
              <div className={`h-32 bg-gradient-to-br ${opt.swatch}`} />
              <div className="p-6">
                <p className="text-xs font-medium text-gray-500 mb-1">{opt.tagline}</p>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">{opt.name}</h2>
                <p className="text-sm text-gray-600">{opt.description}</p>
                <p className="text-sm font-medium text-blue-600 mt-4">
                  View this option →
                </p>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-12 p-6 rounded-xl bg-white border border-gray-200">
          <p className="text-sm text-gray-700">
            <strong>What you&apos;re comparing:</strong> Each option is a full,
            working landing page with hero, &quot;how it works,&quot; portfolio
            of templates, social proof, and call-to-action. They all use the
            same 5 industry templates already defined in the codebase
            (restaurant, professional, retail, automotive, healthcare).
          </p>
        </div>
      </div>
    </div>
  );
}
