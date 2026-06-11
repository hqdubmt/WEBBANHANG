# Storyboard Framework — AI Social Commerce OS V3

**Ngày:** 2026-06-11

---

## 1. Storyboard Structure

```
STORYBOARD: TikTok Product Demo (45 seconds)
Product: {productName}

┌──────────────────────────────────────────────────────────────────┐
│ Scene 1: HOOK (0–3s)                                             │
│ Shot: Product close-up OR person reacting                        │
│ Visual: Full screen product image + bold text overlay            │
│ Text overlay: [HOOK line from script]                            │
│ Audio: Voice (hook) + background music fade-in                   │
│ Transition: Cut                                                  │
├──────────────────────────────────────────────────────────────────┤
│ Scene 2: PROBLEM (3–8s)                                          │
│ Shot: Person struggling with problem                             │
│ Visual: Split screen — before state                              │
│ Text overlay: Pain point text                                    │
│ Audio: Voice (problem) + music continues                         │
│ Transition: Fade to next                                         │
├──────────────────────────────────────────────────────────────────┤
│ Scene 3: SOLUTION REVEAL (8–20s)                                 │
│ Shot: Product unboxing / product being used                      │
│ Visual: Product in action — multiple angles                      │
│ Text overlay: Product name + key feature                         │
│ Audio: Voice (solution) + upbeat music lift                      │
│ Transition: Zoom out                                             │
├──────────────────────────────────────────────────────────────────┤
│ Scene 4: BENEFITS (20–38s)                                       │
│ Shot: 3 benefit cards — quick cuts                               │
│ Visual: Benefit 1 → 2 → 3 with icons                           │
│ Text overlay: "✓ Benefit 1", "✓ Benefit 2", "✓ Benefit 3"     │
│ Audio: Voice (benefits) + music continues                        │
│ Transition: Quick cut ×3                                         │
├──────────────────────────────────────────────────────────────────┤
│ Scene 5: OFFER + CTA (38–45s)                                    │
│ Shot: Product + price badge                                      │
│ Visual: Discount badge, product, CTA button                      │
│ Text overlay: Price + "Nhắn tin ngay!"                          │
│ Audio: Voice (offer+cta) + music outro                           │
│ Transition: Freeze frame + call-to-action arrow                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. Shot Types

| Shot Type | Vietnamese Context | Best For |
|-----------|-------------------|---------|
| **Product Close-up** | Sản phẩm chiếm 80% frame | Hook, detail shots |
| **Lifestyle Shot** | Người đang dùng sản phẩm | Solution, benefits |
| **Text-Dominant** | Chữ lớn, background blur | Offer, CTA |
| **Split Screen** | Before/After side by side | Problem → Solution |
| **Talking Head** | Người nói thẳng camera | Trust building |
| **B-roll Cutaway** | Context shots | Transitions |
| **Benefit Cards** | Card animation hiện lên | Benefits section |

---

## 3. Visual Asset Requirements

```
Per Video Job:
  Required:
    - product.imageUrl: Product main image (từ products table)
    - 2–3 product detail images (từ product gallery)
  
  Optional (improve quality):
    - Lifestyle background image (stock photo)
    - Brand logo PNG (transparent background)
    - Custom CTA button graphic

Asset Sources:
  - products.imageUrl → main product photo
  - Unsplash API / Pexels API → lifestyle backgrounds (free)
  - Generate with AI image API → custom visuals (future)
```

---

## 4. Text Overlay Guidelines

```
RULES FOR TEXT OVERLAY:
  Font:       Sans-serif, bold (Roboto Bold / Montserrat Bold)
  Size:       Minimum 48px (readable on mobile)
  Color:      White text + dark shadow OR white on dark bar
  Position:   Bottom 1/3 of screen (below subject, above CTA)
  Duration:   ≥ 1.5 seconds per text segment
  Max chars:  35 characters per line
  Max lines:  2 lines simultaneously

SUBTITLE TIMING (from script):
  Segment 1 (Hook):    0.0s – 3.0s
  Segment 2 (Problem): 3.0s – 8.0s
  Segment 3 (Solution):8.0s – 20.0s
  Segment 4 (Benefits):20.0s – 38.0s
  Segment 5 (CTA):     38.0s – 45.0s
```

---

## 5. Music & Audio Guidelines

```
Background Music:
  Energy level: matches product category
    - Thời trang → Upbeat pop, 120–130 BPM
    - Sức khỏe/đẹp → Soft, 90–100 BPM
    - Công nghệ → Electronic, 110–120 BPM
    - Thực phẩm → Cheerful acoustic, 100–110 BPM
  
  Volume: Voice at 100%, Music at 20–30%
  Fade in: First 1 second
  Fade out: Last 2 seconds
  
  Sources:
    - TikTok trending audio (best for TikTok algorithm)
    - YouTube Audio Library (royalty-free)
    - Epidemic Sound (paid subscription)

Voice Over (TTS):
  Language: Vietnamese
  Voice: Female (more trusted for products in VN market)
  Speed: 0.95× normal (slightly slower = clearer)
  Pitch: Normal
```

---

## 6. Storyboard → VideoJob Mapping

```typescript
// Meta field trong VideoJob stores storyboard
VideoJob.meta = {
  storyboard: {
    scenes: [
      {
        id: 1,
        name: "hook",
        startSec: 0,
        endSec: 3,
        imageUrl: "product_main.jpg",
        subtitle: "Câu hook ở đây",
        transition: "cut"
      },
      // ...
    ],
    bgMusic: "upbeat_120bpm.mp3",
    voiceStyle: "female_standard_vn"
  }
}
```

**Current status:** Storyboard schema designed, not yet implemented in VideoAgent service.
