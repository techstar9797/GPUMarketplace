"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Zap, Search, ExternalLink, Activity, DollarSign,
  Server, Sparkles, BarChart3, Shield, TrendingDown,
  Cpu, Thermometer, Network, Database, AlertTriangle,
  ChevronRight, Info, Wind, Power, Clock, Layers
} from "lucide-react";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { cn } from "@/lib/utils";

// ─── REAL GPU HARDWARE SPECS ─────────────────────────────────────────────────
const GPU_SPECS = [
  {
    id: "h100-sxm5",    name: "H100 SXM5",    arch: "Hopper",    vram: 80,
    hbm: "HBM3",        hbm_bw: 3350,  // GB/s
    tflops_fp16: 1979,  tflops_fp8: 3958,  tflops_fp32: 67,
    nvlink_bw: 900,     pcie_bw: 128,  nvlink_gen: 4,
    tdp: 700,           mig_instances: 7,
    ops_per_byte: Math.round(1979*1e12 / (3350*1e9)),  // ~591
    providers: ["CoreWeave","Lambda Labs","Nebius","AWS","Google Cloud","Azure"],
    od_range: [2.95, 14.63], spot_range: [3.69, 4.39],
  },
  {
    id: "h100-pcie",    name: "H100 PCIe",    arch: "Hopper",    vram: 80,
    hbm: "HBM3",        hbm_bw: 2000,
    tflops_fp16: 756,   tflops_fp8: 1513,  tflops_fp32: 51,
    nvlink_bw: 600,     pcie_bw: 128,  nvlink_gen: 4,
    tdp: 350,           mig_instances: 7,
    ops_per_byte: Math.round(756*1e12 / (2000*1e9)),
    providers: ["Lambda Labs","AWS"],
    od_range: [2.49, 5.70], spot_range: [1.71, 2.50],
  },
  {
    id: "a100-80",      name: "A100 80GB",    arch: "Ampere",    vram: 80,
    hbm: "HBM2e",       hbm_bw: 2039,
    tflops_fp16: 312,   tflops_fp8: null,   tflops_fp32: 19.5,
    nvlink_bw: 600,     pcie_bw: 64,   nvlink_gen: 3,
    tdp: 400,           mig_instances: 7,
    ops_per_byte: Math.round(312*1e12 / (2039*1e9)),
    providers: ["CoreWeave","Lambda Labs","Nebius","AWS","Google Cloud","Azure"],
    od_range: [1.85, 5.70], spot_range: [1.23, 1.71],
  },
  {
    id: "l40s",         name: "L40S",         arch: "Ada Lovelace", vram: 48,
    hbm: "GDDR6",       hbm_bw: 864,
    tflops_fp16: 362,   tflops_fp8: 733,   tflops_fp32: 91.6,
    nvlink_bw: null,    pcie_bw: 64,   nvlink_gen: null,
    tdp: 350,           mig_instances: null,
    ops_per_byte: Math.round(362*1e12 / (864*1e9)),
    providers: ["AWS","Azure"],
    od_range: [2.22, 3.40], spot_range: [0.67, 1.02],
  },
  {
    id: "l4",           name: "L4",           arch: "Ada Lovelace", vram: 24,
    hbm: "GDDR6",       hbm_bw: 300,
    tflops_fp16: 242,   tflops_fp8: 484,   tflops_fp32: 30.3,
    nvlink_bw: null,    pcie_bw: 64,   nvlink_gen: null,
    tdp: 72,            mig_instances: null,
    ops_per_byte: Math.round(242*1e12 / (300*1e9)),
    providers: ["AWS","Google Cloud"],
    od_range: [0.70, 0.80], spot_range: [0.21, 0.24],
  },
];

// ─── PROVIDER PRICING TABLE ───────────────────────────────────────────────────
const PROVIDERS = [
  { name:"CoreWeave",    color:"#6366f1", logo:"CW",  gpus:["h100-sxm5","a100-80"],    pricing:{"h100-sxm5":{od:4.25,spot:null},"a100-80":{od:2.06,spot:null}} },
  { name:"Lambda Labs",  color:"#ec4899", logo:"LL",  gpus:["h100-sxm5","h100-pcie","a100-80"], pricing:{"h100-sxm5":{od:3.29,spot:null},"h100-pcie":{od:2.49,spot:null},"a100-80":{od:1.99,spot:null}} },
  { name:"Nebius",       color:"#10b981", logo:"NB",  gpus:["h100-sxm5","a100-80"],    pricing:{"h100-sxm5":{od:2.95,spot:null},"a100-80":{od:1.85,spot:null}} },
  { name:"AWS",          color:"#f59e0b", logo:"AWS", gpus:["h100-sxm5","a100-80","l40s","l4"], pricing:{"h100-sxm5":{od:12.29,spot:3.69},"a100-80":{od:4.10,spot:1.23},"l40s":{od:2.22,spot:0.67},"l4":{od:0.80,spot:0.24}} },
  { name:"Google Cloud", color:"#3b82f6", logo:"GCP", gpus:["h100-sxm5","a100-80","l4"], pricing:{"h100-sxm5":{od:14.63,spot:4.39},"a100-80":{od:5.70,spot:1.71},"l4":{od:0.70,spot:0.21}} },
  { name:"Azure",        color:"#8b5cf6", logo:"AZ",  gpus:["h100-sxm5","a100-80","l40s"], pricing:{"h100-sxm5":{od:13.40,spot:4.02},"a100-80":{od:4.10,spot:1.23},"l40s":{od:3.40,spot:1.02}} },
];

// ─── LLM MODELS ──────────────────────────────────────────────────────────────
const LLM_MODELS = [
  { name:"Llama 3.1 8B",   params:8,   layers:32, hidden:4096, heads:32, kv_heads:8,  precision:"fp16", bytes_per_param:2 },
  { name:"Llama 3.1 70B",  params:70,  layers:80, hidden:8192, heads:64, kv_heads:8,  precision:"fp16", bytes_per_param:2 },
  { name:"Llama 3.1 405B", params:405, layers:126,hidden:16384,heads:128,kv_heads:16, precision:"fp16", bytes_per_param:2 },
  { name:"Mistral 7B",     params:7,   layers:32, hidden:4096, heads:32, kv_heads:8,  precision:"fp16", bytes_per_param:2 },
  { name:"DeepSeek-R1 67B",params:67,  layers:80, hidden:8192, heads:64, kv_heads:8,  precision:"fp16", bytes_per_param:2 },
  { name:"GPT-3 175B",     params:175, layers:96, hidden:12288,heads:96, kv_heads:96, precision:"fp16", bytes_per_param:2 },
  { name:"Mixtral 8×7B",   params:46.7,layers:32, hidden:4096, heads:32, kv_heads:8,  precision:"fp16", bytes_per_param:2 },
];

// ─── GPU MODE KERNELS (from HuggingFace gpu-mode/kernelbot-data) ─────────────
const KERNELS = [
  { rank:1, name:"FlashAttention-3",      op:"Attention",     speedup:4.2, tag:"triton", workload:"inference+training" },
  { rank:2, name:"cuda.compute Sort",     op:"Radix Sort",    speedup:3.8, tag:"python", workload:"preprocessing"      },
  { rank:3, name:"FP8 GEMM (MI300)",     op:"MatMul",        speedup:3.1, tag:"cuda",   workload:"training"           },
  { rank:4, name:"Fused LayerNorm+ReLU", op:"Normalization", speedup:2.9, tag:"triton", workload:"inference+training" },
  { rank:5, name:"Fused AdamW BF16",     op:"Optimizer",     speedup:1.9, tag:"triton", workload:"training"           },
];

// ─── 7-LAYER INFERENCE MODEL ─────────────────────────────────────────────────
const INFERENCE_LAYERS = [
  { id:1, name:"Model Loading",     phase:"setup",    bound:"I/O",     desc:"PCIe transfer of weights from CPU RAM to GPU HBM. ~25-28 GB/s sustained on PCIe 4.0 x16.",   metric:"PCIe BW",     icon:"🔌" },
  { id:2, name:"Tokenization",      phase:"setup",    bound:"CPU",     desc:"CPU-bound. Fast tokenizers use FSA at O(n). Bottleneck under high concurrency.",              metric:"CPU throughput",icon:"📝" },
  { id:3, name:"Prefill (Compute)", phase:"prefill",  bound:"Compute", desc:"Parallel processing of all prompt tokens. Matrix-matrix multiply = compute-bound. Saturates Tensor Cores.",    metric:"TFLOPS",      icon:"⚡" },
  { id:4, name:"KV Cache Alloc",    phase:"prefill",  bound:"Memory",  desc:"PagedAttention allocates KV blocks in HBM. Grows linearly with seq_len × layers × 2 × hidden.",metric:"VRAM GB",      icon:"💾" },
  { id:5, name:"Decode (Attention)",phase:"decode",   bound:"Memory BW",desc:"Matrix-vector ops. Each new token loads ALL weights and KV cache from HBM. Memory-bandwidth bound.",metric:"HBM BW GB/s",  icon:"🔄" },
  { id:6, name:"Multi-GPU Comm",    phase:"parallel", bound:"Network", desc:"All-Reduce via NVLink (intra-node 900 GB/s) or InfiniBand (inter-node 400 Gb/s). TP>4 becomes comm-bound.",   metric:"NVLink/IB BW", icon:"🌐" },
  { id:7, name:"Output Sampling",   phase:"decode",   bound:"CPU/GPU", desc:"Softmax + top-p/top-k sampling. Small compute cost but critical path for TTFT.",              metric:"Latency ms",   icon:"🎯" },
];

const BOUND_COLOR: Record<string,string> = {
  "I/O":      "text-amber-400 bg-amber-400/10 border-amber-400/20",
  "CPU":      "text-orange-400 bg-orange-400/10 border-orange-400/20",
  "Compute":  "text-red-400 bg-red-400/10 border-red-400/20",
  "Memory":   "text-blue-400 bg-blue-400/10 border-blue-400/20",
  "Memory BW":"text-violet-400 bg-violet-400/10 border-violet-400/20",
  "Network":  "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
  "CPU/GPU":  "text-green-400 bg-green-400/10 border-green-400/20",
};

// ─── CALCULATIONS ─────────────────────────────────────────────────────────────
function calcModelMemory(model: typeof LLM_MODELS[0]) {
  // Weights in GB
  const weights_gb = model.params * 1e9 * model.bytes_per_param / 1e9;
  return weights_gb;
}

function calcKVCache(model: typeof LLM_MODELS[0], seq_len: number, batch: number) {
  // KV cache = 2 * layers * kv_heads * (hidden/heads) * seq_len * batch * 2bytes
  const head_dim = model.hidden / model.heads;
  const kv_bytes = 2 * model.layers * model.kv_heads * head_dim * seq_len * batch * 2;
  return kv_bytes / 1e9; // GB
}

function calcArithmeticIntensity(model: typeof LLM_MODELS[0], batch: number) {
  // During decode: ops ≈ 2 * params * batch, bytes ≈ params * bytes_per_param
  // Arithmetic intensity = ops / bytes
  const ops = 2 * model.params * 1e9 * batch;
  const bytes = model.params * 1e9 * model.bytes_per_param;
  return ops / bytes; // ops/byte
}

function classifyBottleneck(gpu: typeof GPU_SPECS[0], arithIntensity: number) {
  if (arithIntensity < gpu.ops_per_byte * 0.5) return "Memory BW";
  if (arithIntensity < gpu.ops_per_byte) return "Transitioning";
  return "Compute";
}

function calcMFU(gpu: typeof GPU_SPECS[0], actual_tflops: number) {
  return (actual_tflops / gpu.tflops_fp16 * 100).toFixed(1);
}

function calcMBU(gpu: typeof GPU_SPECS[0], actual_bw_gbs: number) {
  return (actual_bw_gbs / gpu.hbm_bw * 100).toFixed(1);
}

// TCO calculation
function calcTCO(gpuCount: number, odPricePerGpu: number, months: number, pue: number, utilization: number) {
  const compute_cost = gpuCount * odPricePerGpu * 24 * 30 * months * (utilization/100);
  // Power: assume H100 700W avg, ~$0.07/kWh datacenter rate
  const power_kw = gpuCount * 0.7 * pue;
  const power_cost = power_kw * 24 * 30 * months * 0.07;
  const networking_cost = compute_cost * 0.08; // ~8% of compute
  const storage_cost = compute_cost * 0.05;
  const total = compute_cost + power_cost + networking_cost + storage_cost;
  return { compute_cost, power_cost, networking_cost, storage_cost, total, power_kw };
}

// Capacity: how many GPUs needed for target throughput
function calcCapacity(model: typeof LLM_MODELS[0], gpu: typeof GPU_SPECS[0], target_tps: number, batch: number) {
  // Effective tokens/sec per GPU at given batch
  // Approx: bandwidth-limited decode throughput
  const model_bytes = model.params * 1e9 * model.bytes_per_param;
  const time_per_token_s = model_bytes / (gpu.hbm_bw * 1e9); // memory-bound decode
  const tps_per_gpu = batch / time_per_token_s;
  const gpus_needed = Math.ceil(target_tps / tps_per_gpu);
  const weight_gpus = Math.ceil((model.params * model.bytes_per_param) / (gpu.vram * 0.7)); // 70% VRAM for weights
  return { tps_per_gpu: Math.round(tps_per_gpu), gpus_needed: Math.max(gpus_needed, weight_gpus), weight_gpus };
}

// ─── COMPONENTS ──────────────────────────────────────────────────────────────
function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={cn("px-4 py-2.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap",
        active ? "bg-[#0c1422] text-cyan-400 border border-white/[0.08]" : "text-slate-500 hover:text-slate-300")}>
      {children}
    </button>
  );
}

function GlowCard({ children, className, selected }: { children: React.ReactNode; className?: string; selected?: boolean }) {
  return (
    <div className={cn("relative rounded-2xl border p-[2px] transition-all", selected ? "border-cyan-400/40" : "border-white/[0.06] hover:border-white/[0.1]", className)}>
      <GlowingEffect spread={28} glow={selected} disabled={false} proximity={55} inactiveZone={0.01} borderWidth={selected ? 2 : 1} />
      <div className="relative rounded-[calc(1rem-2px)] bg-[#060d1a] h-full">
        {children}
      </div>
    </div>
  );
}

function MetricBadge({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className={cn("flex flex-col items-center bg-white/[0.03] rounded-lg p-2.5 border border-white/[0.05]")}>
      <div className={cn("text-lg font-bold font-mono", color)}>{value}</div>
      <div className="text-[9px] text-slate-600 uppercase tracking-wider mt-0.5">{label}</div>
    </div>
  );
}

function SectionHeader({ icon, title, sub }: { icon: React.ReactNode; title: string; sub?: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-5">
      <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.07] flex items-center justify-center text-slate-400 flex-shrink-0">
        {icon}
      </div>
      <div>
        <div className="text-sm font-bold text-white">{title}</div>
        {sub && <div className="text-[10px] text-slate-600 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function Page() {
  const [activeTab, setActiveTab] = useState<"overview"|"workload"|"capacity"|"tco"|"npi">("overview");
  const [selGpuId, setSelGpuId] = useState("h100-sxm5");
  const [selModelIdx, setSelModelIdx] = useState(1); // Llama 3.1 70B
  const [batchSize, setBatchSize] = useState(8);
  const [seqLen, setSeqLen] = useState(2048);
  const [targetTps, setTargetTps] = useState(1000);
  const [gpuCount, setGpuCount] = useState(64);
  const [pue, setPue] = useState(1.3);
  const [utilization, setUtilization] = useState(70);
  const [months, setMonths] = useState(12);
  const [selProvider, setSelProvider] = useState("all");
  const [selKernel, setSelKernel] = useState(0);

  const gpu = GPU_SPECS.find(g => g.id === selGpuId) || GPU_SPECS[0];
  const model = LLM_MODELS[selModelIdx];
  const kernel = KERNELS[selKernel];
  const provider = selProvider === "all" ? null : PROVIDERS.find(p => p.name === selProvider);

  // Derived calculations
  const weights_gb = calcModelMemory(model);
  const kv_gb = calcKVCache(model, seqLen, batchSize);
  const total_vram = weights_gb + kv_gb;
  const arith_intensity = calcArithmeticIntensity(model, batchSize);
  const bottleneck = classifyBottleneck(gpu, arith_intensity);
  const capacity = calcCapacity(model, gpu, targetTps, batchSize);

  const cheapestPrice = useMemo(() => {
    let min = Infinity;
    PROVIDERS.forEach(p => {
      const pricing = p.pricing[selGpuId as keyof typeof p.pricing] as {od:number,spot:number|null}|undefined;
      if (pricing) min = Math.min(min, pricing.spot ?? pricing.od);
    });
    return min === Infinity ? null : min;
  }, [selGpuId]);

  const odPrice = useMemo(() => {
    let min = Infinity;
    PROVIDERS.forEach(p => {
      const pricing = p.pricing[selGpuId as keyof typeof p.pricing] as {od:number,spot:number|null}|undefined;
      if (pricing) min = Math.min(min, pricing.od);
    });
    return min === Infinity ? 4.25 : min;
  }, [selGpuId]);

  const tco = calcTCO(gpuCount, odPrice, months, pue, utilization);
  const tco_optimized = calcTCO(
    Math.ceil(capacity.gpus_needed / (kernel.speedup * 0.7)),
    cheapestPrice || odPrice,
    months, pue, utilization
  );

  const gpus_for_model = Math.ceil(weights_gb / (gpu.vram * 0.75));
  const vram_headroom = (gpu.vram - (weights_gb / gpus_for_model) - (kv_gb / gpus_for_model)).toFixed(1);

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 selection:bg-cyan-400/20">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/3 w-[700px] h-[500px] rounded-full bg-cyan-500/[0.025] blur-[140px]" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[500px] rounded-full bg-violet-500/[0.03] blur-[140px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:48px_48px]" />
      </div>

      <div className="relative z-10 max-w-[1360px] mx-auto px-5 py-7 space-y-6">

        {/* ── HEADER ── */}
        <header className="flex items-start justify-between flex-wrap gap-5">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-violet-600 flex items-center justify-center flex-shrink-0">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-white tracking-tight">GPUMarketplace</span>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/25">FLUIDSTACK · GTC26</span>
                </div>
                <p className="text-xs text-slate-500">Capacity Planning · TCO · Workload Characterization · NPI Intelligence</p>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white leading-tight tracking-tight max-w-2xl">
              Infrastructure intelligence for<br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-400">
                AI compute capacity planning.
              </span>
            </h1>
            <p className="text-slate-500 text-xs mt-2 max-w-xl leading-relaxed">
              Model your workload&apos;s bottleneck profile, compute TCO across 6 providers, plan GPU cluster capacity,
              and apply GPU MODE&apos;s top kernels to reduce infrastructure spend.
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            {[
              {d:"bg-green-400", t:"Live GPU pricing · 6 providers"},
              {d:"bg-cyan-400",  t:"GPU MODE kernelbot-data (HuggingFace)"},
              {d:"bg-violet-400",t:"7-layer inference model · roofline analysis"},
              {d:"bg-amber-400", t:"NVLink topology · power & PUE modeling"},
            ].map(p=>(
              <div key={p.t} className="flex items-center gap-2 text-[11px] text-slate-400 bg-white/[0.02] border border-white/[0.05] rounded-full px-3 py-1">
                <span className={`w-1.5 h-1.5 rounded-full ${p.d} animate-pulse flex-shrink-0`} />
                {p.t}
              </div>
            ))}
          </div>
        </header>

        {/* ── GPU SELECTOR STRIP ── */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {GPU_SPECS.map(g => (
            <button key={g.id} onClick={() => setSelGpuId(g.id)}
              className={cn("flex-shrink-0 px-4 py-2.5 rounded-xl border text-xs font-medium transition-all",
                selGpuId===g.id ? "bg-cyan-400/10 border-cyan-400/40 text-cyan-400" : "bg-white/[0.03] border-white/[0.07] text-slate-400 hover:border-white/[0.12]")}>
              <div className="font-bold">{g.name}</div>
              <div className="text-[9px] opacity-60 mt-0.5">{g.vram}GB · {(g.tflops_fp16/1000).toFixed(1)}PFLOPS</div>
            </button>
          ))}
        </div>

        {/* ── STAT STRIP ── */}
        <ul className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { icon:<DollarSign className="w-3.5 h-3.5"/>, label:"Best price/hr", val: cheapestPrice ? `$${cheapestPrice.toFixed(2)}` : "—",  color:"text-green-400", sub:"spot or on-demand" },
            { icon:<Cpu className="w-3.5 h-3.5"/>,        label:"FP16 TFLOPS",  val:`${gpu.tflops_fp16}`, color:"text-cyan-400",   sub:gpu.name },
            { icon:<Database className="w-3.5 h-3.5"/>,   label:"HBM bandwidth",val:`${gpu.hbm_bw} GB/s`, color:"text-violet-400", sub:`${gpu.hbm} · ${gpu.vram}GB` },
            { icon:<Network className="w-3.5 h-3.5"/>,    label:"NVLink BW",    val: gpu.nvlink_bw ? `${gpu.nvlink_bw} GB/s` : "No NVLink", color:"text-amber-400",  sub: gpu.nvlink_gen ? `Gen ${gpu.nvlink_gen}` : "PCIe only" },
            { icon:<Power className="w-3.5 h-3.5"/>,      label:"TDP",          val:`${gpu.tdp}W`,       color:"text-red-400",    sub:`MIG ×${gpu.mig_instances||"—"}` },
          ].map(s=>(
            <li key={s.label} className="relative min-h-[6.5rem] list-none">
              <GlowCard>
                <div className="p-4 flex flex-col justify-between h-full min-h-[6.5rem]">
                  <div className="flex items-center gap-1.5 text-slate-600">{s.icon}<span className="text-[9px] tracking-widest uppercase">{s.label}</span></div>
                  <div>
                    <div className={`text-xl font-bold font-mono ${s.color}`}>{s.val}</div>
                    <div className="text-[9px] text-slate-600 mt-0.5">{s.sub}</div>
                  </div>
                </div>
              </GlowCard>
            </li>
          ))}
        </ul>

        {/* ── TABS ── */}
        <div className="flex bg-[#060d1a] border border-white/[0.07] rounded-xl p-1 gap-1 overflow-x-auto">
          {[
            {id:"overview",   label:"📊 Overview"},
            {id:"workload",   label:"🔬 Workload Analysis"},
            {id:"capacity",   label:"🏗 Capacity Planning"},
            {id:"tco",        label:"💰 TCO & Power"},
            {id:"npi",        label:"🚀 NPI Intelligence"},
          ].map(t=>(
            <Tab key={t.id} active={activeTab===t.id} onClick={()=>setActiveTab(t.id as typeof activeTab)}>{t.label}</Tab>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            TAB 1: OVERVIEW
        ══════════════════════════════════════════════════════════════════ */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5">

            {/* Provider pricing grid */}
            <div>
              <SectionHeader icon={<Server className="w-4 h-4"/>} title="GPU Compute Pricing" sub={`${gpu.name} · per GPU per hour · March 2026`} />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {PROVIDERS.map(p => {
                  const pricing = p.pricing[selGpuId as keyof typeof p.pricing] as {od:number,spot:number|null}|undefined;
                  if (!pricing) return (
                    <GlowCard key={p.name}>
                      <div className="p-4 opacity-40">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-7 h-7 rounded-lg text-[10px] font-bold flex items-center justify-center" style={{background:`${p.color}18`,border:`1px solid ${p.color}33`,color:p.color}}>{p.logo}</div>
                          <div className="text-sm font-semibold text-white">{p.name}</div>
                        </div>
                        <div className="text-xs text-slate-600">Not available for {gpu.name}</div>
                      </div>
                    </GlowCard>
                  );
                  const eff = (pricing.spot || pricing.od) / (kernel.speedup);
                  const saving = Math.round((1 - eff/pricing.od)*100);
                  return (
                    <GlowCard key={p.name} selected={selProvider===p.name} className="cursor-pointer" >
                      <div className="p-4" onClick={()=>setSelProvider(prev=>prev===p.name?"all":p.name)}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg text-[10px] font-bold flex items-center justify-center flex-shrink-0" style={{background:`${p.color}18`,border:`1px solid ${p.color}33`,color:p.color}}>{p.logo}</div>
                            <div className="text-sm font-semibold text-white">{p.name}</div>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex justify-between">
                            <span className="text-xs text-slate-500">On-demand</span>
                            <span className="text-sm font-bold text-white font-mono">${pricing.od.toFixed(2)}<span className="text-slate-600 text-xs">/hr</span></span>
                          </div>
                          {pricing.spot && (
                            <div className="flex justify-between">
                              <span className="text-xs text-slate-500">Spot / Preemptible</span>
                              <span className="text-sm font-bold text-green-400 font-mono">${pricing.spot.toFixed(2)}<span className="text-slate-600 text-xs">/hr</span></span>
                            </div>
                          )}
                          <div className="flex justify-between bg-cyan-400/5 border border-cyan-400/10 rounded-lg px-2.5 py-1.5 mt-2">
                            <span className="text-xs text-cyan-400">+ {kernel.name.split(" ")[0]} kernel</span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-cyan-400 font-mono">${eff.toFixed(2)}/hr</span>
                              <span className="text-[9px] font-bold text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded-full">−{saving}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </GlowCard>
                  );
                })}
              </div>

              {/* 7-layer model */}
              <div className="mt-6">
                <SectionHeader icon={<Layers className="w-4 h-4"/>} title="7-Layer Inference Model" sub="Bottleneck classification per inference phase" />
                <div className="space-y-2">
                  {INFERENCE_LAYERS.map(layer=>(
                    <GlowCard key={layer.id}>
                      <div className="flex items-center gap-4 px-4 py-3">
                        <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.07] flex items-center justify-center text-sm flex-shrink-0">
                          {layer.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-bold text-white">{layer.id}. {layer.name}</span>
                            <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded border", BOUND_COLOR[layer.bound])}>{layer.bound}</span>
                          </div>
                          <p className="text-[10px] text-slate-500 leading-relaxed">{layer.desc}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-[9px] text-slate-600 uppercase tracking-wide">{layer.metric}</div>
                          <div className={cn("text-xs font-bold mt-0.5",
                            layer.bound==="Compute"   ? "text-red-400" :
                            layer.bound==="Memory BW" ? "text-violet-400" :
                            layer.bound==="Network"   ? "text-cyan-400" : "text-slate-400")}>
                            {layer.bound==="Compute"   ? `${gpu.tflops_fp16} TF` :
                             layer.bound==="Memory BW" ? `${gpu.hbm_bw} GB/s` :
                             layer.bound==="Network"   ? gpu.nvlink_bw ? `${gpu.nvlink_bw} GB/s` : "PCIe" : "—"}
                          </div>
                        </div>
                      </div>
                    </GlowCard>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: kernel selector + quick roofline */}
            <div className="space-y-4">
              <GlowCard>
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-4 h-4 text-violet-400" />
                    <span className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">GPU MODE · kernelbot-data</span>
                    <a href="https://huggingface.co/datasets/GPUMODE/kernelbot-data" target="_blank" rel="noopener noreferrer" className="ml-auto text-[9px] text-slate-600 hover:text-slate-400 flex items-center gap-1">HF <ExternalLink className="w-2.5 h-2.5"/></a>
                  </div>
                  <div className="space-y-2">
                    {KERNELS.map((k,i)=>(
                      <div key={k.rank}
                        className={cn("relative rounded-xl border p-[1px] cursor-pointer transition-all",
                          i===selKernel?"border-cyan-400/40":"border-white/[0.05] hover:border-white/[0.1]")}
                        onClick={()=>setSelKernel(i)}>
                        <GlowingEffect spread={15} glow={i===selKernel} disabled={false} proximity={35} inactiveZone={0.01} borderWidth={1}/>
                        <div className="relative flex items-center gap-3 rounded-[calc(0.75rem-1px)] bg-[#060d1a] px-3 py-2.5">
                          <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0",
                            i===selKernel?"bg-cyan-400/20 text-cyan-400":"bg-white/[0.04] text-slate-500")}>{k.rank}</div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-white">{k.name}</div>
                            <div className="text-[9px] text-slate-600">{k.op} · {k.workload}</div>
                          </div>
                          <div className="text-sm font-bold text-green-400 font-mono">{k.speedup}×</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </GlowCard>

              {/* NVLink topology quick ref */}
              <GlowCard>
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Network className="w-4 h-4 text-cyan-400"/>
                    <span className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">Interconnect Topology</span>
                  </div>
                  <div className="space-y-3">
                    {[
                      {label:"NVLink 4 (H100 intra-node)", bw:"900 GB/s", color:"text-cyan-400", note:"18 links × 50 GB/s · 8-GPU full mesh"},
                      {label:"NVLink 5 (B200 intra-node)",  bw:"1.8 TB/s", color:"text-violet-400", note:"18 links × 100 GB/s"},
                      {label:"NDR InfiniBand (inter-node)", bw:"400 Gb/s", color:"text-amber-400",  note:"~50 GB/s per port per GPU"},
                      {label:"PCIe Gen5 x16 (fallback)",    bw:"128 GB/s", color:"text-slate-400",  note:"7× slower than NVLink 4"},
                    ].map(r=>(
                      <div key={r.label} className="flex items-center justify-between">
                        <div>
                          <div className="text-xs text-slate-300">{r.label}</div>
                          <div className="text-[9px] text-slate-600">{r.note}</div>
                        </div>
                        <span className={`text-sm font-bold font-mono ${r.color}`}>{r.bw}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 bg-amber-400/5 border border-amber-400/15 rounded-lg p-3 text-[10px] text-amber-400/80 leading-relaxed">
                    <AlertTriangle className="w-3 h-3 inline mr-1"/>
                    Tensor Parallelism &gt;4 on InfiniBand becomes comm-bound. Use Pipeline Parallelism across nodes + TP within node for optimal scaling.
                  </div>
                </div>
              </GlowCard>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB 2: WORKLOAD ANALYSIS
        ══════════════════════════════════════════════════════════════════ */}
        {activeTab === "workload" && (
          <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-5">

            {/* Controls */}
            <div className="space-y-4">
              <GlowCard>
                <div className="p-5 space-y-4">
                  <SectionHeader icon={<Cpu className="w-4 h-4"/>} title="Model" sub="Select LLM to characterize"/>
                  <div className="space-y-2">
                    {LLM_MODELS.map((m,i)=>(
                      <button key={m.name} onClick={()=>setSelModelIdx(i)}
                        className={cn("w-full text-left px-3 py-2.5 rounded-xl border text-xs transition-all",
                          i===selModelIdx?"bg-cyan-400/8 border-cyan-400/30 text-white":"bg-white/[0.02] border-white/[0.05] text-slate-400 hover:border-white/[0.1]")}>
                        <div className="font-bold">{m.name}</div>
                        <div className="text-[9px] opacity-60 mt-0.5">{m.params}B params · {m.layers} layers</div>
                      </button>
                    ))}
                  </div>

                  <div className="space-y-3 pt-2 border-t border-white/[0.05]">
                    <div>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-slate-500">Batch size</span>
                        <span className="text-white font-bold font-mono">{batchSize}</span>
                      </div>
                      <input type="range" min={1} max={128} step={1} value={batchSize} onChange={e=>setBatchSize(Number(e.target.value))} className="w-full accent-cyan-400" />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-slate-500">Sequence length</span>
                        <span className="text-white font-bold font-mono">{seqLen.toLocaleString()}</span>
                      </div>
                      <input type="range" min={512} max={32768} step={512} value={seqLen} onChange={e=>setSeqLen(Number(e.target.value))} className="w-full accent-cyan-400" />
                    </div>
                  </div>
                </div>
              </GlowCard>
            </div>

            {/* Analysis */}
            <div className="space-y-4">
              {/* Roofline summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MetricBadge label="Model size" value={`${weights_gb.toFixed(1)} GB`} color="text-cyan-400"/>
                <MetricBadge label="KV cache" value={`${kv_gb.toFixed(1)} GB`} color="text-violet-400"/>
                <MetricBadge label="Total VRAM" value={`${total_vram.toFixed(1)} GB`} color={total_vram > gpu.vram ? "text-red-400" : "text-green-400"}/>
                <MetricBadge label="Min GPUs" value={`${gpus_for_model}`} color="text-amber-400"/>
              </div>

              {/* Roofline analysis */}
              <GlowCard>
                <div className="p-5">
                  <SectionHeader icon={<Activity className="w-4 h-4"/>} title="Roofline Analysis" sub={`${model.name} on ${gpu.name} · batch=${batchSize}`}/>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-3">
                      {[
                        {label:"GPU ops:byte ratio",  val:`${gpu.ops_per_byte}`, unit:"ops/byte", color:"text-cyan-400", desc:"GPU's compute/bandwidth ceiling"},
                        {label:"Model arithmetic intensity", val:arith_intensity.toFixed(1), unit:"ops/byte", color: arith_intensity < gpu.ops_per_byte ? "text-red-400":"text-green-400", desc:`batch=${batchSize} decode phase`},
                        {label:"Bottleneck",    val:bottleneck, unit:"", color: bottleneck==="Compute"?"text-red-400":bottleneck==="Memory BW"?"text-violet-400":"text-amber-400", desc:"roofline classification"},
                        {label:"MFU estimate",  val:`~${(Math.min(arith_intensity/gpu.ops_per_byte,1)*40+10).toFixed(0)}%`, unit:"", color:"text-green-400", desc:"Model FLOP utilization (decode)"},
                        {label:"MBU estimate",  val:`~${Math.min(95, arith_intensity < gpu.ops_per_byte ? 75 : 45).toFixed(0)}%`, unit:"", color:"text-violet-400", desc:"Memory bandwidth utilization"},
                      ].map(r=>(
                        <div key={r.label} className="flex items-center justify-between py-2 border-b border-white/[0.04]">
                          <div>
                            <div className="text-xs text-slate-400">{r.label}</div>
                            <div className="text-[9px] text-slate-600">{r.desc}</div>
                          </div>
                          <span className={`text-sm font-bold font-mono ${r.color}`}>{r.val}<span className="text-slate-600 text-xs ml-0.5">{r.unit}</span></span>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-3">
                      <div className={cn("rounded-xl border p-4 text-xs",
                        bottleneck==="Memory BW" ? "bg-violet-400/5 border-violet-400/20" : "bg-red-400/5 border-red-400/20")}>
                        <div className={cn("font-bold text-sm mb-2", bottleneck==="Memory BW"?"text-violet-400":"text-red-400")}>
                          {bottleneck==="Memory BW" ? "⚠️ Memory-bandwidth bound" : bottleneck==="Compute" ? "✅ Compute bound" : "🔄 Transitioning"}
                        </div>
                        <p className="text-slate-400 leading-relaxed text-[11px]">
                          {bottleneck==="Memory BW"
                            ? `With batch=${batchSize}, arithmetic intensity (${arith_intensity.toFixed(1)} ops/byte) is below ${gpu.name}'s ceiling (${gpu.ops_per_byte} ops/byte). Decode is loading weights from HBM faster than it can compute. Fixes: increase batch size to ${Math.ceil(gpu.ops_per_byte * model.params * model.bytes_per_param / (2 * model.params * 1e9) * 1e9)} or use FlashAttention to reduce memory pressure.`
                            : `With batch=${batchSize}, the workload saturates Tensor Cores. MFU is high. Consider reducing batch for lower latency, or fusing kernels to maintain compute utilization.`}
                        </p>
                      </div>

                      {/* VRAM breakdown */}
                      <div className="bg-white/[0.02] rounded-xl p-4 border border-white/[0.05] space-y-2">
                        <div className="text-xs font-bold text-slate-400 mb-2">VRAM breakdown</div>
                        {[
                          {label:"Model weights", gb:weights_gb, color:"bg-cyan-400"},
                          {label:`KV cache (seq=${seqLen})`, gb:kv_gb, color:"bg-violet-400"},
                          {label:"Activations (est.)", gb:weights_gb*0.05, color:"bg-amber-400"},
                        ].map(r=>{
                          const pct = Math.min(100,(r.gb/(gpu.vram||80))*100);
                          return (
                            <div key={r.label}>
                              <div className="flex justify-between text-[10px] mb-1">
                                <span className="text-slate-500">{r.label}</span>
                                <span className="text-white font-mono">{r.gb.toFixed(1)} GB</span>
                              </div>
                              <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${r.color} transition-all`} style={{width:`${pct}%`}}/>
                              </div>
                            </div>
                          );
                        })}
                        <div className="flex justify-between text-[10px] pt-1 border-t border-white/[0.05]">
                          <span className="text-slate-500">GPU VRAM available</span>
                          <span className={cn("font-bold font-mono", total_vram > gpu.vram ? "text-red-400":"text-green-400")}>
                            {gpu.vram} GB ({vram_headroom} GB free)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </GlowCard>

              {/* Per-layer bottleneck */}
              <GlowCard>
                <div className="p-5">
                  <SectionHeader icon={<Layers className="w-4 h-4"/>} title="Phase-by-phase bottleneck" sub={`${model.name} · 7-layer inference profile`}/>
                  <div className="grid grid-cols-7 gap-1.5">
                    {INFERENCE_LAYERS.map(l=>{
                      const isActive = l.bound==="Memory BW" || (l.bound==="Compute" && bottleneck==="Compute");
                      return (
                        <div key={l.id} className={cn("rounded-xl p-2.5 border text-center transition-all",
                          isActive ? "bg-red-400/8 border-red-400/20" : "bg-white/[0.02] border-white/[0.05]")}>
                          <div className="text-lg mb-1">{l.icon}</div>
                          <div className="text-[9px] font-bold text-white leading-tight">{l.name.split(" ")[0]}</div>
                          <div className={cn("text-[8px] mt-1 px-1 py-0.5 rounded font-bold", BOUND_COLOR[l.bound])}>{l.bound}</div>
                          {isActive && <div className="text-[8px] text-red-400 mt-1 font-bold">BOTTLENECK</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </GlowCard>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB 3: CAPACITY PLANNING
        ══════════════════════════════════════════════════════════════════ */}
        {activeTab === "capacity" && (
          <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-5">
            <GlowCard>
              <div className="p-5 space-y-4">
                <SectionHeader icon={<BarChart3 className="w-4 h-4"/>} title="Capacity inputs" />
                {[
                  {label:"Target throughput (tokens/sec)", val:targetTps, set:setTargetTps, min:100,max:100000,step:100,fmt:(v:number)=>v.toLocaleString()},
                  {label:"Batch size",  val:batchSize, set:setBatchSize, min:1,max:256,step:1,fmt:(v:number)=>String(v)},
                  {label:"Sequence length", val:seqLen, set:setSeqLen, min:512,max:32768,step:512,fmt:(v:number)=>v.toLocaleString()},
                ].map(s=>(
                  <div key={s.label}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-slate-500">{s.label}</span>
                      <span className="text-white font-bold font-mono">{s.fmt(s.val)}</span>
                    </div>
                    <input type="range" min={s.min} max={s.max} step={s.step} value={s.val}
                      onChange={e=>s.set(Number(e.target.value))} className="w-full accent-cyan-400"/>
                  </div>
                ))}
                <div className="pt-2 border-t border-white/[0.05]">
                  <div className="text-[10px] font-bold text-slate-500 tracking-widest uppercase mb-2">Model</div>
                  <select value={selModelIdx} onChange={e=>setSelModelIdx(Number(e.target.value))}
                    className="w-full bg-white/[0.04] border border-white/[0.07] rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-400/40">
                    {LLM_MODELS.map((m,i)=><option key={m.name} value={i} className="bg-[#060d1a]">{m.name}</option>)}
                  </select>
                </div>
              </div>
            </GlowCard>

            <div className="space-y-4">
              {/* Results */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MetricBadge label="GPUs needed" value={String(capacity.gpus_needed)} color="text-amber-400"/>
                <MetricBadge label="TPS per GPU" value={capacity.tps_per_gpu.toLocaleString()} color="text-cyan-400"/>
                <MetricBadge label="Min for weights" value={`${capacity.weight_gpus} GPUs`} color="text-violet-400"/>
                <MetricBadge label="NVLink nodes" value={`${Math.ceil(capacity.gpus_needed/8)}`} color="text-green-400"/>
              </div>

              <GlowCard>
                <div className="p-5">
                  <SectionHeader icon={<Server className="w-4 h-4"/>} title="Cluster topology recommendation" sub={`${model.name} · ${targetTps.toLocaleString()} tok/s target`}/>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-3">
                      {[
                        {label:"Tensor Parallelism", val:`TP=${Math.min(8,gpus_for_model)}`, color:"text-cyan-400", note:"Within node (NVLink). Keep TP≤8 to avoid comm bottleneck."},
                        {label:"Pipeline Parallelism", val:`PP=${Math.max(1,Math.ceil(gpus_for_model/8))}`, color:"text-violet-400", note:"Across nodes (InfiniBand). Use for models >8×GPU."},
                        {label:"Data Parallelism", val:`DP=${Math.max(1,Math.ceil(capacity.gpus_needed/Math.max(gpus_for_model,1)))}`, color:"text-green-400", note:"Replicas for throughput scaling."},
                        {label:"Recommended config", val:`${gpus_for_model} GPUs / model`, color:"text-amber-400", note:`${Math.ceil(capacity.gpus_needed/gpus_for_model)} model replicas for target TPS`},
                      ].map(r=>(
                        <div key={r.label} className="py-2 border-b border-white/[0.04]">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-400">{r.label}</span>
                            <span className={`text-sm font-bold font-mono ${r.color}`}>{r.val}</span>
                          </div>
                          <div className="text-[9px] text-slate-600 mt-0.5">{r.note}</div>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-3">
                      <div className="bg-white/[0.02] rounded-xl p-4 border border-white/[0.05]">
                        <div className="text-xs font-bold text-slate-400 mb-3">Cost across providers ({capacity.gpus_needed} GPUs)</div>
                        {PROVIDERS.filter(p=>{
                          const pricing = p.pricing[selGpuId as keyof typeof p.pricing] as {od:number,spot:number|null}|undefined;
                          return !!pricing;
                        }).map(p=>{
                          const pricing = p.pricing[selGpuId as keyof typeof p.pricing] as {od:number,spot:number|null};
                          const monthly = capacity.gpus_needed * pricing.od * 24 * 30;
                          const spot_monthly = pricing.spot ? capacity.gpus_needed * pricing.spot * 24 * 30 : null;
                          return (
                            <div key={p.name} className="flex items-center justify-between py-1.5 border-b border-white/[0.04]">
                              <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded text-[8px] font-bold flex items-center justify-center flex-shrink-0" style={{background:`${p.color}18`,color:p.color}}>{p.logo}</div>
                                <span className="text-xs text-slate-400">{p.name}</span>
                              </div>
                              <div className="text-right">
                                <div className="text-xs font-bold text-white font-mono">${Math.round(monthly/1000)}k/mo</div>
                                {spot_monthly && <div className="text-[9px] text-green-400 font-mono">${Math.round(spot_monthly/1000)}k spot</div>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {total_vram > gpu.vram && (
                        <div className="bg-red-400/8 border border-red-400/20 rounded-xl p-3 text-[11px] text-red-400">
                          <AlertTriangle className="w-3 h-3 inline mr-1"/>
                          Model exceeds single GPU VRAM ({total_vram.toFixed(0)} GB &gt; {gpu.vram} GB). Minimum {gpus_for_model} GPUs required with tensor parallelism.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </GlowCard>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB 4: TCO & POWER
        ══════════════════════════════════════════════════════════════════ */}
        {activeTab === "tco" && (
          <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-5">
            <GlowCard>
              <div className="p-5 space-y-4">
                <SectionHeader icon={<DollarSign className="w-4 h-4"/>} title="TCO inputs" />
                {[
                  {label:"GPU count",    val:gpuCount,     set:setGpuCount,     min:8,   max:4096, step:8,   fmt:(v:number)=>String(v)},
                  {label:"Planning horizon (months)", val:months, set:setMonths, min:1, max:60, step:1, fmt:(v:number)=>String(v)},
                  {label:"PUE (data center efficiency)", val:pue, set:setPue, min:1.0, max:2.0, step:0.05, fmt:(v:number)=>v.toFixed(2)},
                  {label:"GPU utilization %",  val:utilization, set:setUtilization, min:10,  max:100,  step:5,   fmt:(v:number)=>v+"%"},
                ].map(s=>(
                  <div key={s.label}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-slate-500">{s.label}</span>
                      <span className="text-white font-bold font-mono">{s.fmt(s.val)}</span>
                    </div>
                    <input type="range" min={s.min} max={s.max} step={s.step} value={s.val}
                      onChange={e=>s.set(Number(e.target.value))} className="w-full accent-cyan-400"/>
                  </div>
                ))}
              </div>
            </GlowCard>

            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MetricBadge label="Total TCO" value={`$${Math.round(tco.total/1000)}k`} color="text-red-400"/>
                <MetricBadge label="Power draw" value={`${tco.power_kw.toFixed(0)} kW`} color="text-amber-400"/>
                <MetricBadge label="With kernels" value={`$${Math.round(tco_optimized.total/1000)}k`} color="text-green-400"/>
                <MetricBadge label="TCO saving" value={`${Math.round((1-tco_optimized.total/tco.total)*100)}%`} color="text-cyan-400"/>
              </div>

              <GlowCard>
                <div className="p-5">
                  <SectionHeader icon={<TrendingDown className="w-4 h-4"/>} title={`TCO breakdown · ${gpuCount} × ${gpu.name} · ${months} months`} />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-3">
                      {[
                        {label:"Compute (cloud GPU)",    val:tco.compute_cost,    opt:tco_optimized.compute_cost, color:"bg-cyan-400",   icon:"💻"},
                        {label:"Power (PUE="+pue+")",    val:tco.power_cost,      opt:tco_optimized.power_cost,   color:"bg-amber-400",  icon:"⚡"},
                        {label:"Networking (est. 8%)",   val:tco.networking_cost, opt:tco_optimized.networking_cost,color:"bg-violet-400",icon:"🌐"},
                        {label:"Storage (est. 5%)",      val:tco.storage_cost,    opt:tco_optimized.storage_cost, color:"bg-green-400",  icon:"💾"},
                      ].map(r=>{
                        const pctOfTotal = tco.total > 0 ? (r.val/tco.total*100) : 0;
                        const saving_pct = r.val > 0 ? Math.round((1-r.opt/r.val)*100) : 0;
                        return (
                          <div key={r.label} className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-sm">{r.icon}</span>
                                <span className="text-xs text-slate-400">{r.label}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-sm font-bold text-white font-mono">${Math.round(r.val/1000)}k</span>
                                {saving_pct > 0 && <span className="text-[9px] text-green-400 ml-1">→ ${Math.round(r.opt/1000)}k (−{saving_pct}%)</span>}
                              </div>
                            </div>
                            <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${r.color} transition-all`} style={{width:`${pctOfTotal}%`}}/>
                            </div>
                          </div>
                        );
                      })}
                      <div className="flex justify-between py-2 border-t border-white/[0.08] mt-2">
                        <span className="text-sm font-bold text-white">Total TCO</span>
                        <div className="text-right">
                          <span className="text-lg font-bold text-red-400 font-mono">${(tco.total/1e6).toFixed(2)}M</span>
                          <div className="text-xs text-green-400">optimized: ${(tco_optimized.total/1e6).toFixed(2)}M</div>
                        </div>
                      </div>
                    </div>

                    {/* Power & sustainability */}
                    <div className="space-y-3">
                      <div className="bg-amber-400/5 border border-amber-400/15 rounded-xl p-4 space-y-3">
                        <div className="text-xs font-bold text-amber-400 mb-2">⚡ Power & Thermal Model</div>
                        {[
                          {label:"GPU TDP × count",    val:`${gpu.tdp}W × ${gpuCount} = ${(gpu.tdp*gpuCount/1000).toFixed(1)} kW`},
                          {label:"Total with PUE",     val:`${tco.power_kw.toFixed(1)} kW`},
                          {label:"Monthly kWh",        val:`${(tco.power_kw*24*30).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g,',')} kWh`},
                          {label:"CO₂ (avg grid)",     val:`${(tco.power_kw*24*30*0.41/1000).toFixed(1)} tonnes CO₂/mo`},
                          {label:"Cooling (PUE overhead)", val:`${((pue-1)*gpu.tdp*gpuCount/1000).toFixed(1)} kW`},
                        ].map(r=>(
                          <div key={r.label} className="flex justify-between text-xs">
                            <span className="text-slate-500">{r.label}</span>
                            <span className="text-amber-400 font-mono font-bold">{r.val}</span>
                          </div>
                        ))}
                      </div>

                      <div className="bg-white/[0.02] rounded-xl p-4 border border-white/[0.05] space-y-2">
                        <div className="text-xs font-bold text-slate-400 mb-2">PUE benchmarks</div>
                        {[
                          {name:"Hyperscaler (Google/Meta)", pue_val:1.1, color:"text-green-400"},
                          {name:"Modern colo (FluidStack tier)",pue_val:1.2,color:"text-cyan-400"},
                          {name:"Standard colo",             pue_val:1.4, color:"text-amber-400"},
                          {name:"Older facility",            pue_val:1.8, color:"text-red-400"},
                        ].map(r=>(
                          <div key={r.name} className="flex justify-between text-xs">
                            <div className="flex items-center gap-1.5">
                              <div className={cn("w-1.5 h-1.5 rounded-full", r.pue_val===pue?"ring-2 ring-white":"")} style={{background:r.color.replace("text-","").replace("-400","")}}/>
                              <span className="text-slate-400">{r.name}</span>
                            </div>
                            <span className={`font-mono font-bold ${r.color}`}>PUE {r.pue_val}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </GlowCard>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB 5: NPI INTELLIGENCE
        ══════════════════════════════════════════════════════════════════ */}
        {activeTab === "npi" && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  phase:"EVT", title:"Engineering Validation Test", icon:"🔧",
                  color:"text-amber-400", border:"border-amber-400/20", bg:"bg-amber-400/5",
                  items:["GPU compute TFLOPS validation vs spec","HBM bandwidth stress test (DGEMM sweep)","NVLink topology verification (all-to-all BW)","Thermal TDP headroom at sustained load","PCIe Gen5 link training & error rate","MIG partition correctness + isolation"],
                  gpu_metrics:["FP16 TFLOPS: target "+gpu.tflops_fp16+" TF","HBM BW: "+gpu.hbm_bw+" GB/s","NVLink BW: "+(gpu.nvlink_bw||"N/A")+" GB/s","TDP: "+gpu.tdp+"W sustained"],
                },
                {
                  phase:"DVT", title:"Design Validation Test", icon:"⚗️",
                  color:"text-cyan-400", border:"border-cyan-400/20", bg:"bg-cyan-400/5",
                  items:["Multi-node NVLink/IB fabric validation","RDMA over IB for distributed training","Power delivery at 80% sustained utilization","Cooling CDU flow rate & delta-T","Firmware + driver stack compatibility","vLLM / TRT-LLM inference stack benchmarks"],
                  gpu_metrics:["InfiniBand NDR: 400 Gb/s","All-reduce latency: <1ms for 1GB","Power efficiency: TFLOPS/W","Cooling: CDU 45°C supply temp"],
                },
                {
                  phase:"PVT", title:"Production Validation Test", icon:"🚀",
                  color:"text-green-400", border:"border-green-400/20", bg:"bg-green-400/5",
                  items:["SLA latency P50/P95/P99 under load","Throughput: tokens/sec at target utilization","GPU utilization & MFU tracking","Failure rate & MTBF baseline","SkyPilot workload scheduling integration","Customer pilot: real LLM inference workloads"],
                  gpu_metrics:["TTFT P99: <2s at batch="+batchSize,"TGS: "+capacity.tps_per_gpu+" tok/s/GPU","MFU target: >35%","Availability: 99.9%"],
                },
              ].map(phase=>(
                <GlowCard key={phase.phase}>
                  <div className="p-5">
                    <div className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border mb-4", phase.border, phase.bg, phase.color)}>
                      <span>{phase.icon}</span>{phase.phase}
                    </div>
                    <div className="text-sm font-bold text-white mb-3">{phase.title}</div>
                    <ul className="space-y-1.5 mb-4">
                      {phase.items.map(item=>(
                        <li key={item} className="flex items-start gap-2 text-[11px] text-slate-400">
                          <ChevronRight className="w-3 h-3 flex-shrink-0 mt-0.5 text-slate-600"/>
                          {item}
                        </li>
                      ))}
                    </ul>
                    <div className={cn("rounded-lg p-3 border text-[10px] space-y-1", phase.border, phase.bg)}>
                      <div className={cn("font-bold mb-1", phase.color)}>Key metrics for {gpu.name}</div>
                      {phase.gpu_metrics.map(m=><div key={m} className="text-slate-500">{m}</div>)}
                    </div>
                  </div>
                </GlowCard>
              ))}
            </div>

            {/* Hardware spec comparison for NPI */}
            <GlowCard>
              <div className="p-5">
                <SectionHeader icon={<Cpu className="w-4 h-4"/>} title="Hardware NPI comparison matrix" sub="GPU-by-GPU technical spec for procurement & validation planning"/>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/[0.07]">
                        {["GPU","Arch","VRAM","HBM BW","FP16 TF","FP8 TF","NVLink BW","TDP","Ops:Byte","MIG"].map(h=>(
                          <th key={h} className="text-left py-2 pr-4 text-[10px] text-slate-600 uppercase tracking-wide font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {GPU_SPECS.map(g=>(
                        <tr key={g.id}
                          className={cn("border-b border-white/[0.04] cursor-pointer transition-all",
                            g.id===selGpuId?"bg-cyan-400/5":"hover:bg-white/[0.02]")}
                          onClick={()=>setSelGpuId(g.id)}>
                          <td className="py-2.5 pr-4 font-bold text-white">{g.name}</td>
                          <td className="py-2.5 pr-4 text-slate-500">{g.arch}</td>
                          <td className="py-2.5 pr-4 text-cyan-400 font-mono">{g.vram}GB {g.hbm}</td>
                          <td className="py-2.5 pr-4 text-violet-400 font-mono">{g.hbm_bw} GB/s</td>
                          <td className="py-2.5 pr-4 text-white font-mono">{g.tflops_fp16} TF</td>
                          <td className="py-2.5 pr-4 text-green-400 font-mono">{g.tflops_fp8 ? g.tflops_fp8+" TF" : "—"}</td>
                          <td className="py-2.5 pr-4 text-amber-400 font-mono">{g.nvlink_bw ? g.nvlink_bw+" GB/s" : "PCIe"}</td>
                          <td className="py-2.5 pr-4 text-red-400 font-mono">{g.tdp}W</td>
                          <td className="py-2.5 pr-4 text-slate-400 font-mono">{g.ops_per_byte}</td>
                          <td className="py-2.5 pr-4 text-slate-400">{g.mig_instances ? `×${g.mig_instances}` : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </GlowCard>
          </div>
        )}

        {/* FOOTER */}
        <footer className="border-t border-white/[0.05] pt-5 flex items-center justify-between flex-wrap gap-3 text-[11px] text-slate-600">
          <div>Pricing & specs: NVIDIA docs, provider public APIs · March 2026 · Kernels: <a href="https://huggingface.co/datasets/GPUMODE/kernelbot-data" className="hover:text-slate-400 underline" target="_blank">GPUMODE/kernelbot-data</a></div>
          <div className="flex gap-4">
            {[
              {h:"https://github.com/techstar9797/GPUMarketplace",l:"GitHub"},
              {h:"https://gpumode.com/leaderboard",l:"GPU MODE"},
              {h:"https://skypilot.co",l:"SkyPilot"},
              {h:"https://fluidstack.io",l:"FluidStack"},
            ].map(l=>(
              <a key={l.h} href={l.h} target="_blank" rel="noopener noreferrer"
                className="hover:text-slate-400 transition-colors flex items-center gap-1">
                {l.l} <ExternalLink className="w-3 h-3"/>
              </a>
            ))}
          </div>
        </footer>
      </div>
    </div>
  );
}
