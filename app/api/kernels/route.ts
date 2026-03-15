import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "attention";
  const top = Math.min(10, Number(searchParams.get("top") || 3));
  const hfToken = process.env.HF_TOKEN;

  if (!hfToken) {
    return NextResponse.json({ error: "HF_TOKEN not configured" }, { status: 500 });
  }

  try {
    const res = await fetch(
      `https://datasets-server.huggingface.co/rows?dataset=gpu-mode/kernelbot-data&config=default&split=train&offset=0&length=50`,
      { headers: { Authorization: `Bearer ${hfToken}`, "User-Agent": "KernelWatch/3.0" }, signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return NextResponse.json({ error: "HF API error", status: res.status }, { status: res.status });
    const data = await res.json();
    const kernels = (data.rows || [])
      .map((r: Record<string,unknown>) => r.row as Record<string,unknown>)
      .filter((r: Record<string,unknown>) => r && (r.kernel_code || r.solution || r.code))
      .map((r: Record<string,unknown>) => ({
        problem: r.problem_name || type, username: r.username || "anonymous",
        score: parseFloat(String(r.speedup || r.score || 0)),
        kernel_code: String(r.kernel_code || r.solution || r.code || "").slice(0, 500),
        language: r.language || "cuda",
      }))
      .sort((a: Record<string,unknown>, b: Record<string,unknown>) => (b.score as number) - (a.score as number))
      .slice(0, top);

    return NextResponse.json({ source: "huggingface", dataset: "gpu-mode/kernelbot-data", type, count: kernels.length, kernels });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "unknown error" }, { status: 500 });
  }
}
