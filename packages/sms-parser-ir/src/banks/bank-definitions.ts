import { BankRule } from '../types.js';

/**
 * فهرست جامع تعاریف و نام‌های مستعار ۲۶+ بانک و موسسه مالی ایران
 */
export const IRANIAN_BANKS: BankRule[] = [
  // ۱. نئوبانک‌ها و قرض‌الحسنه
  {
    id: 'blubank',
    name: 'بلو',
    aliases: ['بلوبانک', 'بلو بانک', 'blubank', 'blu', 'بلو'],
    defaultCurrency: 'toman', // بلوبانک همواره مبالغ را به تومان اعلام می‌کند
  },
  {
    id: 'resalat',
    name: 'رسالت',
    aliases: ['بانک قرض الحسنه رسالت', 'بانک قرض‌الحسنه رسالت', 'رسالت', 'resalat'],
    defaultCurrency: 'rial',
  },
  {
    id: 'mehr_iran',
    name: 'مهر ایران',
    aliases: ['بانک قرض الحسنه مهر ایران', 'بانک قرض‌الحسنه مهر ایران', 'مهر ایران', 'قرض الحسنه مهر', 'qmb'],
    defaultCurrency: 'rial',
  },

  // ۲. بانک‌های دولتی
  {
    id: 'melli',
    name: 'ملی',
    aliases: ['بانک ملی ایران', 'بانک ملی', 'ملی ایران', 'ملی', 'bmi', 'سامانه بام', 'بام ملی'],
    defaultCurrency: 'rial',
  },
  {
    id: 'sepah',
    name: 'سپه',
    aliases: [
      'بانک سپه',
      'سپه',
      'sepah',
      // ادغامی‌های بانک سپه
      'بانک انصار',
      'انصار',
      'بانک قوامین',
      'قوامین',
      'بانک مهر اقتصاد',
      'مهر اقتصاد',
      'بانک حکمت ایرانیان',
      'حکمت ایرانیان',
      'موسسه کوثر',
      'کوثر',
    ],
    defaultCurrency: 'rial',
  },
  {
    id: 'keshavarzi',
    name: 'کشاورزی',
    aliases: ['بانک کشاورزی', 'کشاورزی', 'keshavarzi', 'bki'],
    defaultCurrency: 'rial',
  },
  {
    id: 'maskan',
    name: 'مسکن',
    aliases: ['بانک مسکن', 'مسکن', 'maskan'],
    defaultCurrency: 'rial',
  },
  {
    id: 'post_bank',
    name: 'پست بانک',
    aliases: ['پست بانک ایران', 'پست بانک', 'پست‌بانک', 'postbank', 'post bank'],
    defaultCurrency: 'rial',
  },
  {
    id: 'tose_taavon',
    name: 'توسعه تعاون',
    aliases: ['بانک توسعه تعاون', 'توسعه تعاون', 'ttbank', 'taavon'],
    defaultCurrency: 'rial',
  },
  {
    id: 'edbi',
    name: 'توسعه صادرات',
    aliases: ['بانک توسعه صادرات ایران', 'بانک توسعه صادرات', 'توسعه صادرات', 'edbi'],
    defaultCurrency: 'rial',
  },

  // ۳. بانک‌های تجاری و خصوصی
  {
    id: 'mellat',
    name: 'ملت',
    aliases: ['بانک ملت', 'ملت', 'mellat'],
    defaultCurrency: 'rial',
  },
  {
    id: 'saderat',
    name: 'صادرات',
    aliases: ['بانک صادرات ایران', 'بانک صادرات', 'صادرات', 'bsi'],
    defaultCurrency: 'rial',
  },
  {
    id: 'tejarat',
    name: 'تجارت',
    aliases: ['بانک تجارت', 'تجارت', 'tejarat', 'tejaratbank'],
    defaultCurrency: 'rial',
  },
  {
    id: 'pasargad',
    name: 'پاسارگاد',
    aliases: ['بانک پاسارگاد', 'پاسارگاد', 'pasargad', 'bpi', 'پی پاد', 'پی‌پاد'],
    defaultCurrency: 'rial',
  },
  {
    id: 'saman',
    name: 'سامان',
    aliases: ['بانک سامان', 'سامان', 'saman', 'سامانت', 'سامانک'],
    defaultCurrency: 'rial',
  },
  {
    id: 'parsian',
    name: 'پارسیان',
    aliases: ['بانک پارسیان', 'پارسیان', 'parsian'],
    defaultCurrency: 'rial',
  },
  {
    id: 'eghtesad_novin',
    name: 'اقتصاد نوین',
    aliases: ['بانک اقتصاد نوین', 'اقتصاد نوین', 'اقتصادنوین', 'enbank', 'en bank'],
    defaultCurrency: 'rial',
  },
  {
    id: 'ayandeh',
    name: 'آینده',
    aliases: ['بانک آینده', 'آینده', 'ayandeh', 'کیلید', 'کیلید آینده'],
    defaultCurrency: 'rial',
  },
  {
    id: 'shahr',
    name: 'شهر',
    aliases: ['بانک شهر', 'شهر', 'shahr', 'shahr bank'],
    defaultCurrency: 'rial',
  },
  {
    id: 'dey',
    name: 'دی',
    aliases: ['بانک دی', 'دی', 'dey', 'dey bank'],
    defaultCurrency: 'rial',
  },
  {
    id: 'sina',
    name: 'سینا',
    aliases: ['بانک سینا', 'سینا', 'sina', 'sina bank'],
    defaultCurrency: 'rial',
  },
  {
    id: 'gardeshgari',
    name: 'گردشگری',
    aliases: ['بانک گردشگری', 'گردشگری', 'tourism bank', 'gardeshgari'],
    defaultCurrency: 'rial',
  },
  {
    id: 'karafarin',
    name: 'کارآفرین',
    aliases: ['بانک کارآفرین', 'کارآفرین', 'karafarin'],
    defaultCurrency: 'rial',
  },
  {
    id: 'sarmayeh',
    name: 'سرمایه',
    aliases: ['بانک سرمایه', 'سرمایه', 'sarmayeh'],
    defaultCurrency: 'rial',
  },
  {
    id: 'khavarmianeh',
    name: 'خاورمیانه',
    aliases: ['بانک خاورمیانه', 'خاورمیانه', 'middle east bank', 'khavarmianeh'],
    defaultCurrency: 'rial',
  },
  {
    id: 'iran_zamin',
    name: 'ایران زمین',
    aliases: ['بانک ایران زمین', 'بانک ایران‌زمین', 'ایران زمین', 'ایران‌زمین', 'iranzamin'],
    defaultCurrency: 'rial',
  },
  {
    id: 'refah',
    name: 'رفاه کارگران',
    aliases: ['بانک رفاه کارگران', 'بانک رفاه', 'رفاه کارگران', 'رفاه', 'refah'],
    defaultCurrency: 'rial',
  },
];

/**
 * تشخیص نام بانک از متن پیامک
 */
export function identifyBank(text: string): BankRule | undefined {
  const lowerText = text.toLowerCase();

  // ابتدا بانک‌های با نام بلندتر و مشخص‌تر بررسی می‌شوند تا تداخل نام پیش نیاید
  const sortedBanks = [...IRANIAN_BANKS].sort(
    (a, b) => Math.max(...b.aliases.map((al) => al.length)) - Math.max(...a.aliases.map((al) => al.length))
  );

  for (const bank of sortedBanks) {
    for (const alias of bank.aliases) {
      const lowerAlias = alias.toLowerCase();
      if (!lowerAlias.includes(' ')) {
        // برای اسامی تک کلمه‌ای، بررسی کلمه مستقل الزامی است تا مثلاً «سامانه» با «سامان» یا «مملکت» با «ملت» اشتباه نشود
        const escaped = lowerAlias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const wordRegex = new RegExp(`(?:^|[^a-zA-Z0-9آ-ی])${escaped}(?:$|[^a-zA-Z0-9آ-ی])`, 'i');
        if (wordRegex.test(lowerText)) {
          return bank;
        }
      } else if (lowerText.includes(lowerAlias)) {
        return bank;
      }
    }
  }

  return undefined;
}
