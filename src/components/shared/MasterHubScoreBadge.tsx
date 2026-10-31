"use client";

import React from "react";
import { Star, Sparkles } from "lucide-react";

interface MasterHubScoreBadgeProps {
  score: number | null; // 0.0 a 10.0
  totalVotes: number;
  distribution?: number[];
  size?: "sm" | "md" | "lg";
  themeColor?: "amber" | "purple";
  showEmpty?: boolean;
}

export default function MasterHubScoreBadge({
  score,
  totalVotes,
  distribution = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  themeColor = "amber",
  showEmpty = true,
}: MasterHubScoreBadgeProps) {
  const isPurple = themeColor === "purple";

  if (!score || totalVotes === 0) {
    if (!showEmpty) return null;
    return (
      <div
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-cine-900/60 border border-cine-800 text-cine-400 text-xs font-medium"
        title="Sin votos comunitarios aún en Atlas"
      >
        <Sparkles className="w-3.5 h-3.5 text-cine-500" />
        <span>Atlas: Sin votos</span>
      </div>
    );
  }

  const voteLabel = totalVotes === 1 ? "1 voto" : `${totalVotes} votos`;

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-xl border text-xs sm:text-sm font-bold shadow-sm transition-all ${
        isPurple
          ? "bg-purple-950/50 border-purple-500/35 text-purple-300 hover:border-purple-500/60"
          : "bg-amber-500/15 border-amber-500/30 text-amber-400 hover:border-amber-500/50"
      }`}
      title={`Atlas Score: ${score.toFixed(1)} / 10 (${voteLabel})`}
    >
      <div className="flex items-center gap-1 font-semibold tracking-wide">
        <Sparkles
          className={`w-3.5 h-3.5 ${
            isPurple ? "text-purple-400" : "text-amber-400"
          }`}
        />
        <span className="text-[11px] uppercase tracking-wider opacity-90">
          Atlas
        </span>
      </div>

      <div className="flex items-center gap-1 font-mono font-black">
        <Star
          className={`w-3.5 h-3.5 ${
            isPurple
              ? "fill-purple-400 text-purple-400"
              : "fill-amber-400 text-amber-400"
          }`}
        />
        <span>{score.toFixed(1)}</span>
        <span className="text-[11px] font-normal opacity-60">/ 10</span>
      </div>

      <span
        className={`text-[11px] font-normal border-l pl-2 ${
          isPurple
            ? "border-purple-500/30 text-purple-300/80"
            : "border-amber-500/30 text-amber-400/80"
        }`}
      >
        {voteLabel}
      </span>
    </div>
  );
}
