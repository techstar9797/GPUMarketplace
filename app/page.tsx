"use client";

import { useState, useMemo } from "react";
import {
  Zap, Search, ExternalLink, Activity, DollarSign,
  Server, Sparkles, BarChart3, Shield, TrendingDown,
  Cpu, Network, Database, AlertTriangle,
  ChevronRight, Power, Clock, Layers, Leaf,
  ArrowUpDown, Filter, Info
} from "lucide-react";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { cn } from "@/lib/utils";
import { KernelFeed } from "@/components/kernel-feed";

// ─── GPU HARDWARE SPECS ───────────────────────────────────────────────────────
const GPU_SPECS: Record<string, {
  name: string; arch: string; vram: number; hbm: string;
  hbm_bw: number; tflops_fp16: number; tflops_fp8: number | null;
  nvlink_bw: number | null; tdp: number; ops_per_byte: number;
}> = {
  "h100-sxm": { name:"H100 SXM5",  arch:"Hopper",       vram:80,  hbm:"HBM3",   hbm_bw:3350, tflops_fp16:1979, tflops_fp8:3958, nvlink_bw:900, tdp:700, ops_per_byte:591 },
  "h100-pcie":{ name:"H100 PCIe",  arch:"Hopper",       vram:80,  hbm:"HBM3",   hbm_bw:2000, tflops_fp16:756,  tflops_fp8:1513, nvlink_bw:600, tdp:350, ops_per_byte:378 },
  "h200":     { name:"H200",       arch:"Hopper+",      vram:141, hbm:"HBM3e",  hbm_bw:4800, tflops_fp16:1979, tflops_fp8:3958, nvlink_bw:900, tdp:700, ops_per_byte:412 },
  "a100-80":  { name:"A100 80GB",  arch:"Ampere",       vram:80,  hbm:"HBM2e",  hbm_bw:2039, tflops_fp16:312,  tflops_fp8:null, nvlink_bw:600, tdp:400, ops_per_byte:153 },
  "a100-40":  { name:"A100 40GB",  arch:"Ampere",       vram:40,  hbm:"HBM2e",  hbm_bw:1555, tflops_fp16:312,  tflops_fp8:null, nvlink_bw:600, tdp:400, ops_per_byte:201 },
  "l40s":     { name:"L40S 48GB",  arch:"Ada Lovelace", vram:48,  hbm:"GDDR6",  hbm_bw:864,  tflops_fp16:362,  tflops_fp8:733,  nvlink_bw:null,tdp:350, ops_per_byte:419 },
  "rtx4090":  { name:"RTX 4090",   arch:"Ada Lovelace", vram:24,  hbm:"GDDR6X", hbm_bw:1008, tflops_fp16:82.6, tflops_fp8:null, nvlink_bw:null,tdp:450, ops_per_byte:82  },
  "a6000":    { name:"A6000 Ada",  arch:"Ada Lovelace", vram:48,  hbm:"GDDR6",  hbm_bw:864,  tflops_fp16:154,  tflops_fp8:null, nvlink_bw:null,tdp:300, ops_per_byte:178 },
};

// ─── NEOCLOUD + HYPERSCALER PROVIDER DATA ─────────────────────────────────────
// All pricing sourced from: IntuitionLabs H100 Rental Report Mar 2026, Saturn Cloud
// Neocloud Comparison Dec 2025, Northflank GPU comparison Aug 2025, provider pricing pages
const PROVIDERS = [
  // ── NEOCLOUDS ──
  {
    id:"coreweave", name:"CoreWeave",    logo:"CW", color:"#6366f1", tier:"neocloud",
    hq:"US", ib:true, egress_free:true, sla:true, green:false,
    focus:"HPC/Enterprise, largest H100 inventory, Kubernetes-native, InfiniBand",
    gpus:[
      { gpu:"h100-sxm",  od:6.16, spot:null,  note:"8×HGX node ÷8; IB interconnect" },
      { gpu:"h100-pcie", od:4.76, spot:null,  note:"PCIe variant" },
      { gpu:"a100-80",   od:2.21, spot:null,  note:"NVLink" },
      { gpu:"a100-40",   od:2.06, spot:null,  note:"PCIe" },
    ],
  },
  {
    id:"lambda", name:"Lambda Labs",   logo:"LL", color:"#ec4899", tier:"neocloud",
    hq:"US", ib:true, egress_free:true, sla:true, green:false,
    focus:"AI Dev Cloud, one-click clusters, NVIDIA investor, academic discount",
    gpus:[
      { gpu:"h100-sxm",  od:2.99, spot:null,  note:"SXM NVL3 node" },
      { gpu:"h100-pcie", od:2.49, spot:null,  note:"" },
      { gpu:"a100-80",   od:1.99, spot:null,  note:"" },
      { gpu:"a100-40",   od:1.29, spot:null,  note:"" },
      { gpu:"a6000",     od:0.80, spot:null,  note:"" },
    ],
  },
  {
    id:"together", name:"Together AI",   logo:"TAI",color:"#f97316", tier:"neocloud",
    hq:"US", ib:true, egress_free:true, sla:true, green:false,
    focus:"Tri Dao kernels (FlashAttention), GB200/B200 clusters, serverless inference + raw GPU",
    gpus:[
      { gpu:"h100-sxm",  od:2.39, spot:1.76,  note:"on-demand; $1.76 reserved" },
      { gpu:"h200",      od:3.50, spot:2.80,  note:"" },
      { gpu:"a100-80",   od:1.65, spot:null,  note:"" },
    ],
  },
  {
    id:"crusoe", name:"Crusoe Energy",  logo:"CR", color:"#22c55e", tier:"neocloud",
    hq:"US", ib:true, egress_free:false, sla:true, green:true,
    focus:"100% renewable / stranded energy, H100/H200/B200, sustainable AI compute",
    gpus:[
      { gpu:"h100-sxm",  od:2.45, spot:1.65,  note:"renewable power" },
      { gpu:"h200",      od:3.20, spot:2.10,  note:"" },
      { gpu:"a100-80",   od:1.65, spot:null,  note:"" },
    ],
  },
  {
    id:"fluidstack", name:"FluidStack",   logo:"FS", color:"#06b6d4", tier:"neocloud",
    hq:"UK/US", ib:true, egress_free:true, sla:true, green:true,
    focus:"Wholesale + marketplace, 62% enterprise contracts, SkyPilot-integrated, global DC footprint",
    gpus:[
      { gpu:"h100-sxm",  od:2.25, spot:1.35,  note:"direct + marketplace" },
      { gpu:"h100-pcie", od:1.99, spot:1.20,  note:"" },
      { gpu:"a100-80",   od:1.49, spot:0.90,  note:"" },
      { gpu:"a100-40",   od:1.29, spot:0.75,  note:"" },
    ],
  },
  {
    id:"vastai", name:"Vast.ai",       logo:"VA", color:"#a78bfa", tier:"marketplace",
    hq:"US", ib:false, egress_free:false, sla:false, green:false,
    focus:"Peer-to-peer GPU marketplace, lowest prices, variable reliability, no SLA",
    gpus:[
      { gpu:"h100-sxm",  od:1.87, spot:1.49,  note:"marketplace low; varies" },
      { gpu:"h100-pcie", od:1.55, spot:1.10,  note:"" },
      { gpu:"a100-80",   od:0.79, spot:0.67,  note:"" },
      { gpu:"a100-40",   od:0.52, spot:null,  note:"" },
      { gpu:"rtx4090",   od:0.35, spot:0.22,  note:"" },
    ],
  },
  {
    id:"runpod", name:"RunPod",        logo:"RP", color:"#f43f5e", tier:"neocloud",
    hq:"US", ib:false, egress_free:true, sla:false, green:false,
    focus:"AI-first, per-second billing, serverless, 30+ regions, 200ms cold start",
    gpus:[
      { gpu:"h100-sxm",  od:2.39, spot:1.99,  note:"secure cloud" },
      { gpu:"h100-pcie", od:1.99, spot:1.69,  note:"community cloud" },
      { gpu:"a100-80",   od:1.19, spot:0.79,  note:"community cloud" },
      { gpu:"a100-40",   od:0.60, spot:null,  note:"" },
      { gpu:"rtx4090",   od:0.34, spot:0.27,  note:"" },
    ],
  },
  {
    id:"paperspace", name:"Paperspace",    logo:"PS", color:"#eab308", tier:"neocloud",
    hq:"US (DigitalOcean)", ib:false, egress_free:true, sla:true, green:false,
    focus:"DigitalOcean subsidiary, Gradient notebooks, developer UX, NY/CA/AMS regions",
    gpus:[
      { gpu:"h100-sxm",  od:5.95, spot:null,  note:"dedicated VM" },
      { gpu:"a100-80",   od:3.09, spot:1.15,  note:"$1.15 on 36mo commitment" },
      { gpu:"a100-40",   od:2.30, spot:null,  note:"" },
    ],
  },
  // ── HYPERSCALERS ──
  {
    id:"aws", name:"AWS",            logo:"AWS",color:"#f59e0b", tier:"hyperscaler",
    hq:"US (global)", ib:false, egress_free:false, sla:true, green:false,
    focus:"p5 instances, spot capacity blocks, SageMaker, enterprise SLA, global regions",
    gpus:[
      { gpu:"h100-sxm",  od:3.90, spot:2.50,  note:"p5 per-GPU; 44% cut Jun 2025" },
      { gpu:"a100-80",   od:4.10, spot:1.23,  note:"p4d per-GPU" },
      { gpu:"l40s",      od:2.22, spot:0.67,  note:"g6e" },
    ],
  },
  {
    id:"gcp", name:"Google Cloud",  logo:"GCP",color:"#3b82f6", tier:"hyperscaler",
    hq:"US (global)", ib:false, egress_free:false, sla:true, green:true,
    focus:"A3 instances, TPU v4/v5, carbon-neutral, committed use discounts",
    gpus:[
      { gpu:"h100-sxm",  od:3.00, spot:1.71,  note:"a3-highgpu per-GPU; price cut 2025" },
      { gpu:"a100-80",   od:5.70, spot:1.71,  note:"a2-ultra" },
    ],
  },
  {
    id:"azure", name:"Azure",          logo:"AZ", color:"#8b5cf6", tier:"hyperscaler",
    hq:"US (global)", ib:false, egress_free:false, sla:true, green:false,
    focus:"NC H100 v5, enterprise integration, Azure OpenAI, NDv5 series",
    gpus:[
      { gpu:"h100-sxm",  od:6.98, spot:4.02,  note:"NC80adis H100 v5 East US" },
      { gpu:"a100-80",   od:4.10, spot:1.23,  note:"NDasrA100 v4" },
      { gpu:"l40s",      od:3.40, spot:1.02,  note:"NC80adis A10 v4" },
    ],
  },
  {
    id:"nebius", name:"Nebius",         logo:"NB", color:"#10b981", tier:"neocloud",
    hq:"EU (Amsterdam)", ib:true, egress_free:true, sla:true, green:true,
    focus:"Ex-Yandex Cloud, EU data sovereignty, cheapest H100 in EU, renewable energy",
    gpus:[
      { gpu:"h100-sxm",  od:2.95, spot:null,  note:"EU cheapest H100" },
      { gpu:"h200",      od:3.20, spot:null,  note:"NVL 94GB" },
      { gpu:"a100-80",   od:1.85, spot:null,  note:"" },
    ],
  },
];

// ─── PROVIDER TIER LABELS ─────────────────────────────────────────────────────
const TIER_STYLE: Record<string,{label:string;color:string;bg:string;border:string}> = {
  neocloud:    { label:"Neocloud",    color:"text-cyan-400",   bg:"bg-cyan-400/10",    border:"border-cyan-400/20"    },
  marketplace: { label:"Marketplace", color:"text-violet-400", bg:"bg-violet-400/10", border:"border-violet-400/20"   },
  hyperscaler: { label:"Hyperscaler", color:"text-amber-400",  bg:"bg-amber-400/10",  border:"border-amber-400/20"    },
};

// ─── GPU KERNELS ──────────────────────────────────────────────────────────────
const KERNELS = [
  { rank:1, name:"FlashAttention-3",      op:"Attention",     speedup:4.2, tag:"triton", author:"Tri Dao / Together" },
  { rank:2, name:"cuda.compute Sort",     op:"Radix Sort",    speedup:3.8, tag:"python", author:"NVIDIA CCCL"       },
  { rank:3, name:"FP8 GEMM (MI300)",     op:"MatMul",        speedup:3.1, tag:"cuda",   author:"AMD kernelbot"     },
  { rank:4, name:"Fused LayerNorm+ReLU", op:"Normalization", speedup:2.9, tag:"triton", author:"GPU MODE community" },
  { rank:5, name:"Fused AdamW BF16",     op:"Optimizer",     speedup:1.9, tag:"triton", author:"GPU MODE community" },
];

const TAG_STYLE: Record<string,string> = {
  triton:"text-purple-400 bg-purple-400/10 border-purple-400/20",
  python:"text-green-400 bg-green-400/10 border-green-400/20",
  cuda:  "text-amber-400 bg-amber-400/10 border-amber-400/20",
};

// ─── 7-LAYER INFERENCE MODEL ──────────────────────────────────────────────────
const INF_LAYERS = [
  { id:1, name:"Model Load",      phase:"setup",   bound:"I/O",       icon:"🔌", metric:"PCIe BW",      desc:"Weights from CPU RAM → GPU HBM via PCIe. ~25 GB/s sustained on PCIe4 x16." },
  { id:2, name:"Tokenize",        phase:"setup",   bound:"CPU",       icon:"📝", metric:"CPU tput",     desc:"CPU-bound FSA tokenization. Bottleneck under high concurrency." },
  { id:3, name:"Prefill",         phase:"prefill", bound:"Compute",   icon:"⚡", metric:"TFLOPS",       desc:"Matrix-matrix multiply on all prompt tokens. Saturates Tensor Cores." },
  { id:4, name:"KV Alloc",        phase:"prefill", bound:"Memory",    icon:"💾", metric:"VRAM GB",      desc:"PagedAttention KV blocks. Grows as 2 × layers × kv_heads × head_dim × seq_len." },
  { id:5, name:"Decode Attn",     phase:"decode",  bound:"Memory BW", icon:"🔄", metric:"HBM BW GB/s",  desc:"Matrix-vector ops per token. Loads ALL weights + KV each step. BW-limited." },
  { id:6, name:"Multi-GPU Comm",  phase:"dist",    bound:"Network",   icon:"🌐", metric:"NVLink/IB BW", desc:"All-Reduce via NVLink 900 GB/s intra-node or IB 400Gb/s inter-node." },
  { id:7, name:"Sampling",        phase:"decode",  bound:"CPU/GPU",   icon:"🎯", metric:"Latency ms",   desc:"Softmax + top-p/k. Critical path for TTFT but small compute cost." },
];

const BOUND_COLORS: Record<string,string> = {
  "I/O":      "text-amber-400 bg-amber-400/10 border-amber-400/20",
  "CPU":      "text-orange-400 bg-orange-400/10 border-orange-400/20",
  "Compute":  "text-red-400 bg-red-400/10 border-red-400/20",
  "Memory":   "text-blue-400 bg-blue-400/10 border-blue-400/20",
  "Memory BW":"text-violet-400 bg-violet-400/10 border-violet-400/20",
  "Network":  "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
  "CPU/GPU":  "text-green-400 bg-green-400/10 border-green-400/20",
};

// ─── LLM MODELS ───────────────────────────────────────────────────────────────
const LLM_MODELS = [
  { name:"Llama 3.1 8B",    params:8,    layers:32,  hidden:4096,  kv_heads:8,  heads:32,  bytes:2 },
  { name:"Llama 3.1 70B",   params:70,   layers:80,  hidden:8192,  kv_heads:8,  heads:64,  bytes:2 },
  { name:"Llama 3.1 405B",  params:405,  layers:126, hidden:16384, kv_heads:16, heads:128, bytes:2 },
  { name:"DeepSeek-R1 67B", params:67,   layers:80,  hidden:8192,  kv_heads:8,  heads:64,  bytes:2 },
  { name:"Mixtral 8×7B",    params:46.7, layers:32,  hidden:4096,  kv_heads:8,  heads:32,  bytes:2 },
  { name:"GPT-3 175B",      params:175,  layers:96,  hidden:12288, kv_heads:96, heads:96,  bytes:2 },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function GlowCard({ children, className, selected }: { children: React.ReactNode; className?: string; selected?: boolean }) {
  return (
    <div className={cn("relative rounded-2xl border p-[2px] transition-all", selected ? "border-cyan-400/40":"border-white/[0.06] hover:border-white/[0.1]", className)}>
      <GlowingEffect spread={26} glow={selected} disabled={false} proximity={55} inactiveZone={0.01} borderWidth={selected?2:1} />
      <div className="relative rounded-[calc(1rem-2px)] bg-[#060d1a] h-full">{children}</div>
    </div>
  );
}

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded border", className)}>{children}</span>;
}

function SectionHdr({ icon, title, sub }: { icon: React.ReactNode; title: string; sub?: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.07] flex items-center justify-center text-slate-400 flex-shrink-0">{icon}</div>
      <div>
        <div className="text-sm font-bold text-white">{title}</div>
        {sub && <div className="text-[10px] text-slate-600 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

function Tab({ active, onClick, children }: { active:boolean; onClick:()=>void; children:React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={cn("px-4 py-2 text-xs font-medium rounded-lg transition-all whitespace-nowrap",
        active ? "bg-[#0c1422] text-cyan-400 border border-white/[0.08]":"text-slate-500 hover:text-slate-300")}>
      {children}
    </button>
  );
}

// ─── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function Page() {
  const [tab, setTab]           = useState<"market"|"workload"|"capacity"|"tco"|"npi">("market");
  const [selGpu, setSelGpu]     = useState("h100-sxm");
  const [selModel, setSelModel] = useState(1);
  const [selKernel, setSelKernel] = useState(0);
  const [selProvider, setSelProvider] = useState<string|null>(null);
  const [filterTier, setFilterTier]   = useState<string>("all");
  const [sortBy, setSortBy]           = useState<"od"|"speedup"|"tflops"|"vram">("od");
  const [searchQ, setSearchQ]         = useState("");
  const [batchSize, setBatchSize]     = useState(8);
  const [seqLen, setSeqLen]           = useState(2048);
  const [targetTps, setTargetTps]     = useState(1000);
  const [gpuCount, setGpuCount]       = useState(64);
  const [pue, setPue]                 = useState(1.3);
  const [util, setUtil]               = useState(70);
  const [months, setMonths]           = useState(12);
  const [budget, setBudget]           = useState(5000);

  const gpuSpec  = GPU_SPECS[selGpu];
  const model    = LLM_MODELS[selModel];
  const kernel   = KERNELS[selKernel];

  // Flat list of all GPU offerings for the market view
  const allOfferings = useMemo(() => {
    const rows: {
      providerId: string; providerName: string; logo: string; color: string;
      tier: string; gpu: string; gpuSpec: typeof GPU_SPECS[string];
      od: number; spot: number|null; note: string;
      ib: boolean; egress_free: boolean; green: boolean; sla: boolean;
    }[] = [];
    PROVIDERS.forEach(p => {
      p.gpus.forEach(g => {
        const spec = GPU_SPECS[g.gpu];
        if (!spec) return;
        rows.push({
          providerId: p.id, providerName: p.name, logo: p.logo, color: p.color,
          tier: p.tier, gpu: g.gpu, gpuSpec: spec,
          od: g.od, spot: g.spot, note: g.note,
          ib: p.ib, egress_free: p.egress_free, green: p.green, sla: p.sla,
        });
      });
    });
    return rows
      .filter(r =>
        (filterTier === "all" || r.tier === filterTier) &&
        (!searchQ || r.providerName.toLowerCase().includes(searchQ.toLowerCase()) ||
         r.gpuSpec.name.toLowerCase().includes(searchQ.toLowerCase()))
      )
      .sort((a,b) => {
        if (sortBy === "od")      return a.od - b.od;
        if (sortBy === "speedup") return b.od - a.od; // costliest = least speedup value
        if (sortBy === "tflops")  return b.gpuSpec.tflops_fp16 - a.gpuSpec.tflops_fp16;
        if (sortBy === "vram")    return b.gpuSpec.vram - a.gpuSpec.vram;
        return a.od - b.od;
      });
  }, [filterTier, searchQ, sortBy]);

  // Best price for selected GPU
  const bestOd   = useMemo(() => Math.min(...allOfferings.filter(r=>r.gpu===selGpu).map(r=>r.od)), [allOfferings, selGpu]);
  const bestSpot = useMemo(() => {
    const spots = allOfferings.filter(r=>r.gpu===selGpu&&r.spot!==null).map(r=>r.spot as number);
    return spots.length ? Math.min(...spots) : null;
  }, [allOfferings, selGpu]);

  // Workload calcs
  const wGb    = model.params * model.bytes;
  const kvGb   = 2 * model.layers * model.kv_heads * (model.hidden/model.heads) * seqLen * batchSize * model.bytes / 1e9;
  const totVram= wGb + kvGb;
  const arith  = (2 * model.params * 1e9 * batchSize) / (model.params * 1e9 * model.bytes);
  const bottleneck = arith < gpuSpec.ops_per_byte * 0.5 ? "Memory BW" : arith < gpuSpec.ops_per_byte ? "Transitioning" : "Compute";
  const minGpus = Math.ceil(wGb / (gpuSpec.vram * 0.75));

  // TCO
  const tco = useMemo(() => {
    const compute = gpuCount * bestOd * 24 * 30 * months * (util/100);
    const power   = gpuCount * (gpuSpec.tdp/1000) * pue * 24 * 30 * months * 0.07;
    const net     = compute * 0.08;
    const stor    = compute * 0.05;
    const total   = compute + power + net + stor;
    const opt     = total / (3.8 * kernel.speedup); // SkyPilot spot × kernel
    return { compute, power, net, stor, total, opt, power_kw: gpuCount*(gpuSpec.tdp/1000)*pue };
  }, [gpuCount, bestOd, months, util, gpuSpec, pue, kernel.speedup]);

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 selection:bg-cyan-400/20">
      {/* ambient */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/3 w-[700px] h-[500px] rounded-full bg-cyan-500/[0.025] blur-[140px]" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[500px] rounded-full bg-violet-500/[0.03] blur-[140px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:48px_48px]" />
      </div>

      <div className="relative z-10 max-w-[1380px] mx-auto px-5 py-7 space-y-5">

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
                  <Badge className="bg-violet-500/15 text-violet-400 border-violet-500/25">FLUIDSTACK · GTC26</Badge>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">12 Providers · Neoclouds + Hyperscalers · Capacity Planning · TCO · NPI</p>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white leading-tight tracking-tight max-w-2xl">
              GPU compute intelligence for<br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-400">every stage of AI infrastructure.</span>
            </h1>
            <p className="text-slate-500 text-xs mt-2 max-w-xl leading-relaxed">
              Compare 12 providers — neoclouds, marketplaces, hyperscalers. Model workload bottlenecks, compute TCO, plan cluster capacity with GPU MODE kernel savings.
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            {[
              {d:"bg-green-400",  t:`${PROVIDERS.length} providers · ${allOfferings.length} GPU configs`},
              {d:"bg-cyan-400",   t:"GPUMODE/kernelbot-data · polls every 5 min"},
              {d:"bg-violet-400", t:"7-layer inference · roofline analysis"},
              {d:"bg-amber-400",  t:"TCO · PUE · power · NPI phases"},
            ].map(p=>(
              <div key={p.t} className="flex items-center gap-2 text-[11px] text-slate-400 bg-white/[0.02] border border-white/[0.05] rounded-full px-3 py-1">
                <span className={`w-1.5 h-1.5 rounded-full ${p.d} animate-pulse flex-shrink-0`} />{p.t}
              </div>
            ))}
          </div>
        </header>

        {/* ── GPU QUICK-SELECT ── */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {Object.entries(GPU_SPECS).map(([id,g]) => (
            <button key={id} onClick={()=>setSelGpu(id)}
              className={cn("flex-shrink-0 px-3 py-2 rounded-xl border text-xs font-medium transition-all",
                selGpu===id ? "bg-cyan-400/10 border-cyan-400/40 text-cyan-400":"bg-white/[0.03] border-white/[0.07] text-slate-400 hover:border-white/[0.12]")}>
              <div className="font-bold">{g.name}</div>
              <div className="text-[9px] opacity-60 mt-0.5">{g.vram}GB · {g.hbm_bw}GB/s BW</div>
            </button>
          ))}
        </div>

        {/* ── STAT STRIP ── */}
        <ul className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            {icon:<DollarSign className="w-3.5 h-3.5"/>, l:"Best on-demand",  v:bestOd < Infinity ? `$${bestOd.toFixed(2)}` : "—",   c:"text-green-400",  s:gpuSpec.name},
            {icon:<TrendingDown className="w-3.5 h-3.5"/>,l:"Best spot",      v:bestSpot!==null ? `$${bestSpot.toFixed(2)}` : "N/A", c:"text-cyan-400",   s:"preemptible"},
            {icon:<Cpu className="w-3.5 h-3.5"/>,         l:"FP16 TFLOPS",   v:`${gpuSpec.tflops_fp16}`,                              c:"text-violet-400", s:gpuSpec.name},
            {icon:<Database className="w-3.5 h-3.5"/>,    l:"HBM bandwidth", v:`${gpuSpec.hbm_bw} GB/s`,                             c:"text-amber-400",  s:`${gpuSpec.hbm}·${gpuSpec.vram}GB`},
            {icon:<Network className="w-3.5 h-3.5"/>,     l:"NVLink BW",     v:gpuSpec.nvlink_bw?`${gpuSpec.nvlink_bw} GB/s`:"PCIe", c:"text-red-400",    s:"intra-node"},
          ].map(s=>(
            <li key={s.l} className="relative min-h-[6rem] list-none">
              <GlowCard>
                <div className="p-4 flex flex-col justify-between h-full min-h-[6rem]">
                  <div className="flex items-center gap-1.5 text-slate-600">{s.icon}<span className="text-[9px] tracking-widest uppercase">{s.l}</span></div>
                  <div>
                    <div className={`text-xl font-bold font-mono ${s.c}`}>{s.v}</div>
                    <div className="text-[9px] text-slate-600 mt-0.5">{s.s}</div>
                  </div>
                </div>
              </GlowCard>
            </li>
          ))}
        </ul>

        {/* ── TABS ── */}
        <div className="flex bg-[#060d1a] border border-white/[0.07] rounded-xl p-1 gap-1 overflow-x-auto">
          {[
            {id:"market",   l:"🏪 GPU Marketplace"},
            {id:"workload", l:"🔬 Workload Analysis"},
            {id:"capacity", l:"🏗 Capacity Planning"},
            {id:"tco",      l:"💰 TCO & Power"},
            {id:"npi",      l:"🚀 NPI Intelligence"},
          ].map(t=><Tab key={t.id} active={tab===t.id} onClick={()=>setTab(t.id as typeof tab)}>{t.l}</Tab>)}
        </div>

        {/* ══ TAB: MARKET ══════════════════════════════════════════════════════ */}
        {tab === "market" && (
          <div className="space-y-4">
            {/* toolbar */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
                <input className="w-full bg-white/[0.04] border border-white/[0.07] rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-400/40 transition-colors"
                  placeholder="Search provider or GPU model..." value={searchQ} onChange={e=>setSearchQ(e.target.value)} />
              </div>
              <select value={filterTier} onChange={e=>setFilterTier(e.target.value)}
                className="bg-white/[0.04] border border-white/[0.07] rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-400/40 cursor-pointer">
                <option value="all" className="bg-[#060d1a]">All tiers</option>
                <option value="neocloud" className="bg-[#060d1a]">Neoclouds</option>
                <option value="marketplace" className="bg-[#060d1a]">Marketplace</option>
                <option value="hyperscaler" className="bg-[#060d1a]">Hyperscalers</option>
              </select>
              <select value={sortBy} onChange={e=>setSortBy(e.target.value as typeof sortBy)}
                className="bg-white/[0.04] border border-white/[0.07] rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-400/40 cursor-pointer">
                <option value="od" className="bg-[#060d1a]">↕ On-demand price</option>
                <option value="tflops" className="bg-[#060d1a]">↕ TFLOPS</option>
                <option value="vram" className="bg-[#060d1a]">↕ VRAM</option>
              </select>
            </div>
            <div className="flex justify-between text-[10px] text-slate-600">
              <span>{allOfferings.length} GPU configurations · {new Set(allOfferings.map(r=>r.providerId)).size} providers</span>
              <span>Prices per GPU/hr · March 2026 · Sources: IntuitionLabs, Saturn Cloud, provider pages</span>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {allOfferings.map((r,i) => {
                const tierStyle = TIER_STYLE[r.tier];
                const effPrice  = (r.spot ?? r.od) / kernel.speedup;
                const saving    = Math.round((1 - effPrice/r.od)*100);
                const isSel     = selProvider===r.providerId && selGpu===r.gpu;
                return (
                  <GlowCard key={`${r.providerId}-${r.gpu}-${i}`} selected={isSel} className="cursor-pointer">
                    <div className="p-4" onClick={()=>{setSelProvider(isSel?null:r.providerId); setSelGpu(r.gpu);}}>
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-lg text-[9px] font-bold flex items-center justify-center flex-shrink-0"
                            style={{background:`${r.color}18`,border:`1px solid ${r.color}33`,color:r.color}}>{r.logo}</div>
                          <div className="min-w-0">
                            <div className="text-[10px] text-slate-500">{r.providerName}</div>
                            <div className="text-xs font-semibold text-white truncate">{r.gpuSpec.name}</div>
                          </div>
                        </div>
                        <Badge className={cn(tierStyle.bg, tierStyle.color, tierStyle.border)}>{tierStyle.label}</Badge>
                      </div>

                      {/* Spec chips */}
                      <div className="grid grid-cols-3 gap-1 mb-3">
                        {[
                          {l:"VRAM",   v:`${r.gpuSpec.vram}GB`},
                          {l:"TFLOPS", v:`${r.gpuSpec.tflops_fp16}`},
                          {l:"HBM BW", v:`${r.gpuSpec.hbm_bw}`},
                        ].map(s=>(
                          <div key={s.l} className="bg-white/[0.03] rounded-lg p-1.5 text-center">
                            <div className="text-[8px] text-slate-600">{s.l}</div>
                            <div className="text-[10px] font-bold text-white">{s.v}</div>
                          </div>
                        ))}
                      </div>

                      {/* Feature badges */}
                      <div className="flex gap-1 flex-wrap mb-3">
                        {r.ib          && <Badge className="text-cyan-400 bg-cyan-400/10 border-cyan-400/20">IB</Badge>}
                        {r.egress_free && <Badge className="text-green-400 bg-green-400/10 border-green-400/20">no egress</Badge>}
                        {r.green       && <Badge className="text-emerald-400 bg-emerald-400/10 border-emerald-400/20">🌱 green</Badge>}
                        {r.sla         && <Badge className="text-slate-400 bg-slate-400/10 border-slate-400/20">SLA</Badge>}
                        {r.spot!==null && <Badge className="text-amber-400 bg-amber-400/10 border-amber-400/20">spot</Badge>}
                      </div>

                      {/* Pricing */}
                      <div className="space-y-1.5 border-t border-white/[0.05] pt-3">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-slate-500">On-demand</span>
                          <span className="text-sm font-bold text-white font-mono">${r.od.toFixed(2)}<span className="text-slate-600 text-[9px]">/hr</span></span>
                        </div>
                        {r.spot!==null && (
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-slate-500">Spot</span>
                            <span className="text-sm font-bold text-green-400 font-mono">${r.spot.toFixed(2)}<span className="text-slate-600 text-[9px]">/hr</span></span>
                          </div>
                        )}
                        {r.note && <div className="text-[9px] text-slate-600">{r.note}</div>}
                        <div className="flex justify-between items-center bg-cyan-400/5 border border-cyan-400/10 rounded-lg px-2 py-1.5">
                          <span className="text-[9px] text-cyan-400">+ {kernel.name.split(" ")[0]}</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-cyan-400 font-mono">${effPrice.toFixed(2)}/hr</span>
                            <span className="text-[8px] font-bold text-green-400 bg-green-400/10 px-1 py-0.5 rounded-full">−{saving}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </GlowCard>
                );
              })}
            </div>

            {/* Provider comparison table */}
            <GlowCard>
              <div className="p-5">
                <SectionHdr icon={<ArrowUpDown className="w-4 h-4"/>} title="Provider comparison — H100 SXM5 spotlight" sub="All providers offering H100 SXM · March 2026 pricing"/>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/[0.07]">
                        {["Provider","Tier","On-demand","Spot","IB","Egress","Green","SLA","Focus"].map(h=>(
                          <th key={h} className="text-left py-2 pr-4 text-[9px] text-slate-600 uppercase tracking-wide font-medium whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {PROVIDERS.map(p => {
                        const h100 = p.gpus.find(g=>g.gpu==="h100-sxm");
                        if (!h100) return null;
                        const tierStyle = TIER_STYLE[p.tier];
                        return (
                          <tr key={p.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-all">
                            <td className="py-2.5 pr-4">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded text-[8px] font-bold flex items-center justify-center flex-shrink-0"
                                  style={{background:`${p.color}18`,color:p.color}}>{p.logo}</div>
                                <span className="font-semibold text-white">{p.name}</span>
                              </div>
                            </td>
                            <td className="py-2.5 pr-4"><Badge className={cn(tierStyle.bg,tierStyle.color,tierStyle.border)}>{tierStyle.label}</Badge></td>
                            <td className="py-2.5 pr-4 font-bold text-white font-mono">${h100.od.toFixed(2)}</td>
                            <td className="py-2.5 pr-4 font-bold font-mono">{h100.spot ? <span className="text-green-400">${h100.spot.toFixed(2)}</span> : <span className="text-slate-600">—</span>}</td>
                            <td className="py-2.5 pr-4">{p.ib ? <span className="text-cyan-400">✓</span> : <span className="text-slate-600">✗</span>}</td>
                            <td className="py-2.5 pr-4">{p.egress_free ? <span className="text-green-400">free</span> : <span className="text-slate-600">paid</span>}</td>
                            <td className="py-2.5 pr-4">{p.green ? <span className="text-emerald-400">🌱</span> : <span className="text-slate-600">—</span>}</td>
                            <td className="py-2.5 pr-4">{p.sla ? <span className="text-green-400">✓</span> : <span className="text-slate-600">—</span>}</td>
                            <td className="py-2.5 pr-4 text-slate-400 text-[9px] max-w-[200px] truncate">{p.focus}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </GlowCard>
          </div>
        )}

        {/* ══ TAB: WORKLOAD ════════════════════════════════════════════════════ */}
        {tab === "workload" && (
          <div className="grid grid-cols-1 xl:grid-cols-[260px_1fr] gap-5">
            <div className="space-y-4">
              <GlowCard>
                <div className="p-5 space-y-3">
                  <SectionHdr icon={<Cpu className="w-4 h-4"/>} title="Model" sub="Select LLM"/>
                  {LLM_MODELS.map((m,i)=>(
                    <button key={m.name} onClick={()=>setSelModel(i)}
                      className={cn("w-full text-left px-3 py-2.5 rounded-xl border text-xs transition-all",
                        i===selModel?"bg-cyan-400/8 border-cyan-400/30 text-white":"bg-white/[0.02] border-white/[0.05] text-slate-400 hover:border-white/[0.1]")}>
                      <div className="font-bold">{m.name}</div>
                      <div className="text-[9px] opacity-60">{m.params}B params · {m.layers} layers</div>
                    </button>
                  ))}
                  <div className="space-y-3 pt-2 border-t border-white/[0.05]">
                    {[
                      {l:"Batch size",  v:batchSize, set:setBatchSize, min:1,   max:128,  step:1},
                      {l:"Seq length",  v:seqLen,    set:setSeqLen,    min:512, max:32768,step:512},
                    ].map(s=>(
                      <div key={s.l}>
                        <div className="flex justify-between text-xs mb-1"><span className="text-slate-500">{s.l}</span><span className="font-mono text-white">{s.v.toLocaleString()}</span></div>
                        <input type="range" min={s.min} max={s.max} step={s.step} value={s.v} onChange={e=>s.set(Number(e.target.value))} className="w-full accent-cyan-400"/>
                      </div>
                    ))}
                  </div>
                </div>
              </GlowCard>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  {l:"Model weights",  v:`${wGb.toFixed(1)} GB`,       c:"text-cyan-400"},
                  {l:"KV cache",       v:`${kvGb.toFixed(1)} GB`,       c:"text-violet-400"},
                  {l:"Total VRAM",     v:`${totVram.toFixed(1)} GB`,    c:totVram>gpuSpec.vram?"text-red-400":"text-green-400"},
                  {l:"Min GPUs",       v:String(minGpus),               c:"text-amber-400"},
                ].map(s=>(
                  <GlowCard key={s.l}><div className="p-4">
                    <div className="text-[9px] text-slate-600 uppercase tracking-wide mb-1">{s.l}</div>
                    <div className={`text-xl font-bold font-mono ${s.c}`}>{s.v}</div>
                  </div></GlowCard>
                ))}
              </div>

              <GlowCard>
                <div className="p-5">
                  <SectionHdr icon={<Activity className="w-4 h-4"/>} title="Roofline analysis" sub={`${model.name} · ${gpuSpec.name} · batch=${batchSize}`}/>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      {[
                        {l:"GPU ops:byte ceiling", v:`${gpuSpec.ops_per_byte}`, u:"ops/B", c:"text-cyan-400"},
                        {l:"Workload arithmetic intensity", v:arith.toFixed(1), u:"ops/B", c:arith<gpuSpec.ops_per_byte?"text-red-400":"text-green-400"},
                        {l:"Bottleneck classification", v:bottleneck, u:"", c:bottleneck==="Compute"?"text-red-400":bottleneck==="Memory BW"?"text-violet-400":"text-amber-400"},
                        {l:"Est. MFU (decode)", v:`~${Math.round(Math.min(arith/gpuSpec.ops_per_byte,1)*40+10)}%`, u:"", c:"text-green-400"},
                        {l:"Est. MBU (decode)", v:`~${bottleneck==="Memory BW"?75:45}%`, u:"", c:"text-violet-400"},
                      ].map(r=>(
                        <div key={r.l} className="flex justify-between py-2 border-b border-white/[0.04]">
                          <span className="text-xs text-slate-400">{r.l}</span>
                          <span className={`text-sm font-bold font-mono ${r.c}`}>{r.v}<span className="text-slate-600 text-[9px] ml-0.5">{r.u}</span></span>
                        </div>
                      ))}
                    </div>
                    <div className={cn("rounded-xl border p-4 text-[11px]", bottleneck==="Memory BW"?"bg-violet-400/5 border-violet-400/20":"bg-red-400/5 border-red-400/20")}>
                      <div className={cn("font-bold mb-2", bottleneck==="Memory BW"?"text-violet-400":"text-red-400")}>
                        {bottleneck==="Memory BW"?"⚠️ Memory-bandwidth bound":bottleneck==="Compute"?"✅ Compute bound":"🔄 Near ridge point"}
                      </div>
                      <p className="text-slate-400 leading-relaxed">
                        {bottleneck==="Memory BW"
                          ?`Arithmetic intensity (${arith.toFixed(1)} ops/B) < GPU ceiling (${gpuSpec.ops_per_byte} ops/B). Decode is BW-limited — every token loads all ${wGb.toFixed(0)} GB of weights. Fix: increase batch to ${Math.ceil(gpuSpec.ops_per_byte*model.params*model.bytes/(2*model.params*1e0))} or apply FlashAttention-3 to reduce HBM pressure.`
                          :`Workload saturates Tensor Cores (${gpuSpec.tflops_fp16} TFLOPS). MFU is healthy. Consider FP8 kernels (${gpuSpec.tflops_fp8||"N/A"} TF FP8) for further gains.`}
                      </p>
                    </div>
                  </div>
                </div>
              </GlowCard>

              {/* 7-layer grid */}
              <GlowCard>
                <div className="p-5">
                  <SectionHdr icon={<Layers className="w-4 h-4"/>} title="7-layer inference profile" sub="Phase-by-phase bottleneck classification"/>
                  <div className="grid grid-cols-7 gap-1.5">
                    {INF_LAYERS.map(l=>{
                      const hot = l.bound==="Memory BW"||(l.bound==="Compute"&&bottleneck==="Compute");
                      return (
                        <div key={l.id} className={cn("rounded-xl p-2.5 border text-center",hot?"bg-red-400/8 border-red-400/20":"bg-white/[0.02] border-white/[0.05]")}>
                          <div className="text-lg mb-1">{l.icon}</div>
                          <div className="text-[9px] font-bold text-white">{l.name}</div>
                          <Badge className={cn("mt-1 text-[7px]",BOUND_COLORS[l.bound])}>{l.bound}</Badge>
                          {hot&&<div className="text-[7px] text-red-400 mt-1 font-bold">HOT</div>}
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                    {INF_LAYERS.map(l=>(
                      <div key={l.id} className="flex items-start gap-2 text-[10px] text-slate-500">
                        <span className="flex-shrink-0">{l.icon}</span>
                        <span><strong className="text-slate-300">{l.id}. {l.name}</strong> — {l.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </GlowCard>
            </div>
          </div>
        )}

        {/* ══ TAB: CAPACITY ════════════════════════════════════════════════════ */}
        {tab === "capacity" && (
          <div className="grid grid-cols-1 xl:grid-cols-[260px_1fr] gap-5">
            <GlowCard>
              <div className="p-5 space-y-3">
                <SectionHdr icon={<BarChart3 className="w-4 h-4"/>} title="Capacity inputs"/>
                {[
                  {l:"Target tok/s",  v:targetTps, set:setTargetTps, min:100,max:100000,step:100,fmt:(v:number)=>v.toLocaleString()},
                  {l:"Batch size",    v:batchSize, set:setBatchSize, min:1,  max:256,   step:1,  fmt:(v:number)=>String(v)},
                  {l:"Seq length",    v:seqLen,    set:setSeqLen,    min:512,max:32768, step:512,fmt:(v:number)=>v.toLocaleString()},
                ].map(s=>(
                  <div key={s.l}>
                    <div className="flex justify-between text-xs mb-1"><span className="text-slate-500">{s.l}</span><span className="font-mono text-white">{s.fmt(s.v)}</span></div>
                    <input type="range" min={s.min} max={s.max} step={s.step} value={s.v} onChange={e=>s.set(Number(e.target.value))} className="w-full accent-cyan-400"/>
                  </div>
                ))}
                <div className="pt-2 border-t border-white/[0.05]">
                  <div className="text-[10px] text-slate-600 mb-2 uppercase tracking-wide">Model</div>
                  <select value={selModel} onChange={e=>setSelModel(Number(e.target.value))}
                    className="w-full bg-white/[0.04] border border-white/[0.07] rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none">
                    {LLM_MODELS.map((m,i)=><option key={m.name} value={i} className="bg-[#060d1a]">{m.name}</option>)}
                  </select>
                </div>
              </div>
            </GlowCard>

            <div className="space-y-4">
              {(() => {
                const tpsPerGpu = Math.round(batchSize / (model.params*model.bytes*1e9 / (gpuSpec.hbm_bw*1e9)));
                const gpusNeeded = Math.max(Math.ceil(targetTps / (tpsPerGpu||1)), minGpus);
                const nodes = Math.ceil(gpusNeeded/8);
                const tp = Math.min(8,minGpus); const pp = Math.max(1,Math.ceil(minGpus/8));
                const dp = Math.max(1,Math.ceil(gpusNeeded/Math.max(minGpus,1)));
                return (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        {l:"GPUs needed",  v:String(gpusNeeded),         c:"text-amber-400"},
                        {l:"TPS per GPU",  v:tpsPerGpu.toLocaleString(), c:"text-cyan-400"},
                        {l:"8-GPU nodes",  v:String(nodes),              c:"text-violet-400"},
                        {l:"Min for model",v:`${minGpus} GPUs`,          c:"text-green-400"},
                      ].map(s=>(
                        <GlowCard key={s.l}><div className="p-4">
                          <div className="text-[9px] text-slate-600 uppercase tracking-wide mb-1">{s.l}</div>
                          <div className={`text-xl font-bold font-mono ${s.c}`}>{s.v}</div>
                        </div></GlowCard>
                      ))}
                    </div>
                    <GlowCard>
                      <div className="p-5">
                        <SectionHdr icon={<Server className="w-4 h-4"/>} title="Topology recommendation"/>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div className="space-y-2">
                            {[
                              {l:"Tensor Parallelism",  v:`TP=${tp}`,  note:"Within 8-GPU node via NVLink. TP>8 → IB bottleneck.", c:"text-cyan-400"},
                              {l:"Pipeline Parallelism",v:`PP=${pp}`,  note:"Across nodes via InfiniBand. For models >8 GPUs.", c:"text-violet-400"},
                              {l:"Data Parallelism",    v:`DP=${dp}`,  note:"Replica count for throughput scaling.", c:"text-green-400"},
                              {l:"Model replicas",      v:String(dp),  note:`${minGpus} GPUs/model × ${dp} replicas = ${gpusNeeded} total`, c:"text-amber-400"},
                            ].map(r=>(
                              <div key={r.l} className="py-2 border-b border-white/[0.04]">
                                <div className="flex justify-between"><span className="text-xs text-slate-400">{r.l}</span><span className={`text-sm font-bold font-mono ${r.c}`}>{r.v}</span></div>
                                <div className="text-[9px] text-slate-600 mt-0.5">{r.note}</div>
                              </div>
                            ))}
                          </div>
                          <div className="bg-white/[0.02] rounded-xl p-4 border border-white/[0.05]">
                            <div className="text-xs font-bold text-slate-400 mb-3">Monthly cost at {gpusNeeded} GPUs — all providers</div>
                            {PROVIDERS.filter(p=>p.gpus.some(g=>g.gpu==="h100-sxm")).map(p=>{
                              const g = p.gpus.find(g=>g.gpu==="h100-sxm")!;
                              const mo = gpusNeeded * g.od * 24 * 30;
                              const sp = g.spot ? gpusNeeded * g.spot * 24 * 30 : null;
                              const ts = TIER_STYLE[p.tier];
                              return (
                                <div key={p.id} className="flex items-center justify-between py-1.5 border-b border-white/[0.04]">
                                  <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 rounded text-[8px] font-bold flex items-center justify-center flex-shrink-0" style={{background:`${p.color}18`,color:p.color}}>{p.logo}</div>
                                    <div>
                                      <span className="text-xs text-slate-400">{p.name}</span>
                                      <Badge className={cn("ml-1 text-[7px]",ts.bg,ts.color,ts.border)}>{ts.label}</Badge>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-xs font-bold text-white font-mono">${Math.round(mo/1000)}k/mo</div>
                                    {sp&&<div className="text-[9px] text-green-400">${Math.round(sp/1000)}k spot</div>}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </GlowCard>
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* ══ TAB: TCO ═════════════════════════════════════════════════════════ */}
        {tab === "tco" && (
          <div className="grid grid-cols-1 xl:grid-cols-[260px_1fr] gap-5">
            <GlowCard>
              <div className="p-5 space-y-3">
                <SectionHdr icon={<DollarSign className="w-4 h-4"/>} title="TCO inputs"/>
                {[
                  {l:"GPU count",       v:gpuCount,  set:setGpuCount, min:8,   max:4096,step:8,   fmt:(v:number)=>String(v)},
                  {l:"Months",          v:months,    set:setMonths,   min:1,   max:60,  step:1,   fmt:(v:number)=>String(v)},
                  {l:"PUE",             v:pue,       set:setPue,      min:1.0, max:2.0, step:0.05,fmt:(v:number)=>v.toFixed(2)},
                  {l:"GPU utilization", v:util,      set:setUtil,     min:10,  max:100, step:5,   fmt:(v:number)=>v+"%"},
                ].map(s=>(
                  <div key={s.l}>
                    <div className="flex justify-between text-xs mb-1"><span className="text-slate-500">{s.l}</span><span className="font-mono text-white">{s.fmt(s.v)}</span></div>
                    <input type="range" min={s.min} max={s.max} step={s.step} value={s.v} onChange={e=>s.set(Number(e.target.value))} className="w-full accent-cyan-400"/>
                  </div>
                ))}
              </div>
            </GlowCard>

            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  {l:"Total TCO",       v:`$${(tco.total/1e6).toFixed(2)}M`,     c:"text-red-400"},
                  {l:"Power draw",      v:`${tco.power_kw.toFixed(0)} kW`,       c:"text-amber-400"},
                  {l:"Optimized TCO",   v:`$${(tco.opt/1e6).toFixed(2)}M`,       c:"text-green-400"},
                  {l:"Saving",          v:`${Math.round((1-tco.opt/tco.total)*100)}%`, c:"text-cyan-400"},
                ].map(s=>(
                  <GlowCard key={s.l}><div className="p-4">
                    <div className="text-[9px] text-slate-600 uppercase tracking-wide mb-1">{s.l}</div>
                    <div className={`text-xl font-bold font-mono ${s.c}`}>{s.v}</div>
                  </div></GlowCard>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <GlowCard>
                  <div className="p-5">
                    <SectionHdr icon={<TrendingDown className="w-4 h-4"/>} title={`Cost breakdown · ${gpuCount} × ${gpuSpec.name}`}/>
                    {[
                      {l:"Compute (cloud)",    v:tco.compute, icon:"💻", c:"bg-cyan-400"},
                      {l:`Power (PUE ${pue})`, v:tco.power,   icon:"⚡", c:"bg-amber-400"},
                      {l:"Networking (8%)",    v:tco.net,     icon:"🌐", c:"bg-violet-400"},
                      {l:"Storage (5%)",       v:tco.stor,    icon:"💾", c:"bg-green-400"},
                    ].map(r=>{
                      const pct = tco.total>0 ? r.v/tco.total*100 : 0;
                      return (
                        <div key={r.l} className="space-y-1 mb-3">
                          <div className="flex justify-between">
                            <span className="text-xs text-slate-400">{r.icon} {r.l}</span>
                            <span className="text-xs font-bold text-white font-mono">${Math.round(r.v/1000)}k</span>
                          </div>
                          <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${r.c}`} style={{width:`${pct}%`}}/>
                          </div>
                        </div>
                      );
                    })}
                    <div className="flex justify-between py-2 border-t border-white/[0.08]">
                      <span className="text-sm font-bold text-white">Total</span>
                      <span className="text-lg font-bold text-red-400 font-mono">${(tco.total/1e6).toFixed(2)}M</span>
                    </div>
                  </div>
                </GlowCard>

                <GlowCard>
                  <div className="p-5">
                    <SectionHdr icon={<Power className="w-4 h-4"/>} title="Power & sustainability"/>
                    <div className="space-y-2 mb-4">
                      {[
                        {l:`GPU TDP × ${gpuCount}`,  v:`${gpuSpec.tdp}W × ${gpuCount} = ${(gpuSpec.tdp*gpuCount/1000).toFixed(1)} kW`},
                        {l:"With PUE overhead",       v:`${tco.power_kw.toFixed(1)} kW total`},
                        {l:"Monthly kWh",             v:`${(tco.power_kw*24*30).toLocaleString(undefined,{maximumFractionDigits:0})} kWh`},
                        {l:"CO₂ (avg grid 0.41kg/kWh)",v:`${(tco.power_kw*24*30*0.41/1000).toFixed(1)} t CO₂/mo`},
                        {l:"Cooling overhead",        v:`${((pue-1)*gpuSpec.tdp*gpuCount/1000).toFixed(1)} kW`},
                      ].map(r=>(
                        <div key={r.l} className="flex justify-between text-xs py-1.5 border-b border-white/[0.04]">
                          <span className="text-slate-500">{r.l}</span>
                          <span className="text-amber-400 font-mono font-bold">{r.v}</span>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-1.5">
                      <div className="text-[10px] text-slate-600 mb-2">PUE benchmarks</div>
                      {[
                        {n:"Hyperscaler (Google/Meta)", p:1.1, c:"text-green-400"},
                        {n:"Modern colo (FluidStack tier)", p:1.2, c:"text-cyan-400"},
                        {n:"Standard colocation",     p:1.4, c:"text-amber-400"},
                        {n:"Legacy facility",         p:1.8, c:"text-red-400"},
                      ].map(r=>(
                        <div key={r.n} className="flex justify-between text-xs">
                          <span className="text-slate-500">{r.n}</span>
                          <span className={`font-mono font-bold ${r.c} ${Math.abs(r.p-pue)<0.05?"ring-1 ring-white rounded px-1":""}`}>PUE {r.p}</span>
                        </div>
                      ))}
                    </div>
                    {/* Green providers callout */}
                    <div className="mt-4 bg-emerald-400/5 border border-emerald-400/20 rounded-lg p-3">
                      <div className="text-[10px] font-bold text-emerald-400 mb-1.5">🌱 Green providers for this workload</div>
                      {PROVIDERS.filter(p=>p.green).map(p=>{
                        const g=p.gpus.find(g=>g.gpu===selGpu);
                        return g ? (
                          <div key={p.id} className="flex justify-between text-[10px] py-0.5">
                            <span className="text-slate-400">{p.name}</span>
                            <span className="text-emerald-400 font-mono">${g.od.toFixed(2)}/hr · {p.focus.split(",")[0]}</span>
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>
                </GlowCard>
              </div>
            </div>
          </div>
        )}

        {/* ══ TAB: NPI ═════════════════════════════════════════════════════════ */}
        {tab === "npi" && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { phase:"EVT", title:"Engineering Validation", icon:"🔧", color:"text-amber-400", border:"border-amber-400/20", bg:"bg-amber-400/5",
                      items:["FP16/FP8 TFLOPS vs NVIDIA spec sheet","HBM bandwidth DGEMM sweep","NVLink all-to-all bandwidth verify","TDP sustained under 100% load","PCIe Gen5 link training + error rate","MIG partition isolation & correctness"],
                      metrics:[`TFLOPS: ${gpuSpec.tflops_fp16} FP16`,`HBM: ${gpuSpec.hbm_bw} GB/s`,`NVLink: ${gpuSpec.nvlink_bw||"PCIe"} GB/s`,`TDP: ${gpuSpec.tdp}W`] },
                    { phase:"DVT", title:"Design Validation", icon:"⚗️", color:"text-cyan-400", border:"border-cyan-400/20", bg:"bg-cyan-400/5",
                      items:["Multi-node NVLink/IB fabric validation","RDMA over IB distributed training","Power delivery at 80% sustained util","Cooling CDU delta-T measurement","Driver/firmware stack compatibility","vLLM + TRT-LLM inference benchmarks"],
                      metrics:["IB NDR: 400 Gb/s","All-reduce <1ms for 1 GB","TFLOPS/W efficiency","CDU 45°C supply"] },
                    { phase:"PVT", title:"Production Validation", icon:"🚀", color:"text-green-400", border:"border-green-400/20", bg:"bg-green-400/5",
                      items:["SLA P50/P95/P99 latency under load","Tokens/sec at target utilization","GPU util + MFU tracking","MTBF baseline measurement","SkyPilot scheduling integration","Customer pilot: real LLM inference"],
                      metrics:["TTFT P99: <2s","MFU target: >35%","Availability: 99.9%","Kernel savings applied"] },
                  ].map(ph=>(
                    <GlowCard key={ph.phase}>
                      <div className="p-5">
                        <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border mb-3",ph.border,ph.bg,ph.color)}>
                          <span>{ph.icon}</span>{ph.phase}
                        </div>
                        <div className="text-sm font-bold text-white mb-3">{ph.title}</div>
                        <ul className="space-y-1.5 mb-3">
                          {ph.items.map(item=>(
                            <li key={item} className="flex items-start gap-1.5 text-[10px] text-slate-400">
                              <ChevronRight className="w-2.5 h-2.5 flex-shrink-0 mt-0.5 text-slate-600"/>{item}
                            </li>
                          ))}
                        </ul>
                        <div className={cn("rounded-lg p-3 border text-[9px] space-y-1",ph.border,ph.bg)}>
                          <div className={cn("font-bold mb-1",ph.color)}>{gpuSpec.name} targets</div>
                          {ph.metrics.map(m=><div key={m} className="text-slate-500">{m}</div>)}
                        </div>
                      </div>
                    </GlowCard>
                  ))}
                </div>

                {/* Hardware matrix */}
                <GlowCard>
                  <div className="p-5">
                    <SectionHdr icon={<Cpu className="w-4 h-4"/>} title="Hardware spec matrix" sub="All GPU SKUs · NPI procurement reference"/>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-white/[0.07]">
                            {["GPU","Arch","VRAM","HBM BW","FP16 TF","FP8 TF","NVLink","TDP","Ops:B"].map(h=>(
                              <th key={h} className="text-left py-2 pr-3 text-[9px] text-slate-600 uppercase tracking-wide whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(GPU_SPECS).map(([id,g])=>(
                            <tr key={id} className={cn("border-b border-white/[0.04] cursor-pointer transition-all",selGpu===id?"bg-cyan-400/5":"hover:bg-white/[0.02]")}
                              onClick={()=>setSelGpu(id)}>
                              <td className="py-2 pr-3 font-bold text-white">{g.name}</td>
                              <td className="py-2 pr-3 text-slate-500">{g.arch}</td>
                              <td className="py-2 pr-3 text-cyan-400 font-mono">{g.vram}GB</td>
                              <td className="py-2 pr-3 text-violet-400 font-mono">{g.hbm_bw}</td>
                              <td className="py-2 pr-3 text-white font-mono">{g.tflops_fp16}</td>
                              <td className="py-2 pr-3 text-green-400 font-mono">{g.tflops_fp8||"—"}</td>
                              <td className="py-2 pr-3 text-amber-400 font-mono">{g.nvlink_bw?`${g.nvlink_bw} GB/s`:"PCIe"}</td>
                              <td className="py-2 pr-3 text-red-400 font-mono">{g.tdp}W</td>
                              <td className="py-2 pr-3 text-slate-400 font-mono">{g.ops_per_byte}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </GlowCard>
              </div>

              {/* Right: Live kernel feed */}
              <div>
                <KernelFeed selectedIdx={selKernel} onKernelSelect={(idx)=>setSelKernel(idx)} />
              </div>
            </div>
          </div>
        )}

        {/* FOOTER */}
        <footer className="border-t border-white/[0.05] pt-5 flex items-center justify-between flex-wrap gap-3 text-[10px] text-slate-600">
          <div>Pricing: IntuitionLabs H100 Report Mar 2026, Saturn Cloud Neocloud Guide Dec 2025, Northflank GPU comparison Aug 2025, provider pricing pages · Kernels: <a href="https://huggingface.co/datasets/GPUMODE/kernelbot-data" className="underline hover:text-slate-400" target="_blank">GPUMODE/kernelbot-data</a></div>
          <div className="flex gap-4">
            {[
              {h:"https://github.com/techstar9797/GPUMarketplace",l:"GitHub"},
              {h:"https://gpumode.com/leaderboard",l:"GPU MODE"},
              {h:"https://skypilot.co",l:"SkyPilot"},
              {h:"https://fluidstack.io",l:"FluidStack"},
            ].map(l=>(
              <a key={l.h} href={l.h} target="_blank" rel="noopener noreferrer" className="hover:text-slate-400 flex items-center gap-1 transition-colors">
                {l.l}<ExternalLink className="w-2.5 h-2.5"/>
              </a>
            ))}
          </div>
        </footer>
      </div>
    </div>
  );
}
