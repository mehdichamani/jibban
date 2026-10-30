import { ExpenseSplit } from './types.js';

/**
 * تقسیم کاملاً مساوی یک مبلغ بین اعضا با توزیع دقیق باقیمانده کسری
 */
export function calculateEqualSplits(
  totalAmount: number,
  participantIds: string[]
): ExpenseSplit[] {
  if (!participantIds || participantIds.length === 0 || totalAmount <= 0) {
    return [];
  }

  const count = participantIds.length;
  const baseShare = Math.floor(totalAmount / count);
  const remainder = totalAmount - baseShare * count;

  return participantIds.map((userId, index) => ({
    userId,
    // توزیع عادلانه باقیمانده به نفرات اول تا جمع کل دقیقاً برابر کل هزینه شود
    owedAmount: baseShare + (index < remainder ? 1 : 0),
  }));
}

/**
 * تقسیم بر اساس سهم/ضریب وزنی (مثلاً نفر اول ۲ سهم، نفر دوم ۱ سهم)
 */
export function calculateShareSplits(
  totalAmount: number,
  shares: Array<{ userId: string; shares: number }>
): ExpenseSplit[] {
  if (!shares || shares.length === 0 || totalAmount <= 0) {
    return [];
  }

  const totalShares = shares.reduce((acc, curr) => acc + Math.max(0, curr.shares), 0);
  if (totalShares <= 0) {
    return [];
  }

  let accumulated = 0;
  const splits: ExpenseSplit[] = [];

  for (let i = 0; i < shares.length; i++) {
    const item = shares[i];
    if (i === shares.length - 1) {
      // برای آخرین نفر، مابه‌التفاوت را می‌گذاریم تا جمع برابر کل شود
      splits.push({
        userId: item.userId,
        owedAmount: totalAmount - accumulated,
      });
    } else {
      const shareAmount = Math.round((totalAmount * item.shares) / totalShares);
      accumulated += shareAmount;
      splits.push({
        userId: item.userId,
        owedAmount: shareAmount,
      });
    }
  }

  return splits;
}

/**
 * تقسیم بر اساس درصد (مجموع درصدها باید نزدیک ۱۰۰ باشد)
 */
export function calculatePercentageSplits(
  totalAmount: number,
  percentages: Array<{ userId: string; percentage: number }>
): ExpenseSplit[] {
  if (!percentages || percentages.length === 0 || totalAmount <= 0) {
    return [];
  }

  let accumulated = 0;
  const splits: ExpenseSplit[] = [];

  for (let i = 0; i < percentages.length; i++) {
    const item = percentages[i];
    if (i === percentages.length - 1) {
      splits.push({
        userId: item.userId,
        owedAmount: Math.max(0, totalAmount - accumulated),
      });
    } else {
      const amount = Math.round((totalAmount * item.percentage) / 100);
      accumulated += amount;
      splits.push({
        userId: item.userId,
        owedAmount: amount,
      });
    }
  }

  return splits;
}
