# @jibban/debt-engine

هسته محاسبات دنگ، تسهیم مخارج و الگوریتم ساده‌سازی گراف تسویه بدهی‌ها (بر پایه Spliit و Min-Cost Flow) برای سامانه حسابداری جیب‌بان (JibBan).

## ویژگی‌ها

- **الگوریتم ساده‌سازی تسویه بدهی (Debt Simplification):** کاهش تعداد کل تراکنش‌های تسویه گروهی به حداقل ممکن (به جای اینکه A به B و B به C بدهکار باشد، سیستم مستقیم بدهی را بین مبدأ و مقصد اصلی تسویه می‌کند).
- **انواع روش‌های تسهیم هزینه:**
  - تقسیم کاملاً مساوی با پخش دقیق باقیمانده کسری به تومان (`calculateEqualSplits`).
  - تقسیم بر اساس ضریب و سهم وزنی (`calculateShareSplits`).
  - تقسیم بر اساس درصد (`calculatePercentageSplits`).
- **پشتیبانی کامل از تسویه‌حساب‌های گذشته:** در نظر گرفتن تراکنش‌های تسویه نقدی/کارت‌به‌کارت ثبت‌شده قبلی در تراز جدید.
- **بدون هیچ وابستگی خارجی (Zero Runtime Dependencies)**.

## نحوه استفاده

```typescript
import {
  calculateGroupSummary,
  calculateEqualSplits
} from '@jibban/debt-engine';

const expenses = [
  {
    payerId: 'ali',
    amount: 300000,
    description: 'ناهار',
    splits: calculateEqualSplits(300000, ['ali', 'reza', 'sara']),
  },
  {
    payerId: 'reza',
    amount: 120000,
    description: 'اسنپ',
    splits: calculateEqualSplits(120000, ['reza', 'sara']),
  },
];

const summary = calculateGroupSummary(expenses);
console.log(summary.settlements);
/*
[
  { fromUser: 'sara', toUser: 'ali', amount: 160000 },
  { fromUser: 'reza', toUser: 'ali', amount: 40000 }
]
*/
```

## تست و توسعه

```fish
# اجرای آزمون‌ها با Vitest
pnpm --filter @jibban/debt-engine test

# بیلد بسته با تایپ‌اسکریپت
pnpm --filter @jibban/debt-engine build
```

## لایسنس

این بسته با الهام از پروژه Spliit و تحت مجوز [MIT License](../../ATTRIBUTION.md) منتشر شده است.
