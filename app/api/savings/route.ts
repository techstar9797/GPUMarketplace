import { NextResponse } from "next/server";

const GPU_RATES: Record<string, { od: number; spot: number }> = {
  "A100-80GB": { od: 3.20, spot: 1.28 },
  "H100-SXM5": { od: 8.00, spot: 2.60 },
  "A10G":      { od: 1.50, spot: 0.62 },
  "L4":        { od: 0.80, spot: 0.54 },
  "H100-Nebius":{ od: 2.95, spot: 2.95 },
};

const BEST_KERNELS: Record<string, { kernel: string; speedup: number }> = {
  llm:       { kernel: "FlashAttention-3 + FusedLayerNorm + FusedAdamW", speedup: 3.4 },
  inference: { kernel: "PagedKV Cache + Vectorized Embedding",           speedup: 2.6 },
  diffusion: { kernel: "Fused LayerNorm + FlashAttention cross-attn",    speedup: 2.1 },
  matmul:    { kernel: "FP8 GEMM (MI300 tuned)",                         speedup: 3.1 },
  sort:      { kernel: "cuda.compute Sort + PrefixSum + Histogram",      speedup: 3.8 },
  custom:    { kernel: "Mixed (estimated)",                               speedup: 2.5 },
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  return calcSavings(
    searchParams.get("workload_type") || "llm",
    Number(searchParams.get("monthly_budget") || 5000),
    searchParams.get("gpu_type") || "A100-80GB",
    searchParams.get("kernel_speedup") ? Number(searchParams.get("kernel_speedup")) : null
  );
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  return calcSavings(body.workload_type || "llm", Number(body.monthly_budget || 5000), body.gpu_type || "A100-80GB", body.kernel_speedup || null);
}

function calcSavings(workload_type: string, monthly_budget: number, gpu_type: string, kernel_speedup: number | null) {
  const gpu = GPU_RATES[gpu_type] || GPU_RATES["A100-80GB"];
  const kernel = BEST_KERNELS[workload_type] || BEST_KERNELS.custom;
  const skyMult = parseFloat((gpu.od / gpu.spot).toFixed(2));
  const kSpeedup = kernel_speedup ?? kernel.speedup;
  const total = skyMult * kSpeedup;
  const afterSky = monthly_budget / skyMult;
  const afterKernel = afterSky / kSpeedup;
  const saved = monthly_budget - afterKernel;
  return NextResponse.json({
    kernel: { name: kernel.kernel, speedup: kSpeedup },
    savings: {
      sky_multiplier: skyMult, kernel_speedup: kSpeedup, total_multiplier: parseFloat(total.toFixed(1)),
      baseline_monthly: monthly_budget, after_skypilot: parseFloat(afterSky.toFixed(2)),
      after_kernel: parseFloat(afterKernel.toFixed(2)), monthly_saved: parseFloat(saved.toFixed(2)),
      annual_saved: parseFloat((saved * 12).toFixed(2)),
      percent_saved: parseFloat(((saved / monthly_budget) * 100).toFixed(1)),
    },
    headline: `$${Math.round(monthly_budget).toLocaleString()} → $${Math.round(afterKernel).toLocaleString()}/mo (${((saved/monthly_budget)*100).toFixed(1)}% saved, ÷${total.toFixed(1)}× vs on-demand)`,
  });
}
