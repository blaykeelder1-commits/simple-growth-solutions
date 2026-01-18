"use client";

import { Star, Quote } from "lucide-react";
import { ScrollAnimation } from "@/components/ui/scroll-animation";

const testimonials = [
  {
    name: "Sarah Mitchell",
    role: "Owner, Mitchell's Bakery",
    content:
      "I was skeptical about the 'free' part, but they delivered exactly what they promised. My new website looks amazing and I only started paying when I was ready to go live.",
    rating: 5,
    gradient: "from-pink-500 to-rose-500",
    bgGradient: "from-pink-50 to-rose-50",
  },
  {
    name: "Brandon",
    role: "Owner, Brandon's Remodeling",
    content:
      "Simple Growth Solutions helped me transform my remodeling business online. They understood exactly what I needed and we were able to start today. Highly recommend!",
    rating: 5,
    gradient: "from-blue-500 to-cyan-500",
    bgGradient: "from-blue-50 to-cyan-50",
  },
  {
    name: "Emily Chen",
    role: "CEO, Chen Consulting",
    content:
      "Professional, responsive, and genuinely helpful. They didn't just build a website—they helped me think through my entire online strategy.",
    rating: 5,
    gradient: "from-purple-500 to-indigo-500",
    bgGradient: "from-purple-50 to-indigo-50",
  },
];

export function Testimonials() {
  return (
    <section id="testimonials" className="relative py-20 md:py-28 overflow-hidden">
      {/* Colorful gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-rose-50 to-purple-50" />

      {/* Decorative shapes */}
      <div className="absolute top-20 right-10 w-64 h-64 bg-gradient-to-br from-yellow-400/20 to-orange-400/20 rounded-full blur-3xl" />
      <div className="absolute bottom-20 left-10 w-80 h-80 bg-gradient-to-br from-pink-400/20 to-rose-400/20 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 w-72 h-72 bg-gradient-to-br from-purple-400/15 to-indigo-400/15 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />

      <div className="container relative mx-auto px-4 md:px-6">
        {/* Section header */}
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <ScrollAnimation animation="fade-scale">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/80 backdrop-blur-sm border border-orange-200 px-4 py-1.5 text-sm font-medium text-orange-700 shadow-lg shadow-orange-500/10">
              <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
              Client Success Stories
            </div>
          </ScrollAnimation>
          <ScrollAnimation animation="fade-up" delay={100}>
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl bg-gradient-to-r from-gray-900 via-orange-800 to-rose-800 bg-clip-text text-transparent">
              Trusted by Growing Businesses
            </h2>
          </ScrollAnimation>
          <ScrollAnimation animation="fade-up" delay={200}>
            <p className="text-lg text-gray-600">
              Don&apos;t just take our word for it. Here&apos;s what our clients have to say
              about working with us.
            </p>
          </ScrollAnimation>
        </div>

        {/* Testimonials grid */}
        <div className="grid gap-8 md:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <ScrollAnimation key={testimonial.name} animation="fade-up" delay={index * 150}>
              <div
                className={`group relative flex flex-col rounded-2xl border-2 border-white/60 bg-white/80 backdrop-blur-sm p-6 shadow-xl shadow-rose-500/5 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-rose-500/10 card-animate digital-hover`}
              >
                {/* Gradient background for each card */}
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${testimonial.bgGradient} opacity-60`} />

                {/* Quote icon */}
                <div className={`absolute -top-4 right-6 rounded-full bg-gradient-to-br ${testimonial.gradient} p-2.5 shadow-lg shadow-rose-500/20`}>
                  <Quote className="h-5 w-5 text-white" />
                </div>

                <div className="relative">
                  {/* Stars */}
                  <div className="mb-4 flex gap-1">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <Star
                        key={i}
                        className="h-5 w-5 fill-yellow-400 text-yellow-400 drop-shadow-md"
                      />
                    ))}
                  </div>

                  {/* Quote */}
                  <p className="mb-6 flex-1 text-gray-700 italic leading-relaxed">
                    &ldquo;{testimonial.content}&rdquo;
                  </p>

                  {/* Author */}
                  <div className="flex items-center gap-3">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br ${testimonial.gradient} text-sm font-bold text-white shadow-lg`}>
                      {testimonial.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{testimonial.name}</p>
                      <p className="text-sm text-gray-600">
                        {testimonial.role}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollAnimation>
          ))}
        </div>
      </div>
    </section>
  );
}
