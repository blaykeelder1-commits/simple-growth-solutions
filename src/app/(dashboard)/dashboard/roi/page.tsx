"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ROICalculator } from "@/components/dashboard/roi-calculator";
import { Calculator, ChevronRight } from "lucide-react";

export default function ROIDashboardPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link href="/dashboard" className="hover:text-gray-700">
              Dashboard
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span>ROI Calculator</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            Your Value Dashboard
          </h1>
          <p className="text-gray-500 mt-1">
            See how Business Chauffeur could deliver value for your business
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/cashflow">
            <Button
              variant="outline"
              className="bg-white/50 hover:bg-white"
            >
              View Cash Flow
            </Button>
          </Link>
          <Link href="/dashboard/chauffeur/integrations">
            <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25">
              <Calculator className="h-4 w-4 mr-2" />
              Add Integrations
            </Button>
          </Link>
        </div>
      </div>

      {/* ROI Calculator Component */}
      <ROICalculator />
    </div>
  );
}
