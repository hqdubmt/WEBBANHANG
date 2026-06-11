# SALES AGENT INTEGRATION — AI Social Commerce OS V3

**Ngày:** 2026-06-11

---

## SALES AGENT HIỆN TẠI

### API
```
POST /api/agents/sales/chat
DELETE /api/agents/sales/session/:sessionId
```

### Input
```typescript
{
  sessionId?: string,       // Auto-generated: {platform}-{userId}
  platform: LeadPlatform,   // facebook/telegram/zalo/tiktok/website
  platformUserId: string,   // ID trên platform
  message: string,          // Tin nhắn của khách
  customerName?: string     // Tên khách nếu có
}
```

### Flow
```
1. Nhận message
2. Session management (in-memory Map)
3. Knowledge context fetch (Knowledge Brain)
4. Build prompt
5. Ollama generate
6. Update lead in PostgreSQL
7. Return response
```

---

## TÍCH HỢP VỚI CÁC COMPONENTS

### Knowledge Brain
```typescript
// Get product + customer context
const context = await knowledgeBrainService.ask(
  message, 
  [KnowledgeDomain.PRODUCT, KnowledgeDomain.CUSTOMER]
);
```

### Lead Management
```typescript
// Tự động tạo hoặc update lead
await leadRepo.upsert({
  platform,
  platformUserId,
  content: message,
  score: intentScore,
  status: LeadStatus.CONTACTED
});
```

### WebSocket Realtime
```typescript
// Khi lead mới hoặc message đến:
eventsGateway.emitNewLead(lead);
eventsGateway.emitChatMessage(sessionId, { reply });
```

---

## SESSION MANAGEMENT

Hiện tại: In-memory Map trong Service
```typescript
private sessions = new Map<string, ConversationMessage[]>();
```

**Rủi ro:**
- Restart app → mất toàn bộ session
- Scale horizontally → session không share

**Fix:** Redis session store
```typescript
// Đề xuất:
const session = await redisClient.get(`sales:session:${sessionId}`);
await redisClient.setex(`sales:session:${sessionId}`, 3600, JSON.stringify(messages));
```

---

## CRM HANDOFF

Khi Sales Agent detect buying intent cao:
```typescript
// Tạo/update Customer record
if (intentScore > 80 && lead.status !== LeadStatus.CONVERTED) {
  const customer = await customersService.createOrUpdate({
    name: lead.name,
    platform: lead.platform,
    platformId: lead.platformUserId
  });
  await leadRepo.update(leadId, { 
    customerId: customer.id,
    status: LeadStatus.CONVERTED
  });
  eventsGateway.emitNewOrder(...);
}
```

---

## INTEGRATION ROADMAP

| Feature | Effort | Impact |
|---------|--------|--------|
| Redis session persistence | 1 ngày | HIGH |
| Webhook Facebook/Telegram | 2 ngày | CRITICAL |
| Upsell/cross-sell suggestions | 2 ngày | HIGH |
| Streaming response | 1 ngày | MEDIUM |
| Conversation history search | 1 ngày | MEDIUM |
| Lead scoring auto-update | 1 ngày | HIGH |
