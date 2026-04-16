# VibeHub 中国支付路径方案 (China Payment Plan)

> 文档状态：**方案设计 + 配置闭环**  
> 更新日期：2026-04-16  
> 依据：`docs/launch-readiness-standard.md` §2.5

---

## 1. 现状

- 当前唯一支付通道：Stripe（国际信用卡 / Apple Pay / Google Pay）
- 中国大陆用户无法通过支付宝/微信支付完成订阅
- 标准要求"至少完成正式接入方案与上线所需配置闭环"

## 2. 推荐路径

### 方案 A：Stripe Payment Methods（推荐首选）

Stripe 原生支持 Alipay 和 WeChat Pay 作为 Payment Methods：

- **优势**：统一后端、统一 webhook、统一结算
- **限制**：
  - Alipay via Stripe 仅支持 CNY / HKD / SGD / USD 等特定币种
  - WeChat Pay via Stripe 限于线上收单，需 Stripe 审核启用
- **前置条件**：
  - Stripe 账户开通 Alipay / WeChat Pay 方式（Stripe Dashboard → Settings → Payment methods）
  - 无需独立中国企业主体（通过 Stripe 代收代付）

### 方案 B：聚合支付服务商

通过 Ping++ / 收钱吧 / LianLian Pay 等聚合服务商接入：

- **优势**：一个接口覆盖支付宝 + 微信 + 银联
- **劣势**：增加第三方依赖、额外费用、需要中国企业主体

### 方案 C：直接 SDK 接入

直接对接支付宝开放平台 / 微信支付商户平台：

- **优势**：原生体验、费率最低
- **劣势**：需要中国企业主体、ICP 备案、商户资质审核（1-4 周）

## 3. 实施决策

**选择方案 A（Stripe Payment Methods）**作为首选路径，理由：

1. 后端已有完整 Stripe 集成
2. 无需额外企业主体
3. 支付抽象层（`PaymentProvider` 接口）已就绪，未来可平滑切换到方案 B/C

## 4. 所需环境变量

### Stripe Alipay/WeChat（方案 A）

```env
# 在 Stripe Dashboard 启用后自动生效，无需额外变量
# 确保 STRIPE_SECRET_KEY 的 Stripe 账户已开通这些支付方式
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_PRICE_PRO=price_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

### 聚合支付（方案 B，备选）

```env
PAYMENT_PROVIDER=china
CHINA_PAY_APP_ID=xxx
CHINA_PAY_APP_SECRET=xxx
CHINA_PAY_MERCHANT_ID=xxx
CHINA_PAY_NOTIFY_URL=https://vibehub.com/api/v1/billing/webhook/china
```

## 5. 接入时序图

```
用户选择支付方式
      │
      ▼
 ┌─────────────┐     ┌──────────────┐
 │ 前端 Pricing │────▶│ POST checkout│
 │  Cards       │     │   route      │
 └─────────────┘     └──────┬───────┘
                            │
                   PaymentProvider
                   .createCheckout()
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
         StripeProvider  ChinaProvider  (future)
              │
              ▼
    Stripe Checkout Session
    (with Alipay/WeChat enabled)
              │
              ▼
    用户在支付宝/微信完成支付
              │
              ▼
    Stripe Webhook → 更新 UserSubscription
```

## 6. 前端适配

`/pricing` 页面根据 `NEXT_PUBLIC_PAYMENT_PROVIDER` 环境变量：
- 默认（`stripe`）：显示"Credit Card / Apple Pay / Google Pay"
- 配置了中国支付方式后：额外显示"支付宝 / 微信支付"图标
- 未配置中国支付时：中国支付按钮显示"即将支持"

## 7. 上线判定条件

| 条件 | 状态 |
|------|------|
| `PaymentProvider` 接口定义完成 | ✅ |
| `StripePaymentProvider` 实现通过现有测试 | ✅ |
| `ChinaPaymentProvider` 占位实现存在 | ✅ |
| 支付方案文档完整 | ✅ |
| 所需环境变量清单列出 | ✅ |
| Stripe 账户开通 Alipay/WeChat 方式 | ⏳ 需人工操作 |
| 中国支付端到端测试 | ⏳ 需 Stripe 审核通过后测试 |

## 8. 商户资质清单

### Stripe 方案 A（最小要求）

- [ ] Stripe 账户已验证（Business verification complete）
- [ ] 在 Stripe Dashboard 启用 Alipay payment method
- [ ] 在 Stripe Dashboard 启用 WeChat Pay payment method
- [ ] Webhook endpoint 配置正确并包含相关事件

### 直接接入方案 C（备选，需要以下全部）

- [ ] 中国企业营业执照
- [ ] ICP 备案号
- [ ] 支付宝开放平台应用创建及审核通过
- [ ] 微信支付商户号申请及审核通过
- [ ] 银行对公账户
- [ ] 域名 HTTPS 证书
