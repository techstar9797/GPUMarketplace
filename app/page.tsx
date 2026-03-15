"use client";

import { useState, useMemo } from "react";
import {
  Zap, Search, ExternalLink, Activity, DollarSign,
  Server, Sparkles, BarChart3, Shield, TrendingDown
} from "lucide-react";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { cn } from "@/lib/utils";

const GPU_DATA = [
  { provider: "CoreWeave",    color: "#6366f1", gpu: "H100 SXM5 80GB",            vram: 80, tflops: 989, od: 4.25, spot: null,  region: "US East",    tier: "flagship", badge: null },
  { provider: "CoreWeave",    color: "#6366f1", gpu: "A100 80GB PCIe",              vram: 80, tflops: 312, od: 2.06, spot: null,  region: "US East",    tier: "standard", badge: null },
  { provider: "CoreWeave",    color: "#6366f1", gpu: "A40 48GB",                    vram: 48, tflops: 149, od: 1.28, spot: null,  region: "US East",    tier: "value",    badge: null },
  { provider: "Lambda Labs",  color: "#ec4899", gpu: "H100 SXM5 80GB",            vram: 80, tflops: 989, od: 3.29, spot: null,  region: "US West",    tier: "flagship", badge: "Best H100 value" },
  { provider: "Lambda Labs",  color: "#ec4899", gpu: "H100 PCIe 80GB",             vram: 80, tflops: 756, od: 2.49, spot: null,  region: "US West",    tier: "standard", badge: null },
  { provider: "Lambda Labs",  color: "#ec4899", gpu: "A100 SXM4 80GB",             vram: 80, tflops: 312, od: 1.99, spot: null,  region: "US West",    tier: "standard", badge: null },
  { provider: "Lambda Labs",  color: "#ec4899", gpu: "A10 24GB",                    vram: 24, tflops: 125, od: 0.60, spot: null,  region: "US West",    tier: "value",    badge: null },
  { provider: "Nebius",       color: "#10b981", gpu: "H100 SXM5 80GB",            vram: 80, tflops: 989, od: 2.95, spot: null,  region: "EU West",    tier: "flagship", badge: "Cheapest H100" },
  { provider: "Nebius",       color: "#10b981", gpu: "H100 NVL 94GB",              vram: 94, tflops: 756, od: 3.20, spot: null,  region: "EU West",    tier: "flagship", badge: null },
  { provider: "Nebius",       color: "#10b981", gpu: "A100 80GB",                   vram: 80, tflops: 312, od: 1.85, spot: null,  region: "EU West",    tier: "standard", badge: null },
  { provider: "AWS",          color: "#f59e0b", gpu: "H100 SXM5 × 1 (p5)",       vram: 80, tflops: 989, od: 12.29, spot: 3.69, region: "us-east-1",  tier: "flagship", badge: null },
  { provider: "AWS",          color: "#f59e0b", gpu: "A100 40GB × 1 (p4d)",      vram: 40, tflops: 312, od: 4.10,  spot: 1.23, region: "us-east-1",  tier: "standard", badge: null },
  { provider: "AWS",          color: "#f59e0b", gpu: "L40S 48GB (g6e)",            vram: 48, tflops: 362, od: 2.22,  spot: 0.67, region: "us-east-1",  tier: "value",    badge: null },
  { provider: "AWS",          color: "#f59e0b", gpu: "L4 24GB (g6)",               vram: 24, tflops: 242, od: 0.80,  spot: 0.24, region: "us-east-1",  tier: "value",    badge: "Cheapest spot" },
  { provider: "Google Cloud", color: "#3b82f6", gpu: "H100 80GB × 1 (a3-high)", vram: 80, tflops: 989, od: 14.63, spot: 4.39, region: "us-central1", tier: "flagship", badge: null },
  { provider: "Google Cloud", color: "#3b82f6", gpu: "A100 80GB (a2-ultra)",       vram: 80, tflops: 312, od: 5.70,  spot: 1.71, region: "us-central1", tier: "standard", badge: null },
  { provider: "Google Cloud", color: "#3b82f6", gpu: "L4 24GB (g2-std-4)",         vram: 24, tflops: 242, od: 0.70,  spot: 0.21, region: "us-central1", tier: "value",    badge: null },
  { provider: "Azure",        color: "#8b5cf6", gpu: "H100 SXM × 1 (NDH100v5)", vram: 80, tflops: 989, od: 13.40, spot: 4.02, region: "East US",    tier: "flagship", badge: null },
  { provider: "Azure",        color: "#8b5cf6", gpu: "A100 80GB × 1 (NDasrA100)", vram: 80, tflops: 312, od: 4.10,  spot: 1.23, region: "East US",    tier: "standard", badge: null },
  { provider: "Azure",        color: "#8b5cf6", gpu: "L40S 48GB (NC80adis)",       vram: 48, tflops: 362, od: 3.40,  spot: 1.02, region: "East US",    tier: "value",    badge: null },
];

const KERNELS = [
  { rank: 1, name: "FlashAttention-3",     type: "Attention / Prefill", speedup: 4.2, tag: "triton" },
  { rank: 2, name: "cuda.compute Sort",    type: "Radix Sort",          speedup: 3.8, tag: "python" },
  { rank: 3, name: "FP8 GEMM (MI300)",    type: "MatMul / GEMM",       speedup: 3.1, tag: "cuda"   },
  { rank: 4, name: "Fused LayerNorm+ReLU",type: "Normalization",        speedup: 2.9, tag: "triton" },
  { rank: 5, name: "Fused AdamW BF16",    type: "Optimizer Step",       speedup: 1.9, tag: "triton" },
];

const PROVIDERS = ["All","CoreWeave","Lambda Labs","Nebius","AWS","Google Cloud","Azure"];
const TIERS = ["All","flagship","standard","value"];

function initials(p: string) {
  return p === "AWS" ? "AWS" : p === "Google Cloud" ? "GCP" : p === "Azure" ? "AZ" :
    p === "CoreWeave" ? "CW" : p === "Lambda Labs" ? "LL" : "NB";
}

const TAG_STYLE: Record<string,string> = {
  triton: "text-purple-400 bg-purple-400/10 border-purple-400/20",
  python: "text-green-400 bg-green-400/10 border-green-400/20",
  cuda:   "text-amber-400 bg-amber-400/10 border-amber-400/20",
};

export default function Page() {
  const [fprov, setFprov] = useState("All");
  const [ftier, setFtier] = useState("All");
  const [sort, setSort] = useState<"od"|"spot"|"tflops"|"vram">("od");
  const [q, setQ] = useState("");
  const [selGpu, setSelGpu] = useState<number|null>(null);
  const [selKernel, setSelKernel] = useState(0);
  const [budget, setBudget] = useState(5000);

  const kernel = KERNELS[selKernel];
  const SKY = 3.8;
  const total = SKY * kernel.speedup;

  const list = useMemo(() => GPU_DATA.filter(g =>
    (fprov === "All" || g.provider === fprov) &&
    (ftier === "All" || g.tier === ftier) &&
    (!q || g.gpu.toLowerCase().includes(q.toLowerCase()) || g.provider.toLowerCase().includes(q.toLowerCase()))
  ).sort((a,b) => {
    if (sort === "spot") return (a.spot ?? a.od) - (b.spot ?? b.od);
    if (sort === "tflops") return b.tflops - a.tflops;
    if (sort === "vram") return b.vram - a.vram;
    return a.od - b.od;
  }), [fprov, ftier, sort, q]);

  const optimized = budget / total;
  const saved = budget - optimized;

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 selection:bg-cyan-400/20">
      {/* ambient */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/3 w-[700px] h-[500px] rounded-full bg-cyan-500/[0.03] blur-[140px]" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[500px] rounded-full bg-violet-500/[0.04] blur-[140px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff06_1px,transparent_1px),linear-gradient(to_bottom,#ffffff06_1px,transparent_1px)] bg-[size:48px_48px]" />
      </div>

      <div className="relative z-10 max-w-[1320px] mx-auto px-5 py-8 space-y-8">

        {/* HEADER */}
        <header className="flex items-start justify-between flex-wrap gap-6">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-violet-600 flex items-center justify-center flex-shrink-0">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-white tracking-tight">KernelWatch</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/25">GTC26</span>
                </div>
                <p className="text-xs text-slate-500">GPU Cost Intelligence · SkyPilot × GPU MODE</p>
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white leading-snug tracking-tight max-w-xl">
              Find the cheapest GPU.<br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-400">
                Then make it faster.
              </span>
            </h1>
            <p className="text-slate-400 text-sm mt-3 max-w-lg leading-relaxed">
              Live GPU compute prices across 6 providers. Apply the best GPU MODE kernel.
              SkyPilot spot pricing × kernel speedup = compounding savings.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {[
              { dot:"bg-green-400", text:"Live pricing · Mar 2026" },
              { dot:"bg-cyan-400",  text:"GPU MODE leaderboard synced" },
              { dot:"bg-violet-400",text:"SkyPilot spot data" },
            ].map(p => (
              <div key={p.text} className="flex items-center gap-2 text-xs text-slate-400 bg-white/[0.03] border border-white/[0.06] rounded-full px-3 py-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${p.dot} animate-pulse`} />
                {p.text}
              </div>
            ))}
          </div>
        </header>

        {/* STAT STRIP */}
        <ul className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: <DollarSign className="w-4 h-4"/>, label:"Cheapest H100/hr", val:"$2.95", sub:"Nebius EU West", color:"text-green-400" },
            { icon: <Zap className="w-4 h-4"/>, label:"Top kernel speedup", val:"4.2×", sub:"FlashAttention-3", color:"text-cyan-400" },
            { icon: <TrendingDown className="w-4 h-4"/>, label:"Max combined saving", val:"÷15.9×", sub:"vs on-demand baseline", color:"text-violet-400" },
            { icon: <Server className="w-4 h-4"/>, label:"Providers tracked", val:"6", sub:"CoreWeave · Lambda · Nebius · AWS · GCP · Azure", color:"text-white" },
          ].map(s => (
            <li key={s.label} className="relative min-h-[7rem] list-none">
              <div className="relative h-full rounded-2xl border border-white/[0.06] p-[2px]">
                <GlowingEffect spread={25} glow disabled={false} proximity={60} inactiveZone={0.01} borderWidth={1} />
                <div className="relative h-full rounded-[calc(1rem-2px)] bg-[#060d1a] p-4 flex flex-col justify-between">
                  <div className="flex items-center gap-2 text-slate-500">{s.icon}<span className="text-[10px] tracking-widest uppercase">{s.label}</span></div>
                  <div>
                    <div className={`text-2xl font-bold font-mono ${s.color}`}>{s.val}</div>
                    <div className="text-[10px] text-slate-600 mt-0.5">{s.sub}</div>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>

        {/* MAIN CONTENT */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">

          {/* LEFT: GPU TABLE */}
          <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                <input
                  className="w-full bg-white/[0.04] border border-white/[0.07] rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-400/40 transition-colors"
                  placeholder="Search GPU or provider..."
                  value={q} onChange={e => setQ(e.target.value)}
                />
              </div>
              {[
                { val: fprov, set: setFprov, opts: PROVIDERS },
                { val: ftier, set: setFtier, opts: TIERS.map(t => t === "All" ? "All tiers" : t) },
              ].map((sel, i) => (
                <select key={i} value={sel.val}
                  onChange={e => sel.set(e.target.value)}
                  className="bg-white/[0.04] border border-white/[0.07] rounded-xl px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-cyan-400/40 cursor-pointer"
                >
                  {sel.opts.map(o => <option key={o} value={o.includes("tiers") ? "All" : o} className="bg-[#060d1a]">{o}</option>)}
                </select>
              ))}
              <select value={sort} onChange={e => setSort(e.target.value as "od"|"spot"|"tflops"|"vram")}
                className="bg-white/[0.04] border border-white/[0.07] rounded-xl px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-cyan-400/40 cursor-pointer"
              >
                <option value="od"     className="bg-[#060d1a]">↕ On-demand</option>
                <option value="spot"   className="bg-[#060d1a]">↕ Spot price</option>
                <option value="tflops" className="bg-[#060d1a]">↕ TFLOPS</option>
                <option value="vram"   className="bg-[#060d1a]">↕ VRAM</option>
              </select>
            </div>

            <div className="flex justify-between text-xs text-slate-600">
              <span>{list.length} GPUs · {new Set(list.map(g => g.provider)).size} providers</span>
              <span>Prices per GPU/hr · Mar 2026</span>
            </div>

            {/* GPU CARDS */}
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {list.map((g, i) => {
                const effPrice = g.spot ? g.spot / kernel.speedup : g.od / SKY / kernel.speedup;
                const saving = Math.round((1 - effPrice / g.od) * 100);
                const sel = selGpu === i;
                return (
                  <li key={`${g.provider}-${g.gpu}`} className="relative list-none">
                    <div
                      className={cn("relative h-full rounded-2xl border p-[2px] cursor-pointer transition-all",
                        sel ? "border-cyan-400/40" : "border-white/[0.06] hover:border-white/[0.12]")}
                      onClick={() => setSelGpu(sel ? null : i)}
                    >
                      <GlowingEffect spread={22} glow={sel} disabled={false} proximity={45} inactiveZone={0.01} borderWidth={sel ? 2 : 1} />
                      <div className="relative flex flex-col gap-3 rounded-[calc(1rem-2px)] bg-[#060d1a] p-4">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                              style={{ background: `${g.color}18`, border: `1px solid ${g.color}33`, color: g.color }}>
                              {initials(g.provider)}
                            </div>
                            <div className="min-w-0">
                              <div className="text-[10px] text-slate-500">{g.provider}</div>
                              <div className="text-sm font-semibold text-white truncate leading-tight">{g.gpu}</div>
                            </div>
                          </div>
                          {g.badge && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-cyan-400/10 text-cyan-400 border border-cyan-400/20 whitespace-nowrap flex-shrink-0">
                              {g.badge}
                            </span>
                          )}
                        </div>

                        {/* Specs row */}
                        <div className="grid grid-cols-3 gap-1.5">
                          {[
                            { l: "VRAM", v: `${g.vram}GB` },
                            { l: "TFLOPS", v: String(g.tflops) },
                            { l: "Region", v: g.region },
                          ].map(s => (
                            <div key={s.l} className="bg-white/[0.03] rounded-lg p-1.5 text-center">
                              <div className="text-[9px] text-slate-600">{s.l}</div>
                              <div className="text-xs font-bold text-white truncate">{s.v}</div>
                            </div>
                          ))}
                        </div>

                        {/* Pricing */}
                        <div className="border-t border-white/[0.05] pt-3 space-y-1.5">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-500">On-demand</span>
                            <span className="text-sm font-bold text-white font-mono">${g.od.toFixed(2)}<span className="text-slate-600 text-xs font-normal">/hr</span></span>
                          </div>
                          {g.spot && (
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-slate-500">Spot</span>
                              <span className="text-sm font-bold text-green-400 font-mono">${g.spot.toFixed(2)}<span className="text-slate-600 text-xs font-normal">/hr</span></span>
                            </div>
                          )}
                          <div className="flex justify-between items-center bg-cyan-400/5 border border-cyan-400/10 rounded-lg px-2.5 py-1.5">
                            <span className="text-xs text-cyan-400">With {kernel.name.split(" ")[0]}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-cyan-400 font-mono">${effPrice.toFixed(2)}<span className="text-slate-600 text-xs font-normal">/hr</span></span>
                              <span className="text-[10px] font-bold text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded-full">−{saving}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* RIGHT PANEL */}
          <div className="space-y-4">

            {/* Kernel selector */}
            <div className="relative rounded-2xl border border-white/[0.07] p-[2px]">
              <GlowingEffect spread={35} glow disabled={false} proximity={75} inactiveZone={0.01} borderWidth={2} />
              <div className="relative rounded-[calc(1rem-2px)] bg-[#060d1a] p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-4 h-4 text-violet-400" />
                  <span className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">GPU MODE Leaderboard</span>
                </div>
                <ul className="space-y-2">
                  {KERNELS.map((k, i) => (
                    <li key={k.rank} className="relative list-none">
                      <div
                        className={cn("relative rounded-xl border p-[1px] cursor-pointer transition-all",
                          i === selKernel ? "border-cyan-400/40" : "border-white/[0.05] hover:border-white/[0.1]")}
                        onClick={() => setSelKernel(i)}
                      >
                        <GlowingEffect spread={15} glow={i === selKernel} disabled={false} proximity={35} inactiveZone={0.01} borderWidth={1} />
                        <div className="relative flex items-center gap-3 rounded-[calc(0.75rem-1px)] bg-[#060d1a] px-3 py-2.5">
                          <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0",
                            i === selKernel ? "bg-cyan-400/20 text-cyan-400" : "bg-white/[0.04] text-slate-500")}>
                            {k.rank}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-white truncate">{k.name}</div>
                            <div className="text-[10px] text-slate-600 truncate">{k.type}</div>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded border", TAG_STYLE[k.tag])}>{k.tag}</span>
                            <span className="text-sm font-bold text-green-400 font-mono">{k.speedup}×</span>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Cost calculator */}
            <div className="relative rounded-2xl border border-white/[0.07] p-[2px]">
              <GlowingEffect spread={35} glow disabled={false} proximity={75} inactiveZone={0.01} borderWidth={2} />
              <div className="relative rounded-[calc(1rem-2px)] bg-[#060d1a] p-5 space-y-5">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-cyan-400" />
                  <span className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">Cost Calculator</span>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-xs text-slate-500">Monthly GPU budget</span>
                    <span className="text-sm font-bold text-amber-400 font-mono">${budget.toLocaleString()}</span>
                  </div>
                  <input type="range" min={500} max={50000} step={500} value={budget}
                    onChange={e => setBudget(Number(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer" />
                  <div className="flex justify-between text-[10px] text-slate-700 mt-1">
                    <span>$500</span><span>$50k</span>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  {[
                    { label: "Baseline (on-demand)", sub: null, val: `$${budget.toLocaleString()}`, pct: null, strike: true, valColor: "text-slate-500" },
                    { label: "After SkyPilot spot", sub: `÷${SKY}× multi-cloud`, val: `$${Math.round(budget/SKY).toLocaleString()}`, pct: `−${Math.round((1-1/SKY)*100)}%`, strike: false, valColor: "text-white" },
                    { label: `After ${kernel.name.split(" ")[0]}`, sub: `÷${kernel.speedup}× kernel`, val: `$${Math.round(optimized).toLocaleString()}`, pct: `−${Math.round((1-optimized/budget)*100)}%`, strike: false, valColor: "text-cyan-400" },
                  ].map(r => (
                    <div key={r.label} className="flex justify-between items-center py-2 border-b border-white/[0.04]">
                      <div>
                        <div className="text-xs text-slate-400">{r.label}</div>
                        {r.sub && <div className="text-[10px] text-slate-600">{r.sub}</div>}
                      </div>
                      <div className="text-right">
                        <span className={cn("font-bold font-mono", r.valColor, r.strike && "line-through")}>{r.val}</span>
                        {r.pct && <div className="text-[10px] text-green-400">{r.pct}</div>}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Result card */}
                <div className="rounded-xl bg-gradient-to-br from-cyan-500/8 to-violet-500/8 border border-cyan-400/15 p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-xs text-slate-400">Monthly savings</div>
                      <div className="text-[10px] text-slate-600 mt-0.5">÷{total.toFixed(1)}× vs on-demand</div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-400 font-mono">${Math.round(saved).toLocaleString()}</div>
                      <div className="text-[10px] text-slate-500">${Math.round(saved*12).toLocaleString()} / year</div>
                    </div>
                  </div>
                  <div className="mt-3 h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-green-400 transition-all duration-700"
                      style={{ width: `${Math.min(100, Math.round((1-optimized/budget)*100))}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-700 mt-1">
                    <span>0%</span>
                    <span className="text-green-400 font-bold">{Math.round((1-optimized/budget)*100)}% saved</span>
                    <span>100%</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-700 border-t border-white/[0.04] pt-3 leading-relaxed flex items-start gap-1.5">
                  <Shield className="w-3 h-3 flex-shrink-0 mt-0.5 text-slate-600" />
                  SkyPilot cuts $/hr · GPU MODE cuts hours needed · Both savings multiply together
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <footer className="border-t border-white/[0.05] pt-5 flex items-center justify-between flex-wrap gap-4 text-xs text-slate-600">
          <span>Pricing sourced from provider docs · March 2026 · Spot prices vary by AZ and availability</span>
          <div className="flex gap-4">
            {[
              { href: "https://github.com/techstar9797/GPUMarketplace", label: "GitHub" },
              { href: "https://gpumode.com/leaderboard", label: "GPU MODE" },
              { href: "https://skypilot.co", label: "SkyPilot" },
            ].map(l => (
              <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer"
                className="hover:text-slate-400 transition-colors flex items-center gap-1">
                {l.label} <ExternalLink className="w-3 h-3" />
              </a>
            ))}
          </div>
        </footer>
      </div>
    </div>
  );
}
