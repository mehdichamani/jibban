import { describe, it, expect } from 'vitest';
import {
  parseBankSms,
  toEnglishDigits,
  normalizePersianText,
  convertToToman,
  jalaliToGregorian,
  extractTransactionDate,
} from '../src/index.js';

describe('sms-parser-ir: پردازشگر پیامک‌های بانکی ایران', () => {
  describe('ابزارهای تمیزسازی و تبدیل', () => {
    it('تبدیل صحیح اعداد فارسی و عربی به انگلیسی', () => {
      expect(toEnglishDigits('۰۱۲۳۴۵۶۷۸۹')).toBe('0123456789');
      expect(toEnglishDigits('٠١٢٣٤٥٦٧٨٩')).toBe('0123456789');
      expect(toEnglishDigits('مبلغ: ۱۲۵,۰۰۰ ریال')).toBe('مبلغ: 125,000 ریال');
    });

    it('نرمال‌سازی حروف ی و ک عربی و فواصل مجازی', () => {
      const input = 'بانك ملي\u200cايران با موجودي ۲۵۰,۰۰۰ ريال';
      const output = normalizePersianText(input);
      expect(output).toContain('بانک ملی');
      expect(output).toContain('موجودی');
      expect(output).toContain('250,000');
    });

    it('تبدیل تضمینی ریال به تومان (حذف یک صفر)', () => {
      expect(convertToToman(1000000, 'rial')).toBe(100000);
      expect(convertToToman(50000, 'toman')).toBe(50000);
      expect(convertToToman(350, 'rial')).toBe(35);
    });

    it('تبدیل تاریخ شمسی به میلادی و خروجی ISO', () => {
      const [gy, gm, gd] = jalaliToGregorian(1403, 8, 9);
      expect(gy).toBe(2024);
      expect(gm).toBe(10);
      expect(gd).toBe(30);

      const iso = extractTransactionDate('تاریخ: 1403/08/09 14:35:00');
      expect(iso).toBeDefined();
      expect(iso).toContain('2024-10-30T14:35:00');
    });
  });

  describe('تست ۲۶+ بانک ایرانی طبق مستندات و نقشه راه', () => {
    // ۱. بلوبانک (Blu)
    it('پردازش پیامک خرید بلوبانک (مبلغ بر حسب تومان)', () => {
      const sms = `خرید 45,000 تومان
از کارت 621986...4321
مانده: 1,230,000 تومان
1403/08/05 13:40
بلو`;
      const result = parseBankSms(sms);
      expect(result.isBankSms).toBe(true);
      expect(result.bankName).toBe('بلو');
      expect(result.type).toBe('debit');
      expect(result.amount).toBe(45000); // تومان بدون تغییر
      expect(result.balance).toBe(1230000);
      expect(result.accountNumber).toBe('4321');
    });

    it('پردازش پیامک واریز بلوبانک', () => {
      const sms = `واریز 500,000 تومان
به کارت 621986...4321
مانده: 1,930,000 تومان
بلو`;
      const result = parseBankSms(sms);
      expect(result.isBankSms).toBe(true);
      expect(result.bankName).toBe('بلو');
      expect(result.type).toBe('credit');
      expect(result.amount).toBe(500000);
      expect(result.balance).toBe(1930000);
    });

    // ۲. بانک ملی ایران
    it('پردازش پیامک برداشت و خرید بانک ملی ایران', () => {
      const sms = `بانک ملی ایران
برداشت از حساب: 0105891234
مبلغ: 2,500,000 ریال
مانده: 14,200,000 ریال
1403/08/01 11:30
پایانه: فروشگاه کوروش`;
      const result = parseBankSms(sms);
      expect(result.isBankSms).toBe(true);
      expect(result.bankName).toBe('ملی');
      expect(result.type).toBe('debit');
      expect(result.amount).toBe(250000); // 2,500,000 ریال = 250,000 تومان
      expect(result.balance).toBe(1420000);
      expect(result.accountNumber).toBe('1234');
    });

    it('پردازش پیامک انتقال وجه بانک ملی با تاریخ فشرده و علامت مثبت/منفی', () => {
      const smsCredit = `بانك ملي ايران
انتقال:10,000,000+
حساب:92008
مانده:36,261,500
0804-20:24`;
      const resultCredit = parseBankSms(smsCredit);
      expect(resultCredit.isBankSms).toBe(true);
      expect(resultCredit.bankName).toBe('ملی');
      expect(resultCredit.type).toBe('credit');
      expect(resultCredit.amount).toBe(1000000); // 10,000,000 ریال = 1,000,000 تومان
      expect(resultCredit.balance).toBe(3626150);
      expect(resultCredit.accountNumber).toBe('2008');
      expect(resultCredit.transactionDate).toBeDefined();

      const smsDebit = `بانك ملي ايران
انتقال:20,014,500-
حساب:92008
مانده:27,661,500
0804-12:47`;
      const resultDebit = parseBankSms(smsDebit);
      expect(resultDebit.isBankSms).toBe(true);
      expect(resultDebit.bankName).toBe('ملی');
      expect(resultDebit.type).toBe('debit');
      expect(resultDebit.amount).toBe(2001450);
      expect(resultDebit.balance).toBe(2766150);
    });

    // ۳. بانک ملت
    it('پردازش پیامک واریز بانک ملت', () => {
      const sms = `بانک ملت
واریز به حساب: 1234567890
مبلغ: 10,000,000 ریال
مانده: 15,000,000 ریال
1403/08/01-14:20`;
      const result = parseBankSms(sms);
      expect(result.isBankSms).toBe(true);
      expect(result.bankName).toBe('ملت');
      expect(result.type).toBe('credit');
      expect(result.amount).toBe(1000000);
      expect(result.balance).toBe(1500000);
    });

    // ۴. بانک صادرات
    it('پردازش پیامک بانک صادرات ایران', () => {
      const sms = `بانک صادرات ایران
برداشت از حساب: 0201234567
مبلغ: 750,000 ریال
موجودی: 1,250,000 ریال
1403/08/02 12:30`;
      const result = parseBankSms(sms);
      expect(result.isBankSms).toBe(true);
      expect(result.bankName).toBe('صادرات');
      expect(result.type).toBe('debit');
      expect(result.amount).toBe(75000);
      expect(result.balance).toBe(125000);
    });

    // ۵. بانک تجارت
    it('پردازش پیامک بانک تجارت', () => {
      const sms = `تجارت
برداشت از 585983...1234
مبلغ: 400,000 ریال
مانده: 2,500,000 ریال
1403/08/02 09:15`;
      const result = parseBankSms(sms);
      expect(result.isBankSms).toBe(true);
      expect(result.bankName).toBe('تجارت');
      expect(result.type).toBe('debit');
      expect(result.amount).toBe(40000);
      expect(result.balance).toBe(250000);
      expect(result.accountNumber).toBe('1234');
    });

    // ۶. بانک سپه و بانک‌های ادغامی (انصار، قوامین، ...)
    it('پردازش پیامک بانک سپه', () => {
      const sms = `بانک سپه
برداشت از حساب: 1001234567
مبلغ: 350,000 ریال
مانده: 5,100,000 ریال
1403/08/03 16:45`;
      const result = parseBankSms(sms);
      expect(result.isBankSms).toBe(true);
      expect(result.bankName).toBe('سپه');
      expect(result.type).toBe('debit');
      expect(result.amount).toBe(35000);
      expect(result.balance).toBe(510000);
    });

    it('پردازش پیامک بانک انصار (ادغامی سپه)', () => {
      const sms = `بانک انصار
واریز به حساب: 123456
مبلغ: 4,000,000 ریال
مانده: 8,000,000 ریال`;
      const result = parseBankSms(sms);
      expect(result.isBankSms).toBe(true);
      expect(result.bankName).toBe('سپه');
      expect(result.type).toBe('credit');
      expect(result.amount).toBe(400000);
    });

    // ۷. بانک سامان
    it('پردازش پیامک بانک سامان', () => {
      const sms = `سامان
برداشت از 849-800-1234
مبلغ: 650,000 ریال
موجودی: 4,350,000 ریال
1403/08/04 18:20`;
      const result = parseBankSms(sms);
      expect(result.isBankSms).toBe(true);
      expect(result.bankName).toBe('سامان');
      expect(result.type).toBe('debit');
      expect(result.amount).toBe(65000);
      expect(result.balance).toBe(435000);
    });

    // ۸. بانک پاسارگاد
    it('پردازش پیامک بانک پاسارگاد', () => {
      const sms = `بانک پاسارگاد
برداشت از حساب 201-123-4567
مبلغ: 920,000 ریال
موجودی: 6,000,000 ریال
1403/08/04 20:10`;
      const result = parseBankSms(sms);
      expect(result.isBankSms).toBe(true);
      expect(result.bankName).toBe('پاسارگاد');
      expect(result.type).toBe('debit');
      expect(result.amount).toBe(92000);
      expect(result.balance).toBe(600000);
    });

    // ۹. بانک پارسیان
    it('پردازش پیامک بانک پارسیان', () => {
      const sms = `بانک پارسیان
برداشت مبلغ: 450,000 ریال
از کارت: 622106...5555
مانده: 2,100,000 ریال`;
      const result = parseBankSms(sms);
      expect(result.isBankSms).toBe(true);
      expect(result.bankName).toBe('پارسیان');
      expect(result.type).toBe('debit');
      expect(result.amount).toBe(45000);
      expect(result.balance).toBe(210000);
      expect(result.accountNumber).toBe('5555');
    });

    // ۱۰. بانک کشاورزی
    it('پردازش پیامک بانک کشاورزی', () => {
      const sms = `بانک کشاورزی
برداشت از حساب 45612345
مبلغ: 180,000 ریال
مانده: 820,000 ریال`;
      const result = parseBankSms(sms);
      expect(result.isBankSms).toBe(true);
      expect(result.bankName).toBe('کشاورزی');
      expect(result.type).toBe('debit');
      expect(result.amount).toBe(18000);
      expect(result.balance).toBe(82000);
    });

    // ۱۱. بانک مسکن
    it('پردازش پیامک بانک مسکن', () => {
      const sms = `بانک مسکن
برداشت مبلغ 300,000 ریال
از حساب 14001234
مانده: 1,200,000 ریال`;
      const result = parseBankSms(sms);
      expect(result.isBankSms).toBe(true);
      expect(result.bankName).toBe('مسکن');
      expect(result.type).toBe('debit');
      expect(result.amount).toBe(30000);
      expect(result.balance).toBe(120000);
    });

    // ۱۲. بانک اقتصاد نوین
    it('پردازش پیامک بانک اقتصاد نوین', () => {
      const sms = `اقتصادنوین
برداشت: 150,000 ریال
حساب: 123-456
مانده: 850,000 ریال`;
      const result = parseBankSms(sms);
      expect(result.isBankSms).toBe(true);
      expect(result.bankName).toBe('اقتصاد نوین');
      expect(result.type).toBe('debit');
      expect(result.amount).toBe(15000);
      expect(result.balance).toBe(85000);
    });

    // ۱۳. بانک آینده
    it('پردازش پیامک بانک آینده', () => {
      const sms = `بانک آینده
برداشت از حساب: 010123456
مبلغ: 800,000 ریال
موجودی: 3,400,000 ریال`;
      const result = parseBankSms(sms);
      expect(result.isBankSms).toBe(true);
      expect(result.bankName).toBe('آینده');
      expect(result.amount).toBe(80000);
      expect(result.balance).toBe(340000);
    });

    // ۱۴. بانک شهر
    it('پردازش پیامک بانک شهر', () => {
      const sms = `بانک شهر
برداشت از کارت 504706...1111
مبلغ: 220,000 ریال
مانده: 1,880,000 ریال`;
      const result = parseBankSms(sms);
      expect(result.isBankSms).toBe(true);
      expect(result.bankName).toBe('شهر');
      expect(result.amount).toBe(22000);
      expect(result.balance).toBe(188000);
      expect(result.accountNumber).toBe('1111');
    });

    // ۱۵. بانک دی
    it('پردازش پیامک بانک دی', () => {
      const sms = `بانک دی
برداشت از حساب: 01098765
مبلغ: 100,000 ریال
مانده: 900,000 ریال`;
      const result = parseBankSms(sms);
      expect(result.isBankSms).toBe(true);
      expect(result.bankName).toBe('دی');
      expect(result.amount).toBe(10000);
      expect(result.balance).toBe(90000);
    });

    // ۱۶. بانک سینا
    it('پردازش پیامک بانک سینا', () => {
      const sms = `بانک سینا
برداشت: 350,000 ریال
از حساب: 123-999
مانده: 1,650,000 ریال`;
      const result = parseBankSms(sms);
      expect(result.isBankSms).toBe(true);
      expect(result.bankName).toBe('سینا');
      expect(result.amount).toBe(35000);
      expect(result.balance).toBe(165000);
    });

    // ۱۷. بانک گردشگری
    it('پردازش پیامک بانک گردشگری', () => {
      const sms = `بانک گردشگری
برداشت از حساب 1101234
مبلغ: 500,000 ریال
مانده: 2,000,000 ریال`;
      const result = parseBankSms(sms);
      expect(result.isBankSms).toBe(true);
      expect(result.bankName).toBe('گردشگری');
      expect(result.amount).toBe(50000);
      expect(result.balance).toBe(200000);
    });

    // ۱۸. بانک کارآفرین
    it('پردازش پیامک بانک کارآفرین', () => {
      const sms = `بانک کارآفرین
برداشت مبلغ: 240,000 ریال
مانده: 1,000,000 ریال`;
      const result = parseBankSms(sms);
      expect(result.isBankSms).toBe(true);
      expect(result.bankName).toBe('کارآفرین');
      expect(result.amount).toBe(24000);
    });

    // ۱۹. بانک سرمایه
    it('پردازش پیامک بانک سرمایه', () => {
      const sms = `بانک سرمایه
برداشت از حساب: 8881234
مبلغ: 700,000 ریال
مانده: 3,000,000 ریال`;
      const result = parseBankSms(sms);
      expect(result.isBankSms).toBe(true);
      expect(result.bankName).toBe('سرمایه');
      expect(result.amount).toBe(70000);
    });

    // ۲۰. بانک خاورمیانه
    it('پردازش پیامک بانک خاورمیانه', () => {
      const sms = `بانک خاورمیانه
واریز به حساب: 9991234
مبلغ: 5,000,000 ریال
مانده: 10,000,000 ریال`;
      const result = parseBankSms(sms);
      expect(result.isBankSms).toBe(true);
      expect(result.bankName).toBe('خاورمیانه');
      expect(result.type).toBe('credit');
      expect(result.amount).toBe(500000);
    });

    // ۲۱. بانک ایران زمین
    it('پردازش پیامک بانک ایران زمین', () => {
      const sms = `بانک ایران زمین
برداشت از حساب 5551234
مبلغ: 120,000 ریال
مانده: 600,000 ریال`;
      const result = parseBankSms(sms);
      expect(result.isBankSms).toBe(true);
      expect(result.bankName).toBe('ایران زمین');
      expect(result.amount).toBe(12000);
    });

    // ۲۲. بانک رفاه کارگران
    it('پردازش پیامک بانک رفاه کارگران', () => {
      const sms = `بانک رفاه کارگران
برداشت از حساب: 12345678
مبلغ: 600,000 ریال
مانده: 1,400,000 ریال`;
      const result = parseBankSms(sms);
      expect(result.isBankSms).toBe(true);
      expect(result.bankName).toBe('رفاه کارگران');
      expect(result.amount).toBe(60000);
      expect(result.balance).toBe(140000);
    });

    // ۲۳. پست بانک ایران
    it('پردازش پیامک پست بانک', () => {
      const sms = `پست بانک ایران
برداشت: 90,000 ریال
مانده: 410,000 ریال`;
      const result = parseBankSms(sms);
      expect(result.isBankSms).toBe(true);
      expect(result.bankName).toBe('پست بانک');
      expect(result.amount).toBe(9000);
    });

    // ۲۴. بانک توسعه تعاون
    it('پردازش پیامک بانک توسعه تعاون', () => {
      const sms = `بانک توسعه تعاون
برداشت از حساب: 7771234
مبلغ: 310,000 ریال
مانده: 890,000 ریال`;
      const result = parseBankSms(sms);
      expect(result.isBankSms).toBe(true);
      expect(result.bankName).toBe('توسعه تعاون');
      expect(result.amount).toBe(31000);
    });

    // ۲۵. بانک توسعه صادرات
    it('پردازش پیامک بانک توسعه صادرات', () => {
      const sms = `بانک توسعه صادرات
واریز مبلغ: 8,000,000 ریال
مانده: 12,000,000 ریال`;
      const result = parseBankSms(sms);
      expect(result.isBankSms).toBe(true);
      expect(result.bankName).toBe('توسعه صادرات');
      expect(result.type).toBe('credit');
      expect(result.amount).toBe(800000);
    });

    // ۲۶. بانک قرض‌الحسنه رسالت
    it('پردازش پیامک بانک قرض‌الحسنه رسالت', () => {
      const sms = `بانک قرض الحسنه رسالت
برداشت از حساب 10.123456
مبلغ: 1,200,000 ریال
مانده: 4,500,000 ریال
1403/08/04 15:00`;
      const result = parseBankSms(sms);
      expect(result.isBankSms).toBe(true);
      expect(result.bankName).toBe('رسالت');
      expect(result.type).toBe('debit');
      expect(result.amount).toBe(120000);
      expect(result.balance).toBe(450000);
    });

    // ۲۷. بانک قرض‌الحسنه مهر ایران
    it('پردازش پیامک بانک قرض‌الحسنه مهر ایران', () => {
      const sms = `بانک قرض‌الحسنه مهر ایران
برداشت از حساب: 20001234
مبلغ: 900,000 ریال
مانده: 3,100,000 ریال`;
      const result = parseBankSms(sms);
      expect(result.isBankSms).toBe(true);
      expect(result.bankName).toBe('مهر ایران');
      expect(result.type).toBe('debit');
      expect(result.amount).toBe(90000);
      expect(result.balance).toBe(310000);
    });
  });

  describe('تست موتور فال‌بک عمومی (Generic Fallback Engine)', () => {
    it('پارس پیامک تراکنش ناشناس با ارقام تمام فارسی و واحد ریال', () => {
      const sms = `تراکنش موفق
برداشت از حساب: ۱۲۳۴۵۶
مبلغ: ۵۰۰،۰۰۰ ریال
مانده: ۲،۵۰۰،۰۰۰ ریال
پایانه: کافه نادری`;
      const result = parseBankSms(sms);
      expect(result.isBankSms).toBe(true);
      expect(result.bankName).toBe('بانک ناشناس');
      expect(result.type).toBe('debit');
      expect(result.amount).toBe(50000); // 500,000 ریال = 50,000 تومان
      expect(result.balance).toBe(250000);
      expect(result.description).toBe('کافه نادری');
    });

    it('پارس پیامک واریز ناشناس با واحد تومان', () => {
      const sms = `واریز به حساب
مبلغ: 80,000 تومان
موجودی: 350,000 تومان`;
      const result = parseBankSms(sms);
      expect(result.isBankSms).toBe(true);
      expect(result.type).toBe('credit');
      expect(result.amount).toBe(80000);
      expect(result.balance).toBe(350000);
    });

    it('پارس پیامک با فرمت علامت‌دار منفی و مثبت', () => {
      const smsDebit = `کارت ...9012
-75,000 ریال
مانده: 500,000 ریال`;
      const resDebit = parseBankSms(smsDebit);
      expect(resDebit.isBankSms).toBe(true);
      expect(resDebit.type).toBe('debit');
      expect(resDebit.amount).toBe(7500);

      const smsCredit = `حساب 1234
+150,000 ریال
مانده: 650,000 ریال`;
      const resCredit = parseBankSms(smsCredit);
      expect(resCredit.isBankSms).toBe(true);
      expect(resCredit.type).toBe('credit');
      expect(resCredit.amount).toBe(15000);
    });
  });

  describe('تست پیامک‌های غیربانکی و نامعتبر (False Positives)', () => {
    it('رد کردن پیامک‌های حاوی کد تایید و رمز پویا', () => {
      const sms = `کد تایید ورود شما به همراه بانک: 84931`;
      const result = parseBankSms(sms);
      expect(result.isBankSms).toBe(false);
      expect(result.amount).toBe(0);
    });

    it('رد کردن پیامک‌های تبلیغاتی', () => {
      const sms = `تخفیف ویژه پاییزه! تا ۵۰ درصد تخفیف روی تمامی محصولات. برای خرید کلیک کنید.`;
      const result = parseBankSms(sms);
      expect(result.isBankSms).toBe(false);
      expect(result.amount).toBe(0);
    });

    it('رد کردن پیامک‌های شخصی', () => {
      const sms = `سلام چطوری؟ امشب ساعت ۹ شام منتظرتیم.`;
      const result = parseBankSms(sms);
      expect(result.isBankSms).toBe(false);
    });

    it('مدیریت ورودی‌های خالی و نامعتبر', () => {
      expect(parseBankSms('').isBankSms).toBe(false);
      // @ts-expect-error تست ورودی نامعتبر
      expect(parseBankSms(null).isBankSms).toBe(false);
    });

    it('رد کردن قبوض و صورت‌حساب‌های اپراتورها و کلمه سامانه', () => {
      const mciBill = `مشترک گرامی شماره 9146136921
صورت‌حساب مهر 1405 
بدهی پیشین: 645 ريال
قابل پرداخت: 488000 ریال
مهلت پرداخت: 1405/8/15 
همراه اول`;
      expect(parseBankSms(mciBill).isBankSms).toBe(false);

      const mciDetails = `مشترک گرامی شماره: 9146136921 جزئيات صورت‌حساب مهر 1405 مکالمه: 91710  پيامک: 23 سامانه 9990`;
      expect(parseBankSms(mciDetails).isBankSms).toBe(false);

      const mciReceipt = `مشترک گرامی
ضمن تشکر، پرداخت شما به مبلغ 488000 ریال دریافت شد.
مشاهده جزئیات صورتحساب و دسترسی به تمامی خدمات همراه اول در اپلیکیشن همراه من`;
      expect(parseBankSms(mciReceipt).isBankSms).toBe(false);
    });
  });
});
