# Video Factory Architecture — AI Social Commerce OS V3

**Ngày:** 2026-06-11

---

## 1. Video Pipeline

```
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│  TREND   │──▶│  SCRIPT  │──▶│  VOICE   │──▶│  VISUAL  │──▶│  RENDER  │──▶│ PUBLISH  │
│          │   │          │   │          │   │          │   │          │   │          │
│ Trending │   │ Hook+    │   │ TTS API  │   │ B-roll   │   │ Combine  │   │ TikTok/  │
│ topics   │   │ Script   │   │ Voice    │   │ Product  │   │ Audio+   │   │ Reels/   │
│ Hashtags │   │ generate │   │ file     │   │ Images   │   │ Visual   │   │ Shorts   │
│ Products │   │ LLM      │   │ .wav     │   │ Subtitle │   │ .mp4     │   │          │
└──────────┘   └──────────┘   └──────────┘   └──────────┘   └──────────┘   └──────────┘
                                                                  │
                                                                  ▼
                                                         ┌──────────────────┐
                                                         │  VIDEO OPTIMIZER │
                                                         │  POST-PUBLISH    │
                                                         │  ANALYSIS        │
                                                         │  A/B TESTING     │
                                                         └──────────────────┘
```

---

## 2. VideoJob Entity — Pipeline Stages

```typescript
// apps/api/src/database/entities/video-job.entity.ts
enum VideoStatus {
  PENDING              // Job created
  GENERATING_SCRIPT    // LLM writing script
  GENERATING_VOICE     // TTS converting script to audio
  RENDERING            // Combining audio + visuals
  UPLOADING            // Publishing to platform
  PUBLISHED            // Live on platform
  FAILED               // Error at any stage
}

enum VideoPlatform {
  TIKTOK              // TikTok — vertical 9:16
  FACEBOOK_REELS      // Facebook Reels — vertical 9:16
  YOUTUBE_SHORTS      // YouTube Shorts — vertical 9:16
}

VideoJob {
  id: uuid
  productId: string     // Which product to feature
  script: text          // Generated script
  voiceUrl: string      // TTS output URL
  videoUrl: string      // Final rendered video URL
  platform: VideoPlatform
  status: VideoStatus
  errorMessage: string
  durationMs: number
  meta: jsonb           // Additional metadata
}
```

---

## 3. Video Agent (Agent 08)

**Path:** `apps/api/src/modules/agents/video/`

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `POST` | `/api/agents/video/run` | Tạo video jobs cho N sản phẩm (`count` param) |
| `GET`  | `/api/agents/video/pending` | Danh sách video jobs đang chờ/processing |

**Workflow:**
```
POST /api/agents/video/run (count=3)
    │
    ├── 1. Select top products by revenue (count=3)
    ├── 2. For each product:
    │       a. Create VideoJob {status: PENDING}
    │       b. Generate script via LLM → {status: GENERATING_SCRIPT}
    │       c. Save script to VideoJob.script
    │       d. [TODO] TTS → voiceUrl → {status: GENERATING_VOICE}
    │       e. [TODO] Render → videoUrl → {status: RENDERING}
    │       f. [TODO] Upload → {status: UPLOADING → PUBLISHED}
    └── Return: {created: N, jobs: [...]}
```

---

## 4. Video Optimizer Agent (Agent 17)

**Path:** `apps/api/src/modules/agents/video-optimizer/`

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `POST` | `/api/agents/video-optimizer/run` | Phân tích video performance, đề xuất optimization |
| `GET`  | `/api/agents/video-optimizer/stats` | Thống kê video performance |

**Role:**
- Phân tích PUBLISHED videos sau 24h, 7d
- So sánh performance giữa các videos
- Identify best-performing scripts/hooks
- Feed learnings vào Knowledge Brain
- Đề xuất tạo A/B variants

---

## 5. Infrastructure Requirements

```
CURRENT (Implemented):
  - VideoJob entity + table                  ✓
  - Video Agent (script generation)          ✓ Partial
  - Video Optimizer Agent                    ✓ Controller + basic stats

TO BE IMPLEMENTED:
  - TTS Service: ElevenLabs API / OpenAI TTS / local TTS
    → voiceUrl generation
  - Video Render Service: FFmpeg
    → Combine: voice + product images + subtitle overlay → .mp4
  - Video Storage: S3/CloudFlare R2
    → Store rendered videos
  - Platform APIs:
    → TikTok API (video upload)
    → Facebook Graph API (Reels upload)
    → YouTube Data API (Shorts upload)
```

---

## 6. Gap Summary

| Stage | Status |
|-------|--------|
| Trend detection → script topic | DONE (Trend Agent feeds topics) |
| Script generation (LLM) | DONE — saves to VideoJob.script |
| Voice synthesis (TTS) | MISSING — voiceUrl not populated |
| Visual assembly (images/b-roll) | MISSING — no render service |
| Video rendering (FFmpeg) | MISSING |
| Platform upload | MISSING |
| Performance tracking | MISSING — meta field exists but not populated |
| Video Optimizer analytics | PARTIAL — basic stats endpoint |
