import { NextResponse } from "next/server";

const FALLBACK = [
  { rank:1,  name:"FlashAttention-3 (Triton)",  problem:"Attention / Prefill", speedup:4.2, type:"triton", gpu:"H100",      age:"2d",  fresh:true  },
  { rank:2,  name:"cuda.compute Sort (CCCL)",   problem:"Radix Sort",          speedup:3.8, type:"python", gpu:"Multi",     age:"5d",  fresh:true  },
  { rank:3,  name:"FP8 GEMM (MI300 tuned)",     problem:"MatMul / GEMM",       speedup:3.1, type:"cuda",   gpu:"MI300",     age:"1w",  fresh:false },
  { rank:4,  name:"Fused LayerNorm+ReLU",       problem:"Normalization",        speedup:2.9, type:"triton", gpu:"H100",      age:"1w",  fresh:false },
  { rank:5,  name:"cuda.compute PrefixSum",     problem:"Scan / PrefixSum",    speedup:2.7, type:"python", gpu:"Multi",     age:"2w",  fresh:false },
  { rank:6,  name:"PagedKV Cache Kernel",       problem:"KV Cache / Decode",   speedup:2.4, type:"cuda",   gpu:"A100/H100", age:"2w",  fresh:false },
  { rank:7,  name:"Vectorized Embedding",       problem:"Embedding Lookup",    speedup:2.1, type:"triton", gpu:"All",       age:"3w",  fresh:false },
  { rank:8,  name:"Fused AdamW (BF16)",         problem:"Optimizer Step",      speedup:1.9, type:"triton", gpu:"A100/H100", age:"3w",  fresh:false },
];

async function scrapeLeaderboard(problemId: number) {
  try {
    const res = await fetch(`https://www.gpumode.com/leaderboard/${problemId}?tab=rankings`, {
      headers: { "User-Agent": "KernelWatch/3.0 (GTC26 hackathon)" },
      signal: AbortSignal.timeout(4000),
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const html = await res.text();
    const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (!match) return null;
    const data = JSON.parse(match[1]);
    return data?.props?.pageProps?.rankings || data?.props?.pageProps?.leaderboard || null;
  } catch { return null; }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const problem = searchParams.get("problem");

  const PROBLEM_IDS: Record<string, number> = { vectoradd: 543, prefixsum: 541, histogram: 539, sort: 542, grayscale: 538 };
  let liveData = null;
  if (problem && PROBLEM_IDS[problem]) {
    liveData = await scrapeLeaderboard(PROBLEM_IDS[problem]);
  }

  return NextResponse.json({
    source: liveData ? "live" : "fallback",
    polled_at: new Date().toISOString(),
    kernels: liveData
      ? liveData.map((e: Record<string,unknown>, i: number) => ({
          rank: i + 1, name: e.username || `Submission #${i+1}`,
          speedup: parseFloat(String(e.speedup || e.score || 1)),
          type: e.language || "unknown", gpu: e.gpu || "unknown", fresh: i < 2,
        }))
      : FALLBACK,
  }, { headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=60" } });
}
