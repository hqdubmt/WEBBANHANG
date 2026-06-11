# RECOMMENDATION ENGINE DESIGN — AI Social Commerce OS V3

**Ngày:** 2026-06-11

---

## HIỆN TRẠNG

Hiện tại recommendation được thực hiện qua RAG + Ollama trong Sales Agent. Không có recommendation engine riêng.

---

## RECOMMENDATION TYPES

### 1. Primary Product
```
Dựa trên: Customer intent + budget signals
Nguồn: products table + Knowledge Brain (product domain)
Logic: Best match cho intent, highest revenue product trong budget
```

### 2. Upsell Product
```
Dựa trên: Primary product selection
Logic: Same category, higher tier/price (+20-50%)
VD: iPhone 15 → iPhone 15 Pro
```

### 3. Cross-sell Product
```
Dựa trên: Primary product
Logic: Complementary products
VD: iPhone → AirPods, Case, Charger
```

### 4. Bundle Product
```
Logic: Primary + accessories với discount
VD: "Combo iPhone 15 Pro + AirPods Pro giảm 1 triệu"
```

---

## RECOMMENDATION ALGORITHM (Đề xuất)

```typescript
async recommend(customerId: string, intent: string, budget: number) {
  // 1. Collaborative filtering (nếu có data)
  const similarCustomers = await findSimilarCustomers(customerId);
  const popularAmongSimilar = await getTopProducts(similarCustomers);
  
  // 2. Content-based (từ intent)
  const intentMatch = await ragService.search(PRODUCTS, intent, 5);
  
  // 3. Budget filter
  const affordableProducts = intentMatch.filter(p => p.price <= budget);
  
  // 4. Merge và rank
  return rankProducts([...popularAmongSimilar, ...affordableProducts]);
}
```

---

## PRODUCT INTELLIGENCE INTEGRATION

Từ Knowledge Brain Product Intelligence:
- `topProducts` (by revenue) → Best sellers để recommend
- `highMarginProducts` → Ưu tiên recommend khi có thể
- `topByRevenue` → Social proof ("sản phẩm bán chạy nhất")

---

## UPSELL/CROSS-SELL MATRIX

Cần tạo và ingest vào Knowledge Brain:
```json
{
  "productId": "iphone-15",
  "upsell": ["iphone-15-pro", "iphone-15-pro-max"],
  "cross-sell": ["airpods-pro", "iphone-case", "magsafe-charger"],
  "bundle": {
    "name": "Combo iPhone 15 Full Pack",
    "items": ["iphone-15", "airpods-pro", "case"],
    "discount": "10%"
  }
}
```

---

## PERSONALIZATION

Dựa trên customer history (khi đã có data):
| Signal | Recommendation tweak |
|--------|---------------------|
| Mua premium trước | Offer premium first |
| Budget-conscious | Offer value products |
| Repeat buyer | Loyalty discount |
| Long idle | Reactivation offer |
