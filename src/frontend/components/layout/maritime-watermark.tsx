"use client";

import React from "react";
import { usePathname } from "next/navigation";

export type WatermarkVariant =
  | "dashboard"
  | "operations"
  | "assets"
  | "optimization"
  | "disruptions"
  | "users"
  | "copilot";

interface MaritimeWatermarkProps {
  variant?: WatermarkVariant;
}

/**
 * Enterprise Global Maritime Watermark Component
 * 
 * Renders the provided authentic maritime/port line-art illustration
 * (container ship, quay crane with lifted container, and harbor waves)
 * as a subtle global background watermark across the entire authenticated portal.
 * 
 * Layering:
 *   1. Page background (#FAFAF8)
 *   2. Soft Sand (#F0EDE4) ambient wash
 *   3. Maritime Watermark Image (4.5% opacity, mix-blend-mode: multiply)
 *   4. Application content (Cards, tables, metrics - z-10)
 *   5. Sticky Header (z-20) & Sidebar (z-30)
 * 
 * Interaction:
 *   - pointer-events: none ensures zero impact on clicks, typing, or scrolling.
 */
export function MaritimeWatermark({ variant }: MaritimeWatermarkProps) {
  const pathname = usePathname();

  // Active section detection for any subtle contextual accents
  const activeVariant: WatermarkVariant =
    variant ||
    (() => {
      if (!pathname || pathname === "/") return "dashboard";
      if (pathname.startsWith("/operations")) return "operations";
      if (
        pathname.startsWith("/vessels") ||
        pathname.startsWith("/berths") ||
        pathname.startsWith("/cranes") ||
        pathname.startsWith("/yards")
      ) {
        return "assets";
      }
      if (pathname.startsWith("/optimization")) return "optimization";
      if (pathname.startsWith("/disruptions")) return "disruptions";
      if (pathname.startsWith("/users")) return "users";
      if (pathname.startsWith("/copilot")) return "copilot";
      return "dashboard";
    })();

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-y-0 right-0 left-0 md:left-60 z-0 overflow-hidden select-none"
    >
      {/* 1. Soft Sand (#F0EDE4) ambient radial wash in the bottom-right quadrant */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 75% 65% at 88% 85%, rgba(240, 237, 228, 0.45) 0%, transparent 75%)",
        }}
      />

      {/* 
        2. Primary Maritime Line-Art Watermark
        The provided cargo ship + STS container crane + wave line-art illustration.
        - Centered and scaled across the main dashboard viewport so it spans behind the KPI cards
        - High visibility: opacity 0.36 (36%) with contrast and saturation boost
        - mix-blend-mode: multiply allows the white background to dissolve completely,
          so the ship, crane, container stacks, and waves clearly show through frosted cards
      */}
      <div
        className="absolute inset-0 flex items-center justify-center p-2 sm:p-6 md:p-10 pointer-events-none select-none transition-opacity duration-300"
        style={{
          opacity: 0.45,
          mixBlendMode: "multiply",
          filter: "contrast(1.3) saturate(1.2)",
        }}
      >
        <img
          src="/maritime-watermark.png"
          alt="NaviOps Maritime Watermark"
          className="w-full max-w-[1250px] max-h-[86vh] object-contain select-none pointer-events-none"
          draggable={false}
        />
      </div>

      {/* 
        3. Subtle Contextual Nautical Coordinate Accents
        Ultra-low opacity (1.8%) fine vector coordinate grid / radar ticks in the far margin
      */}
      <div className="absolute right-6 top-20 text-[#004741] opacity-[0.018] pointer-events-none select-none hidden lg:block">
        <svg width="180" height="120" viewBox="0 0 180 120" fill="none">
          <circle cx="120" cy="40" r="35" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="120" y1="0" x2="120" y2="80" stroke="currentColor" strokeWidth="1" />
          <line x1="80" y1="40" x2="160" y2="40" stroke="currentColor" strokeWidth="1" />
          <text x="120" y="95" textAnchor="middle" fontSize="9" fill="currentColor" letterSpacing="1">
            24°51&apos;N 55°16&apos;E
          </text>
        </svg>
      </div>
    </div>
  );
}
