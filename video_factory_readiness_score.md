# Video Factory Readiness Score — AI Social Commerce OS V3

**Ngày:** 2026-06-11

---

## Score Breakdown — 8 Tiêu chí

| # | Tiêu chí | Trọng số | Điểm (0–10) | Thực trạng |
|---|----------|---------|------------|------------|
| 1 | **VideoJob Entity & Pipeline** | 15% | **9/10** | VideoJob entity đầy đủ: status enum (7 stages), platform enum (3 platforms), script/voiceUrl/videoUrl fields, meta jsonb. Table deployed. |
| 2 | **Script Generation (LLM)** | 20% | **7/10** | Video Agent tạo script qua AiService (Ollama). Script lưu vào VideoJob.script. Cấu trúc hook/problem/solution/cta có. Thiếu: prompt optimization per platform. |
| 3 | **Voice Synthesis (TTS)** | 15% | **1/10** | voiceUrl field tồn tại trong DB nhưng hoàn toàn chưa implement. Không có TTS service integration. Video pipeline dừng ở script stage. |
| 4 | **Video Rendering** | 15% | **1/10** | FFmpeg render chưa implement. Không có render service. VideoStatus.RENDERING tồn tại trong enum nhưng không được trigger. |
| 5 | **Platform Upload** | 10% | **1/10** | TikTok API, Facebook Reels API, YouTube API chưa integrate. platformVideoId trong meta không được populated. |
| 6 | **Video Optimizer Agent** | 10% | **5/10** | Agent 17 tồn tại với controller + basic stats. optimizeVideos() endpoint hoạt động. Thiếu: platform stats fetching, VPS computation. |
| 7 | **Performance Tracking** | 10% | **2/10** | meta: jsonb field có nhưng không có platform API calls. Không biết video perform thế nào sau khi "publish". |
| 8 | **A/B Testing & Learning** | 5% | **3/10** | Experiment entity tồn tại. LessonLearned entity tồn tại. Nhưng không có kết nối vào Video workflow. |

---

## Tổng Điểm

```
Tổng = 0.15×9 + 0.20×7 + 0.15×1 + 0.15×1 + 0.10×1 + 0.10×5 + 0.10×2 + 0.05×3
     = 1.35 + 1.40 + 0.15 + 0.15 + 0.10 + 0.50 + 0.20 + 0.15
     = 4.00 / 10
```

**TỔNG ĐIỂM: 4.0 / 10 — 40%**

---

## Radar Chart

```
VideoJob Entity       ██████████████████   9.0
Script Generation     ██████████████       7.0
Video Optimizer       ██████████           5.0
A/B Testing           ██████               3.0
Performance Tracking  ████                 2.0
Voice Synthesis       ██                   1.0  ← CRITICAL
Video Rendering       ██                   1.0  ← CRITICAL
Platform Upload       ██                   1.0  ← CRITICAL
```

---

## Verdict

**LEVEL: EARLY STAGE (40%) — Infrastructure Ready, Production Pipeline Incomplete**

### Điểm mạnh
- Data model hoàn chỉnh — VideoJob entity đủ để hỗ trợ full pipeline
- Script generation hoạt động — LLM tạo scripts thực sự
- Video Optimizer Agent có cấu trúc đúng
- Experiment/LessonLearned entities sẵn sàng cho learning loop

### Điểm yếu cốt lõi
Video Factory hiện chỉ là **"Text Factory disguised as Video Factory"**:
- Script được tạo (text) ✓
- Audio không được tạo ✗
- Video không được render ✗
- Không có gì được upload lên TikTok/Reels ✗

### Hành động tiếp theo (Priority)

1. `[P1 — Blocker]` Integrate TTS service
   - Option A: ElevenLabs API (best quality, paid)
   - Option B: Coqui TTS (local, Vietnamese support limited)
   - Option C: OpenAI TTS API (good quality, affordable)

2. `[P1 — Blocker]` FFmpeg rendering service
   - Input: voice.mp3 + product_images[]
   - Output: .mp4 with subtitles

3. `[P1 — Blocker]` Object storage (S3/R2)
   - Store: voice files + rendered videos

4. `[P2]` TikTok Creator API integration
   - Most important platform first

5. `[P3]` Platform stats fetcher → VPS computation

**Note:** Steps 1–3 are prerequisites. Without them, Video Factory cannot deliver end product.
