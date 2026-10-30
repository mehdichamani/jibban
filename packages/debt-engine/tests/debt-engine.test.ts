import { describe, it, expect } from 'vitest';
import {
  calculateEqualSplits,
  calculateShareSplits,
  calculatePercentageSplits,
  calculateGroupBalances,
  simplifyDebts,
  calculateGroupSummary,
} from '../src/index.js';

describe('debt-engine: موتور محاسبات دنگ و ساده‌سازی تسویه', () => {
  describe('محاسبات تسهیم دنگ (Splits)', () => {
    it('تقسیم مساوی بدون باقیمانده کسری', () => {
      const splits = calculateEqualSplits(90000, ['ali', 'reza', 'sara']);
      expect(splits).toHaveLength(3);
      expect(splits[0].owedAmount).toBe(30000);
      expect(splits[1].owedAmount).toBe(30000);
      expect(splits[2].owedAmount).toBe(30000);
      const sum = splits.reduce((acc, curr) => acc + curr.owedAmount, 0);
      expect(sum).toBe(90000);
    });

    it('تقسیم مساوی با توزیع دقیق باقیمانده به تومان', () => {
      const splits = calculateEqualSplits(100000, ['ali', 'reza', 'sara']);
      expect(splits).toHaveLength(3);
      // ۱۰۰,۰۰۰ تقسیم بر ۳ می‌شود ۳۳,۳۳۳ به علاوه ۱ تومان باقیمانده که به نفر اول داده می‌شود
      expect(splits[0].owedAmount).toBe(33334);
      expect(splits[1].owedAmount).toBe(33333);
      expect(splits[2].owedAmount).toBe(33333);
      const sum = splits.reduce((acc, curr) => acc + curr.owedAmount, 0);
      expect(sum).toBe(100000);
    });

    it('تقسیم بر اساس ضریب و سهم وزنی', () => {
      const splits = calculateShareSplits(150000, [
        { userId: 'ali', shares: 2 },
        { userId: 'reza', shares: 1 },
      ]);
      expect(splits[0].owedAmount).toBe(100000);
      expect(splits[1].owedAmount).toBe(50000);
      expect(splits[0].owedAmount + splits[1].owedAmount).toBe(150000);
    });

    it('تقسیم بر اساس درصد', () => {
      const splits = calculatePercentageSplits(200000, [
        { userId: 'ali', percentage: 60 },
        { userId: 'reza', percentage: 40 },
      ]);
      expect(splits[0].owedAmount).toBe(120000);
      expect(splits[1].owedAmount).toBe(80000);
      expect(splits[0].owedAmount + splits[1].owedAmount).toBe(200000);
    });
  });

  describe('محاسبه تراز و ساده‌سازی تسویه (Debt Simplification)', () => {
    it('ساده‌سازی بدهی زنجیره‌ای (A به B و B به C)', () => {
      // اگر علی ۱۰۰ هزار تومان به رضا بدهکار باشد و رضا ۱۰۰ هزار تومان به سارا:
      // ترازها: علی: -۱۰۰، رضا: ۰، سارا: +۱۰۰
      const netBalances = {
        ali: -100000,
        reza: 0,
        sara: 100000,
      };

      const settlements = simplifyDebts(netBalances);
      // سیستم باید مستقیماً علی را به سارا وصل کند بدون دخالت رضا
      expect(settlements).toHaveLength(1);
      expect(settlements[0]).toEqual({
        fromUser: 'ali',
        toUser: 'sara',
        amount: 100000,
      });
    });

    it('محاسبه سناریوی چندنفره واقعی با چند هزینه مختلف', () => {
      // سناریو:
      // ۱. علی ۳۰۰ هزار تومان بابت ناهار سه نفره داده (نفری ۱۰۰ هزار تومن سهم علی، رضا و سارا)
      // ۲. رضا ۱۲۰ هزار تومان بابت تاکسی برای خودش و سارا داده (نفری ۶۰ هزار تومن)
      const expenses = [
        {
          payerId: 'ali',
          amount: 300000,
          description: 'ناهار',
          splits: [
            { userId: 'ali', owedAmount: 100000 },
            { userId: 'reza', owedAmount: 100000 },
            { userId: 'sara', owedAmount: 100000 },
          ],
        },
        {
          payerId: 'reza',
          amount: 120000,
          description: 'اسنپ',
          splits: [
            { userId: 'reza', owedAmount: 60000 },
            { userId: 'sara', owedAmount: 60000 },
          ],
        },
      ];

      const summary = calculateGroupSummary(expenses);
      expect(summary.totalExpenses).toBe(420000);

      // ترازها:
      // علی: ۳۰۰ داده، ۱۰۰ سهم خودش = +۲۰۰ (طلبکار)
      expect(summary.balances['ali'].netBalance).toBe(200000);
      // رضا: ۱۲۰ داده، ۱۶۰ سهم خودش (۱۰۰ ناهار + ۶۰ تاکسی) = -۴۰ (بدهکار)
      expect(summary.balances['reza'].netBalance).toBe(-40000);
      // سارا: ۰ داده، ۱۶۰ سهم خودش = -۱۶۰ (بدهکار)
      expect(summary.balances['sara'].netBalance).toBe(-160000);

      // ساده‌سازی تسویه‌ها:
      // سارا ۱۶۰ به علی و رضا ۴۰ به علی می‌دهد (فقط ۲ تراکنش به جای ۴ تراکنش)
      expect(summary.settlements).toHaveLength(2);
      expect(summary.settlements).toContainEqual({
        fromUser: 'sara',
        toUser: 'ali',
        amount: 160000,
      });
      expect(summary.settlements).toContainEqual({
        fromUser: 'reza',
        toUser: 'ali',
        amount: 40000,
      });
    });

    it('تاثیر تسویه‌حساب‌های ثبت‌شده قبلی روی تراز جدید', () => {
      const expenses = [
        {
          payerId: 'ali',
          amount: 200000,
          description: 'شام',
          splits: [
            { userId: 'ali', owedAmount: 100000 },
            { userId: 'reza', owedAmount: 100000 },
          ],
        },
      ];

      // رضا قبلاً ۵۰ هزار تومان را کارت به کارت کرده و در سیستم ثبت شده است
      const pastSettlements = [
        {
          fromUserId: 'reza',
          toUserId: 'ali',
          amount: 50000,
        },
      ];

      const summary = calculateGroupSummary(expenses, pastSettlements);
      // اکنون بدهی باقیمانده رضا فقط ۵۰ هزار تومان است
      expect(summary.balances['reza'].netBalance).toBe(-50000);
      expect(summary.balances['ali'].netBalance).toBe(50000);

      expect(summary.settlements).toHaveLength(1);
      expect(summary.settlements[0]).toEqual({
        fromUser: 'reza',
        toUser: 'ali',
        amount: 50000,
      });
    });
  });
});
