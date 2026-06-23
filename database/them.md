
# AI Video Pipeline — Tự động tạo & đăng video (chạy free, không cần API trả phí)

## Flow

Make Scheduler (Cron: 9h, 15h)
     │
     ▼
Nguồn nội dung
(RSS, Website, Shopee, TikTok Shop)
     │
     ▼
Webhook  [POST /agents/telegram/ai-video/run]
     │
     ▼
Ollama (Qwen3 8B)            ← env: OLLAMA_URL, OLLAMA_VIDEO_MODEL
     │
     ├─ Tiêu đề
     ├─ Kịch bản (60-80s)
     ├─ Mô tả
     └─ Hashtag
     │
     ▼
Piper TTS                    ← env: PIPER_TTS_URL, PIPER_MODEL
(Tạo giọng đọc WAV — vi_VN-vivos-medium)
     │
     ▼
Sharp + FFmpeg
(Tạo video dọc 1080x1920 + ảnh sản phẩm + audio WAV)
     │
     ▼
Lưu MP4
     │
     ├─ YouTube Shorts        ← env: YOUTUBE_ACCESS_TOKEN / CLIENT_ID+SECRET+REFRESH
     ├─ Facebook Reels Upload ← env: FACEBOOK_PAGE_ID + FACEBOOK_ACCESS_TOKEN
     └─ TikTok Queue          → /tmp/tiktok_videos/ → TikTokUploaderService
     │
     ▼
Google Sheets                ← env: GOOGLE_SHEETS_ID + GOOGLE_SERVICE_ACCOUNT_JSON
(Lưu trạng thái: thời gian, nguồn, tiêu đề, link upload)

## Implementation

File: apps/api/src/modules/agents/telegram/ai-video-pipeline.service.ts
API:  POST /agents/telegram/ai-video/run?count=3

## Biến môi trường

| Biến                        | Mô tả                                     |
|-----------------------------|-------------------------------------------|
| OLLAMA_URL                  | http://localhost:11434                    |
| OLLAMA_VIDEO_MODEL          | qwen3:8b                                  |
| PIPER_TTS_URL               | http://localhost:5000                     |
| PIPER_MODEL                 | vi_VN-vivos-medium                        |
| RSS_FEED_URLS               | URL RSS cách nhau bằng dấu phẩy           |
| TIKTOK_SHOP_URL             | URL TikTok Shop                           |
| YOUTUBE_ACCESS_TOKEN        | Access token YouTube                      |
| YOUTUBE_CLIENT_ID/SECRET    | OAuth2 credentials YouTube                |
| YOUTUBE_REFRESH_TOKEN       | Refresh token YouTube                     |
| FACEBOOK_PAGE_ID            | ID Facebook Page                          |
| FACEBOOK_ACCESS_TOKEN       | Page Access Token                         |
| GOOGLE_SHEETS_ID            | ID Google Sheets                          |
| GOOGLE_SERVICE_ACCOUNT_JSON | Service Account JSON (stringify)          |

## Setup Piper TTS (local, miễn phí)

  docker run -p 5000:5000 rhasspy/wyoming-piper --voice vi_VN-vivos-medium