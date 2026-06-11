# SALES KPI FRAMEWORK — AI Social Commerce OS V3

**Ngày:** 2026-06-11

---

## CORE SALES KPIs

| KPI | Định nghĩa | Nguồn data | Mục tiêu |
|-----|-----------|-----------|---------|
| Lead Count | Tổng leads mới | leads table | Tăng 20%/tháng |
| Conversation Count | Số cuộc hội thoại | agent session | — |
| Qualified Leads | leads.status = qualified | leads table | > 40% total leads |
| Hot Leads | leads.score >= 71 | leads table | > 20% total leads |
| Orders | orders.status != cancelled | orders table | Tăng 15%/tháng |
| Revenue | SUM(orders.total) | orders table | Target hàng tháng |
| Conversion Rate | orders / leads × 100 | Both | > 20% |
| Average Order Value (AOV) | revenue / orders | orders table | Tăng 10%/tháng |

---

## SALES AGENT PERFORMANCE KPIs

| KPI | Định nghĩa |
|-----|-----------|
| AI Response Time | Avg ms từ message → reply |
| Conversation Length | Avg số turns trước close |
| Intent Detection Rate | % messages với intent detected |
| Objection Handled Rate | % objections với response |
| Session Completion Rate | % sessions kết thúc có resolution |

---

## PLATFORM KPIs

| Platform | Lead Count | Conversion | Revenue |
|---------|-----------|-----------|---------|
| Facebook | leads count by platform | % convert | SUM orders |
| Telegram | — | — | — |
| TikTok | — | — | — |
| Website | — | — | — |

---

## FUNNEL KPIs

```
Lead Capture Rate = New Leads / Total Interactions
Contact Rate = Contacted / New Leads
Qualification Rate = Qualified / Contacted
Close Rate = Orders / Qualified
Repeat Rate = Repeat Customers / All Customers
```

---

## DASHBOARD METRICS (Real-time via WebSocket)

| Metric | Update frequency |
|--------|----------------|
| Today's Leads | On new_lead event |
| Today's Orders | On new_order event |
| Today's Revenue | On new_order event |
| Hot Leads count | Every 5 minutes |
| Conversion Rate Today | Every 5 minutes |

---

## CURRENT GAPS

| KPI | Status |
|-----|--------|
| Platform attribution | ⚠️ leads.platform có nhưng analytics thiếu |
| AOV by platform | ❌ Chưa có |
| AI contribution to revenue | ❌ Chưa có |
| Response time tracking | ❌ Chưa có |
| Upsell success rate | ❌ Chưa có |
