"use client";

import Link from "next/link";
import { Heart } from "lucide-react";

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-gray-200/50 py-12">
      {/* Colorful gradient background */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50" />

      {/* Decorative shapes */}
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-br from-blue-300/20 to-purple-300/20 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-gradient-to-br from-pink-300/20 to-rose-300/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

      <div className="container relative mx-auto px-4 md:px-6">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          {/* Logo/Brand */}
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 text-sm font-bold text-white shadow-lg shadow-purple-500/20">
              SG
            </div>
            <span className="font-bold text-gray-900">Simple <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Growth</span> Solutions</span>
          </div>

          {/* Links */}
          <nav className="flex flex-wrap items-center justify-center gap-6 text-sm">
            <Link href="#services" className="text-gray-600 hover:text-blue-600 transition-colors font-medium">
              Services
            </Link>
            <Link href="#how-it-works" className="text-gray-600 hover:text-purple-600 transition-colors font-medium">
              How It Works
            </Link>
            <Link href="#testimonials" className="text-gray-600 hover:text-pink-600 transition-colors font-medium">
              Testimonials
            </Link>
            <Link href="/questionnaire" className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent font-semibold hover:from-blue-700 hover:to-purple-700 transition-colors">
              Get Started
            </Link>
          </nav>

          {/* Copyright */}
          <p className="flex items-center gap-1.5 text-sm text-gray-500">
            Made with <Heart className="h-4 w-4 text-red-500 fill-red-500 animate-pulse" /> © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </footer>
  );
}
