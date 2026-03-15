# GPUMarketplace — GPU Compute Intelligence Platform
**GTC26 Hackathon · FluidStack × SkyPilot × GPU MODE**

Live: https://hackathon-submissions-gtc26.vercel.app

## Features

### 📡 Live Kernel Feed (polls every 5 min)
- **Source 1:** HuggingFace `GPUMODE/kernelbot-data` dataset (401,380 submissions)
  - `amd_successful_submissions` — fp8-gemm, moe, mla-decode, all2all (60k rows)
  - `nvidia_nvfp4_submissions` — gemv, gemm, dual_gemm, group_gemm (231k rows)
  - `leaderboards` — compact 7-row summary
- **Source 2:** gpumode.com leaderboard scrape (fallback, parses `__NEXT_DATA__`)
- **Source 3:** Seed static data (final fallback, labelled as "Cached data")

Shows on: **Overview tab** (right panel) · **NPI tab** (right column)

UI indicators:
- 🟢 `Live from HuggingFace` / ⚪ `Using cached data`  
- Per-kernel source badge (HuggingFace · AMD / NVIDIA, gpumode.com live, Cached)
- **NEW** pulse badge when fresh kernel detected vs previous poll
- 5-min countdown timer · Manual refresh button

### 📊 5-Tab Dashboard
| Tab | Purpose |
|---|---|
| Overview | Live pricing × 6 providers + 7-layer inference model + NVLink topology |
| Workload Analysis | Roofline model, bottleneck classification, MFU/MBU, VRAM breakdown |
| Capacity Planning | GPU count, TP/PP/DP topology, per-provider cost at scale |
| TCO & Power | Full TCO: compute + PUE power + networking + storage |
| NPI Intelligence | EVT/DVT/PVT checklists, hardware comparison matrix |

### 🏗 Infrastructure Coverage
- **GPU pricing:** CoreWeave, Lambda Labs, Nebius, AWS, GCP, Azure + 8 neoclouds
- **GPU specs:** H100 SXM5, H100 PCIe, A100 80GB, L40S, L4 (ops/byte, HBM BW, NVLink)
- **NVLink:** Gen4 (900 GB/s), Gen5 (1.8 TB/s), InfiniBand (400 Gb/s), PCIe (128 GB/s)

### 🔌 API Routes
| Endpoint | Description |
|---|---|
| `GET /api/leaderboard` | Live kernels from HuggingFace + gpumode.com (5-min cache) |
| `POST /api/savings` | SkyPilot × kernel speedup cost calculator |
| `GET /api/kernels` | Raw HuggingFace kernelbot-data rows |

## Environment Variables
```
HF_TOKEN=hf_...  # HuggingFace token for GPUMODE/kernelbot-data access
```

## Tech Stack
Next.js 16 · TypeScript · Tailwind CSS v4 · shadcn/ui · GlowingEffect (21st.dev)

## Data Sources
- GPU pricing: provider public docs (March 2026)
- Kernels: [GPUMODE/kernelbot-data](https://huggingface.co/datasets/GPUMODE/kernelbot-data) (CC BY 4.0)
- GPU specs: NVIDIA datasheets, H100/A100/L4 whitepapers
