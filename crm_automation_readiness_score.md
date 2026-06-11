# CRM Automation Readiness Score — AI Social Commerce OS V3

**Ngày:** 2026-06-11

---

## Score Breakdown — 8 Tiêu chí

| # | Tiêu chí | Trọng số | Điểm (0–10) | Thực trạng |
|---|----------|---------|------------|------------|
| 1 | **Customer Data Model** | 15% | **9/10** | Customer entity đầy đủ: id/phone/email/tier/ltv/churnRisk/acquisitionSource. Index trên phone, email, tier. ManyToOne với Orders. |
| 2 | **Lead Management** | 15% | **8/10** | Lead entity: platform/status/score/intent/followUpAt. LeadStatus enum đầy đủ 5 trạng thái. Thiếu: auto-assignment logic. |
| 3 | **CRM Agent** | 15% | **7/10** | CrmAgentController với 3 endpoints. analyzeCrm(), getCrmStats(), getCustomerProfile(). Thiếu: cron schedule, win-back trigger. |
| 4 | **Tier & Segmentation** | 10% | **7/10** | CustomerTier enum (new/regular/vip). CustomerSegment entity. Segmentation Agent (`/api/agents/segmentation/run`). Thiếu: auto rebuild cron. |
| 5 | **churnRisk Calculation** | 15% | **6/10** | Field exists (decimal 5,2). CRM Agent cập nhật khi run. Formula cơ bản dựa trên recency. Thiếu: engagement tracking, support score. |
| 6 | **Follow-up Automation** | 15% | **3/10** | followUpAt field trong Lead. KHÔNG CÓ scheduler. KHÔNG CÓ sequence state machine. KHÔNG CÓ auto-trigger outreach. Đây là gap lớn nhất. |
| 7 | **Multi-channel Outreach** | 10% | **6/10** | Telegram Agent + Email Agent tồn tại. telegramId/facebookId/zaloId trong Customer entity. Thiếu: unified outreach service, channel priority logic. |
| 8 | **CRM Dashboard & Analytics** | 5% | **7/10** | Analytics controller: `/api/analytics/customers`. CRM stats endpoint. Thiếu: real-time WebSocket updates, drill-down filters. |

---

## Tổng Điểm

```
Tổng = Σ (weight × score)
     = 0.15×9 + 0.15×8 + 0.15×7 + 0.10×7 + 0.15×6 + 0.15×3 + 0.10×6 + 0.05×7
     = 1.35 + 1.20 + 1.05 + 0.70 + 0.90 + 0.45 + 0.60 + 0.35
     = 6.60 / 10
```

**TỔNG ĐIỂM: 6.6 / 10 — 66%**

---

## Radar Chart

```
Customer Data Model    ████████████████████ 9.0
Lead Management        ████████████████     8.0
CRM Agent              ██████████████       7.0
Tier & Segmentation    ██████████████       7.0
churnRisk Calc         ████████████         6.0
Follow-up Automation   ██████               3.0  ← CRITICAL GAP
Multi-channel          ████████████         6.0
Dashboard              ██████████████       7.0
```

---

## Verdict

**LEVEL: INTERMEDIATE (66%) — CRM Operational nhưng chưa Automated**

### Điểm mạnh
- Data model hoàn chỉnh và đúng chuẩn (customer + lead + order + tier + churnRisk)
- CRM Agent hoạt động với 3 endpoints chính
- Segmentation infrastructure có sẵn
- Multi-channel IDs được lưu trong profile

### Điểm yếu nghiêm trọng
1. **Follow-up Automation = 3/10:** `followUpAt` field tồn tại nhưng không có scheduler đọc nó. Toàn bộ chuỗi D+1/D+3/D+7/D+30 phải implement thủ công.
2. **churnRisk = 6/10:** Engagement score hardcoded = 50. Support score chưa tính cancelled orders.
3. **No Outreach Automation:** Win-back campaigns chưa tự động trigger. Cần tích hợp Email Agent + Telegram Agent vào CRM flow.

### Hành động tiếp theo (Priority)
1. `[P1]` Build `FollowUpScheduler` service — cron every 30min đọc `leads.followUpAt <= NOW()`
2. `[P1]` Integrate Telegram Agent + Email Agent vào CRM win-back flow
3. `[P2]` Improve churnRisk formula — add engagement tracking
4. `[P2]` Add WebSocket events cho churn alerts
5. `[P3]` Redis cache cho CRM stats queries
