# Video Generation Framework — AI Social Commerce OS V3

**Ngày:** 2026-06-11

---

## 1. Video Types

| Type | Platform | Duration | Aspect Ratio | Goal |
|------|----------|----------|-------------|------|
| **TikTok Product Demo** | TikTok | 15–60s | 9:16 | Viral reach, product awareness |
| **Facebook Reels** | Facebook | 15–90s | 9:16 | Community engagement, lead gen |
| **YouTube Shorts** | YouTube | 15–60s | 9:16 | SEO-boosted discovery |
| **Product Showcase** | Multi | 30–60s | 9:16 | Conversion-focused, add to cart |

---

## 2. Generation Steps (Current + Planned)

### Step 1: Topic Selection (DONE)
```
Input: ProductId + Platform
Source: 
  - Top revenue products từ KnowledgeBrain
  - Trending topics từ Trend Agent (Agent 01)
  - TrendPredictor (Agent 10) forecasted demand
Output: {productId, productName, topic, angle, trendContext}
```

### Step 2: Script Generation (DONE)
```
Input: Product context + Trend context + Platform specs
Process:
  - RAG search: product knowledge from Qdrant
  - LLM prompt: hook/problem/solution/benefits/cta template
  - Validate: length appropriate for platform duration
Output: VideoJob.script (text, stored in DB)
Status: VideoStatus.GENERATING_SCRIPT → completed → GENERATING_VOICE
```

### Step 3: Voice Synthesis (MISSING)
```
Input: VideoJob.script
Process:
  - Split script into segments
  - Call TTS API (ElevenLabs / local Coqui TTS)
  - Voice settings: Vietnamese female voice, medium pace
  - Generate .mp3/.wav file
Output: VideoJob.voiceUrl = "https://storage.../voice-{jobId}.mp3"
Status: GENERATING_VOICE → RENDERING
```

### Step 4: Visual Assembly (MISSING)
```
Input: ProductId + Script segments
Process:
  - Fetch product images from product.imageUrl
  - Download stock b-roll for category (optional)
  - Generate subtitle overlay timings from script
  - Prepare visual sequence: image → image → image
Output: Visual manifest JSON {segments: [{imageUrl, duration, subtitle}]}
```

### Step 5: Video Rendering (MISSING)
```
Input: VideoJob.voiceUrl + Visual manifest
Process:
  FFmpeg command:
    ffmpeg -i voice.mp3
           -loop 1 -i image1.jpg -t 5
           -vf "drawtext=text='${subtitle}':fontsize=40:x=(w-text_w)/2:y=h-100"
           -c:v libx264 -preset fast
           -ar 44100
           output.mp4
Output: VideoJob.videoUrl = "https://storage.../video-{jobId}.mp4"
Status: RENDERING → UPLOADING
```

### Step 6: Platform Upload (MISSING)
```
TikTok:   POST /api/v2/video/upload → TikTok Creator API
Facebook: POST /graph.facebook.com/me/videos → Graph API
YouTube:  POST /upload/youtube/v3/videos → YouTube Data API v3
Output: VideoJob.meta.platformVideoId
Status: UPLOADING → PUBLISHED
```

---

## 3. Current: Video Agent Status

```typescript
// VideoAgentService.createDailyVideos(count = 3)
async createDailyVideos(count: number = 3) {
  // 1. Get top products
  const products = await this.productRepo.find({ take: count });
  
  // 2. For each product: generate script via LLM
  for (const product of products) {
    const job = await this.videoJobRepo.save({
      productId: product.id,
      platform: VideoPlatform.TIKTOK,
      status: VideoStatus.PENDING,
    });
    
    // Generate script
    const script = await this.aiService.generate(scriptPrompt);
    
    // Update job
    await this.videoJobRepo.update(job.id, {
      script,
      status: VideoStatus.GENERATING_VOICE, // next step not yet implemented
    });
  }
}
```

**Current state:** Script generation works. Steps 3–6 are stubs (status saved but no actual processing).

---

## 4. Platform-specific Requirements

### TikTok
```
Resolution: 1080×1920 (9:16)
Duration:   15–60 seconds optimal
File size:  < 500MB
Format:     MP4 (H.264)
Bitrate:    ≥ 2Mbps
Audio:      AAC, 44.1kHz stereo
Caption:    150 chars + hashtags
```

### Facebook Reels
```
Resolution: 1080×1920 (9:16)
Duration:   15–90 seconds
File size:  < 4GB
Format:     MP4 or MOV
Bitrate:    ≥ 25Mbps recommended
```

### YouTube Shorts
```
Resolution: 1080×1920 (9:16)
Duration:   ≤ 60 seconds
Format:     MP4
Title:      ≤ 100 chars
```
