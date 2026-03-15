"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { ExternalLink, RefreshCw, Wifi, WifiOff, Database, Clock, Zap, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlowingEffect } from "@/components/ui/glowing-effect";

interface Kernel {
  rank: number;
  name: string;
  problem: string;
  score: number;
  author: string;
  hardware: string;
  language: string;
  tag: string;
  speedup_vs_baseline: number;
  fresh: boolean;
  submitted_at: string;
  source: string;
}

interface LeaderboardData {
  source: string[];
  is_live: boolean;
  polled_at: string;
  poll_interval_s: number;
  kernels: Kernel[];
  hf_leaderboards: Record<string, unknown>[] | null;
  total_submissions_in_dataset: number;
  available_problems: string[];
}

const TAG_STYLE: Record<string, string> = {
  fp4:    "text-violet-400 bg-violet-400/10 border-violet-400/20",
  fp8:    "text-pink-400 bg-pink-400/10 border-pink-400/20",
  attn:   "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
  moe:    "text-amber-400 bg-amber-400/10 border-amber-400/20",
  scan:   "text-green-400 bg-green-400/10 border-green-400/20",
  fusion: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  gemm:   "text-orange-400 bg-orange-400/10 border-orange-400/20",
  optim:  "text-teal-400 bg-teal-400/10 border-teal-400/20",
  comm:   "text-red-400 bg-red-400/10 border-red-400/20",
  cuda:   "text-amber-400 bg-amber-400/10 border-amber-400/20",
  triton: "text-purple-400 bg-purple-400/10 border-purple-400/20",
  hip:    "text-orange-400 bg-orange-400/10 border-orange-400/20",
  python: "text-green-400 bg-green-400/10 border-green-400/20",
};

const SOURCE_LABEL: Record<string, { label: string; color: string }> = {
  "hf:amd_successful_submissions": { label: "HuggingFace · AMD",    color: "text-orange-400" },
  "hf:nvidia_nvfp4":               { label: "HuggingFace · NVIDIA", color: "text-green-400"  },
  "hf:leaderboards":               { label: "HuggingFace · LB",     color: "text-blue-400"   },
  "seed:static":                   { label: "Cached data",          color: "text-slate-500"  },
};

function sourceLabel(src: string) {
  for (const [k, v] of Object.entries(SOURCE_LABEL)) {
    if (src.includes(k.replace("hf:", "").replace("seed:", ""))) return v;
  }
  if (src.startsWith("gpumode:")) return { label: "gpumode.com live", color: "text-cyan-400" };
  return { label: src, color: "text-slate-500" };
}

export function KernelFeed({
  onKernelSelect,
  selectedIdx,
}: {
  onKernelSelect: (idx: number, speedup: number) => void;
  selectedIdx: number;
}) {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastPoll, setLastPoll] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(300);
  const [newEntries, setNewEntries] = useState<number[]>([]);
  const [selectedProblem, setSelectedProblem] = useState("all");
  const prevKernels = useRef<Kernel[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const poll = useCallback(async (problem = selectedProblem) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/leaderboard?problem=${problem}&t=${Date.now()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d: LeaderboardData = await res.json();

      // Detect new entries vs previous poll
      if (prevKernels.current.length > 0) {
        const prev = new Set(prevKernels.current.map(k => k.name + k.author));
        const newIdx = d.kernels
          .map((k, i) => ({ k, i }))
          .filter(({ k }) => !prev.has(k.name + k.author))
          .map(({ i }) => i);
        if (newIdx.length > 0) setNewEntries(newIdx);
      }
      prevKernels.current = d.kernels;
      setData(d);
      setLastPoll(new Date());
      setCountdown(d.poll_interval_s);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch");
    } finally {
      setLoading(false);
    }
  }, [selectedProblem]);

  // Initial poll
  useEffect(() => { poll(); }, [poll]);

  // Auto-poll every 5 min
  useEffect(() => {
    timerRef.current = setInterval(() => poll(), 300_000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [poll]);

  // Countdown ticker
  useEffect(() => {
    const t = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [lastPoll]);

  // Clear new-entry highlights after 8s
  useEffect(() => {
    if (newEntries.length > 0) {
      const t = setTimeout(() => setNewEntries([]), 8000);
      return () => clearTimeout(t);
    }
  }, [newEntries]);

  const handleProblemChange = (p: string) => {
    setSelectedProblem(p);
    poll(p);
  };

  return (
    <div className="relative rounded-2xl border border-white/[0.07] p-[2px]">
      <GlowingEffect spread={35} glow disabled={false} proximity={80} inactiveZone={0.01} borderWidth={2} />
      <div className="relative rounded-[calc(1rem-2px)] bg-[#060d1a]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-white/[0.05]">
          <div className="flex items-center gap-2.5">
            <Zap className="w-4 h-4 text-violet-400 flex-shrink-0" />
            <div>
              <div className="text-xs font-bold text-white">GPU MODE · Live Kernel Feed</div>
              <div className="text-[9px] text-slate-600 mt-0.5 flex items-center gap-1.5">
                {data?.is_live
                  ? <><Wifi className="w-2.5 h-2.5 text-green-400" /><span className="text-green-400">Live from HuggingFace</span></>
                  : <><WifiOff className="w-2.5 h-2.5 text-slate-500" /><span>Using cached data</span></>}
                <span>·</span>
                <Database className="w-2.5 h-2.5" />
                <span>{(data?.total_submissions_in_dataset || 401380).toLocaleString()} total submissions</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Countdown */}
            <div className="flex items-center gap-1 text-[9px] text-slate-600 bg-white/[0.03] rounded-full px-2 py-1">
              <Clock className="w-2.5 h-2.5" />
              <span>poll in {countdown}s</span>
            </div>
            <button onClick={() => poll()}
              className={cn("w-6 h-6 rounded-lg bg-white/[0.04] border border-white/[0.07] flex items-center justify-center transition-all hover:border-cyan-400/40",
                loading && "animate-spin")}>
              <RefreshCw className="w-3 h-3 text-slate-400" />
            </button>
            <a href="https://huggingface.co/datasets/GPUMODE/kernelbot-data" target="_blank" rel="noopener noreferrer"
              className="w-6 h-6 rounded-lg bg-white/[0.04] border border-white/[0.07] flex items-center justify-center hover:border-cyan-400/40 transition-all">
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
          </div>
        </div>

        {/* Source pills */}
        {data && (
          <div className="flex flex-wrap gap-1.5 px-5 py-2.5 border-b border-white/[0.04]">
            {data.source.map(s => {
              const { label, color } = sourceLabel(s);
              return (
                <span key={s} className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.07]", color)}>
                  {label}
                </span>
              );
            })}
            {lastPoll && (
              <span className="text-[9px] text-slate-600 px-2 py-0.5">
                Updated {lastPoll.toLocaleTimeString()}
              </span>
            )}
            {newEntries.length > 0 && (
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-green-400/15 border border-green-400/25 text-green-400 animate-pulse">
                {newEntries.length} new kernel{newEntries.length > 1 ? "s" : ""} detected!
              </span>
            )}
          </div>
        )}

        {/* Problem filter */}
        {data?.available_problems && (
          <div className="flex gap-1.5 px-5 py-2.5 overflow-x-auto border-b border-white/[0.04]">
            <button onClick={() => handleProblemChange("all")}
              className={cn("text-[9px] font-bold px-2.5 py-1 rounded-full border whitespace-nowrap transition-all",
                selectedProblem === "all" ? "bg-cyan-400/10 border-cyan-400/30 text-cyan-400" : "bg-white/[0.03] border-white/[0.06] text-slate-500 hover:border-white/[0.12]")}>
              All problems
            </button>
            {data.available_problems.map(p => (
              <button key={p} onClick={() => handleProblemChange(p)}
                className={cn("text-[9px] font-bold px-2.5 py-1 rounded-full border whitespace-nowrap transition-all",
                  selectedProblem === p ? "bg-cyan-400/10 border-cyan-400/30 text-cyan-400" : "bg-white/[0.03] border-white/[0.06] text-slate-500 hover:border-white/[0.12]")}>
                {p}
              </button>
            ))}
          </div>
        )}

        {/* Kernel list */}
        <div className="p-3 space-y-1.5 max-h-[520px] overflow-y-auto">
          {loading && !data && (
            <div className="flex items-center justify-center py-8 gap-2 text-xs text-slate-500">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Fetching from HuggingFace GPUMODE/kernelbot-data...
            </div>
          )}
          {error && (
            <div className="text-[11px] text-red-400 bg-red-400/5 border border-red-400/20 rounded-lg px-4 py-3">
              ⚠ {error} — showing cached data
            </div>
          )}
          {data?.kernels.map((k, i) => {
            const isNew = newEntries.includes(i);
            const isSel = i === selectedIdx;
            const srcInfo = sourceLabel(k.source);
            return (
              <div key={`${k.name}-${k.author}-${i}`}
                className={cn(
                  "relative rounded-xl border p-[1px] cursor-pointer transition-all",
                  isNew  ? "border-green-400/50 animate-pulse" :
                  isSel  ? "border-cyan-400/40" :
                           "border-white/[0.04] hover:border-white/[0.1]"
                )}
                onClick={() => onKernelSelect(i, k.speedup_vs_baseline || 1)}>
                {isNew && <GlowingEffect spread={15} glow disabled={false} proximity={30} inactiveZone={0.01} borderWidth={1} />}
                <div className={cn("relative flex items-center gap-3 rounded-[calc(0.75rem-1px)] px-3 py-2.5",
                  isNew ? "bg-green-400/5" : "bg-[#060d1a]")}>

                  {/* Rank */}
                  <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0",
                    isSel ? "bg-cyan-400/20 text-cyan-400" : isNew ? "bg-green-400/20 text-green-400" : "bg-white/[0.04] text-slate-500")}>
                    {k.rank}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-white truncate">{k.name}</span>
                      {isNew && <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-green-400/15 border border-green-400/25 text-green-400 flex-shrink-0">NEW</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] text-slate-600">{k.author}</span>
                      <span className="text-[9px] text-slate-700">·</span>
                      <span className="text-[9px] text-slate-600">{k.hardware}</span>
                      <span className="text-[9px] text-slate-700">·</span>
                      <span className={cn("text-[9px]", srcInfo.color)}>{srcInfo.label}</span>
                    </div>
                  </div>

                  {/* Right metrics */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded border", TAG_STYLE[k.tag] || TAG_STYLE.cuda)}>
                      {k.tag}
                    </span>
                    <div className="text-right">
                      <div className="text-sm font-bold text-green-400 font-mono">{k.speedup_vs_baseline > 0 ? `${k.speedup_vs_baseline.toFixed(1)}×` : "—"}</div>
                      <div className="text-[8px] text-slate-600">{k.submitted_at}</div>
                    </div>
                    <ChevronRight className="w-3 h-3 text-slate-700" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/[0.04] flex items-center justify-between">
          <div className="text-[9px] text-slate-700">
            Polls HuggingFace every 5 min · Falls back to gpumode.com scrape · Then cached seed
          </div>
          <a href="https://gpumode.com/leaderboard" target="_blank" rel="noopener noreferrer"
            className="text-[9px] text-slate-600 hover:text-slate-400 flex items-center gap-1 transition-colors">
            gpumode.com <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>

      </div>
    </div>
  );
}
