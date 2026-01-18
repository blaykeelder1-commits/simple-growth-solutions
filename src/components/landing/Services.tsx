"use client";

import { Globe, Zap, Bot, TrendingUp, Search, Cog } from "lucide-react";
import { ScrollAnimation } from "@/components/ui/scroll-animation";

const services = [
  {
    icon: Globe,
    title: "Site Visibility",
    description:
      "Get found online with SEO-optimized websites that rank higher in search results and attract more customers.",
    gradient: "from-blue-500 to-cyan-400",
    bgGradient: "from-blue-50 to-cyan-50",
    borderColor: "hover:border-blue-300",
    iconBg: "bg-blue-100 text-blue-600 group-hover:bg-blue-500",
  },
  {
    icon: Zap,
    title: "Business Automation",
    description:
      "Streamline your operations with smart automation that saves time on repetitive tasks and reduces errors.",
    gradient: "from-yellow-500 to-orange-400",
    bgGradient: "from-yellow-50 to-orange-50",
    borderColor: "hover:border-orange-300",
    iconBg: "bg-orange-100 text-orange-600 group-hover:bg-orange-500",
  },
  {
    icon: Bot,
    title: "AI Implementation",
    description:
      "Leverage cutting-edge AI tools to enhance customer service, analyze data, and make smarter decisions.",
    gradient: "from-purple-500 to-pink-400",
    bgGradient: "from-purple-50 to-pink-50",
    borderColor: "hover:border-purple-300",
    iconBg: "bg-purple-100 text-purple-600 group-hover:bg-purple-500",
  },
  {
    icon: Search,
    title: "Website Analysis",
    description:
      "Get a comprehensive report on your current website's performance, speed, and areas for improvement.",
    gradient: "from-emerald-500 to-teal-400",
    bgGradient: "from-emerald-50 to-teal-50",
    borderColor: "hover:border-emerald-300",
    iconBg: "bg-emerald-100 text-emerald-600 group-hover:bg-emerald-500",
  },
  {
    icon: TrendingUp,
    title: "Growth Strategy",
    description:
      "Develop a tailored roadmap to scale your business with modern digital tools and proven tactics.",
    gradient: "from-rose-500 to-red-400",
    bgGradient: "from-rose-50 to-red-50",
    borderColor: "hover:border-rose-300",
    iconBg: "bg-rose-100 text-rose-600 group-hover:bg-rose-500",
  },
  {
    icon: Cog,
    title: "Technical Support",
    description:
      "Ongoing maintenance and support to keep your digital presence running smoothly around the clock.",
    gradient: "from-indigo-500 to-blue-400",
    bgGradient: "from-indigo-50 to-blue-50",
    borderColor: "hover:border-indigo-300",
    iconBg: "bg-indigo-100 text-indigo-600 group-hover:bg-indigo-500",
  },
];

export function Services() {
  return (
    <section id="services" className="relative py-20 md:py-28 overflow-hidden">
      {/* Colorful gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50" />

      {/* Decorative shapes */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-gradient-to-br from-blue-400/20 to-cyan-400/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute top-1/2 right-0 w-96 h-96 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl translate-x-1/2" />
      <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-gradient-to-br from-emerald-400/15 to-teal-400/15 rounded-full blur-3xl translate-y-1/2" />

      <div className="container relative mx-auto px-4 md:px-6">
        {/* Section header */}
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <ScrollAnimation animation="fade-scale">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/80 backdrop-blur-sm border border-purple-200 px-4 py-1.5 text-sm font-medium text-purple-700 shadow-lg shadow-purple-500/10">
              Our Services
            </div>
          </ScrollAnimation>
          <ScrollAnimation animation="fade-up" delay={100}>
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent">
              Everything You Need to Grow Online
            </h2>
          </ScrollAnimation>
          <ScrollAnimation animation="fade-up" delay={200}>
            <p className="text-lg text-gray-600">
              From building your website to automating your business, we provide
              complete digital solutions tailored to your needs.
            </p>
          </ScrollAnimation>
        </div>

        {/* Services grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service, index) => (
            <ScrollAnimation key={service.title} animation="fade-up" delay={index * 100}>
              <div
                className={`group relative rounded-2xl border-2 border-white/50 bg-white/70 backdrop-blur-sm p-6 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-purple-500/10 hover:bg-white card-animate digital-hover ${service.borderColor}`}
              >
                {/* Gradient overlay on hover */}
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${service.bgGradient} opacity-50 transition-opacity duration-300 group-hover:opacity-70`} />

                <div className="relative">
                  <div className={`mb-4 inline-flex rounded-xl p-3 transition-all duration-300 ${service.iconBg} group-hover:text-white group-hover:shadow-lg group-hover:scale-110`}>
                    <service.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mb-2 text-xl font-semibold text-gray-900">{service.title}</h3>
                  <p className="text-gray-600">{service.description}</p>
                </div>
              </div>
            </ScrollAnimation>
          ))}
        </div>
      </div>
    </section>
  );
}
