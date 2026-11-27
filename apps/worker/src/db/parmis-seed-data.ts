// داده‌های پایه رسمی پارمیس استخراج‌شده از دیتابیس بومی (برای راه‌اندازی تمیز Cold Start)
export interface ParmisSeedAccount {
  Ac_id: number;
  Ac_parent_id: number;
  Ac_title: string;
  Ac_isLeaf: number | null;
  Ac_isSystematic: number | null;
  Ac_payable: number | null;
  Ac_recivable: number | null;
  Ac_enable: number | null;
  ac_icon: string | null;
}

export interface ParmisSeedBank {
  id: number;
  Bank_name: string;
  systematic: number;
  imageName: string;
}

export const PARMIS_SEED_ACCOUNTS: ParmisSeedAccount[] = [
  {
    "Ac_id": 1,
    "Ac_parent_id": 0,
    "Ac_title": "هزینه ها",
    "Ac_isLeaf": 0,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 2,
    "Ac_parent_id": 0,
    "Ac_title": "درآمد ها",
    "Ac_isLeaf": 0,
    "Ac_isSystematic": 1,
    "Ac_payable": 0,
    "Ac_recivable": 1,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 3,
    "Ac_parent_id": 0,
    "Ac_title": "صندوق ها",
    "Ac_isLeaf": 0,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 1,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 4,
    "Ac_parent_id": 0,
    "Ac_title": "بانک ها",
    "Ac_isLeaf": 0,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 1,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 5,
    "Ac_parent_id": 0,
    "Ac_title": "بدهکاران",
    "Ac_isLeaf": 0,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 1,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 6,
    "Ac_parent_id": 0,
    "Ac_title": "بستانکاران",
    "Ac_isLeaf": 0,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 1,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 7,
    "Ac_parent_id": 0,
    "Ac_title": "دارایی ها",
    "Ac_isLeaf": 0,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 1,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 8,
    "Ac_parent_id": 0,
    "Ac_title": "بدهی ها",
    "Ac_isLeaf": 0,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 1,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 10,
    "Ac_parent_id": 0,
    "Ac_title": "غیره ...",
    "Ac_isLeaf": 0,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 1,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 11,
    "Ac_parent_id": 8,
    "Ac_title": "چک ها و اسناد پرداختنی",
    "Ac_isLeaf": 0,
    "Ac_isSystematic": 2,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "70"
  },
  {
    "Ac_id": 12,
    "Ac_parent_id": 1,
    "Ac_title": "اغذیه",
    "Ac_isLeaf": 0,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "62"
  },
  {
    "Ac_id": 13,
    "Ac_parent_id": 1,
    "Ac_title": "مسکن",
    "Ac_isLeaf": 0,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "5"
  },
  {
    "Ac_id": 14,
    "Ac_parent_id": 1,
    "Ac_title": "البسه و پوشاک",
    "Ac_isLeaf": 0,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "63"
  },
  {
    "Ac_id": 15,
    "Ac_parent_id": 1,
    "Ac_title": "خودرو",
    "Ac_isLeaf": 0,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "3"
  },
  {
    "Ac_id": 16,
    "Ac_parent_id": 1,
    "Ac_title": "ایاب و ذهاب و مسافرت",
    "Ac_isLeaf": 0,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "33"
  },
  {
    "Ac_id": 17,
    "Ac_parent_id": 1,
    "Ac_title": "آموزش و تحصیلات",
    "Ac_isLeaf": 0,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "10"
  },
  {
    "Ac_id": 18,
    "Ac_parent_id": 1,
    "Ac_title": "فرهنگی و سرگرمی",
    "Ac_isLeaf": 0,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "12"
  },
  {
    "Ac_id": 19,
    "Ac_parent_id": 1,
    "Ac_title": "هدایا",
    "Ac_isLeaf": 0,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "14"
  },
  {
    "Ac_id": 20,
    "Ac_parent_id": 1,
    "Ac_title": "بهداشتی و درمانی",
    "Ac_isLeaf": 0,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "9"
  },
  {
    "Ac_id": 21,
    "Ac_parent_id": 1,
    "Ac_title": "هزینه های اداری",
    "Ac_isLeaf": 0,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "71"
  },
  {
    "Ac_id": 22,
    "Ac_parent_id": 1,
    "Ac_title": "دیون اسلامی",
    "Ac_isLeaf": 0,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "31"
  },
  {
    "Ac_id": 23,
    "Ac_parent_id": 1,
    "Ac_title": "سرمایه گذاری",
    "Ac_isLeaf": 0,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "49"
  },
  {
    "Ac_id": 24,
    "Ac_parent_id": 13,
    "Ac_title": "قبض آب",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 25,
    "Ac_parent_id": 13,
    "Ac_title": "قبض برق",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 26,
    "Ac_parent_id": 13,
    "Ac_title": "قبض گاز",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 27,
    "Ac_parent_id": 13,
    "Ac_title": "قبض تلفن",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 28,
    "Ac_parent_id": 13,
    "Ac_title": "شارژ ساختمان",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 29,
    "Ac_parent_id": 13,
    "Ac_title": "اجاره منزل",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 30,
    "Ac_parent_id": 13,
    "Ac_title": "لوازم منزل",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 31,
    "Ac_parent_id": 13,
    "Ac_title": "قبض/شارژ موبایل",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 32,
    "Ac_parent_id": 13,
    "Ac_title": "بیمه ساختمان",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 33,
    "Ac_parent_id": 13,
    "Ac_title": "تعمیرات ساختمان",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 34,
    "Ac_parent_id": 13,
    "Ac_title": "عوارض شهرداری",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 35,
    "Ac_parent_id": 13,
    "Ac_title": "مالیات",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 36,
    "Ac_parent_id": 2,
    "Ac_title": "حقوق",
    "Ac_isLeaf": 0,
    "Ac_isSystematic": 1,
    "Ac_payable": 0,
    "Ac_recivable": 1,
    "Ac_enable": null,
    "ac_icon": "8"
  },
  {
    "Ac_id": 37,
    "Ac_parent_id": 2,
    "Ac_title": "فروش",
    "Ac_isLeaf": 0,
    "Ac_isSystematic": 1,
    "Ac_payable": 0,
    "Ac_recivable": 1,
    "Ac_enable": null,
    "ac_icon": "16"
  },
  {
    "Ac_id": 38,
    "Ac_parent_id": 2,
    "Ac_title": "سود سرمایه",
    "Ac_isLeaf": 0,
    "Ac_isSystematic": 1,
    "Ac_payable": 0,
    "Ac_recivable": 1,
    "Ac_enable": null,
    "ac_icon": "18"
  },
  {
    "Ac_id": 39,
    "Ac_parent_id": 2,
    "Ac_title": "یارانه و هدایا",
    "Ac_isLeaf": 0,
    "Ac_isSystematic": 1,
    "Ac_payable": 0,
    "Ac_recivable": 1,
    "Ac_enable": null,
    "ac_icon": "73"
  },
  {
    "Ac_id": 40,
    "Ac_parent_id": 2,
    "Ac_title": "درآمد اجاره",
    "Ac_isLeaf": 0,
    "Ac_isSystematic": 1,
    "Ac_payable": 0,
    "Ac_recivable": 1,
    "Ac_enable": null,
    "ac_icon": "15"
  },
  {
    "Ac_id": 41,
    "Ac_parent_id": 12,
    "Ac_title": "تنقلات",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 42,
    "Ac_parent_id": 12,
    "Ac_title": "گوشت قرمز",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 43,
    "Ac_parent_id": 12,
    "Ac_title": "مرغ",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 44,
    "Ac_parent_id": 12,
    "Ac_title": "ماهی و میگو",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 45,
    "Ac_parent_id": 12,
    "Ac_title": "برنج",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 46,
    "Ac_parent_id": 12,
    "Ac_title": "نان",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 47,
    "Ac_parent_id": 12,
    "Ac_title": "لبنیات",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 48,
    "Ac_parent_id": 12,
    "Ac_title": "نوشیدنی",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 49,
    "Ac_parent_id": 12,
    "Ac_title": "حبوبات",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 50,
    "Ac_parent_id": 12,
    "Ac_title": "غلات",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 51,
    "Ac_parent_id": 12,
    "Ac_title": "میوه و تره بار",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 52,
    "Ac_parent_id": 12,
    "Ac_title": "غذای بیرون",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 53,
    "Ac_parent_id": 12,
    "Ac_title": "رستوران",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 54,
    "Ac_parent_id": 12,
    "Ac_title": "کافی شاپ",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 55,
    "Ac_parent_id": 12,
    "Ac_title": "سایر",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 56,
    "Ac_parent_id": 14,
    "Ac_title": "خیاطی",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 57,
    "Ac_parent_id": 14,
    "Ac_title": "خرید پوشاک",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 58,
    "Ac_parent_id": 14,
    "Ac_title": "خشکشویی",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 59,
    "Ac_parent_id": 14,
    "Ac_title": "سایر",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 60,
    "Ac_parent_id": 15,
    "Ac_title": "بنزین",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 61,
    "Ac_parent_id": 15,
    "Ac_title": "تعویض روغن",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 62,
    "Ac_parent_id": 15,
    "Ac_title": "جرایم رانندگی",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 63,
    "Ac_parent_id": 15,
    "Ac_title": "طرح ترافیک",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 64,
    "Ac_parent_id": 15,
    "Ac_title": "پارکینگ",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 65,
    "Ac_parent_id": 15,
    "Ac_title": "بیمه ثالث",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 66,
    "Ac_parent_id": 15,
    "Ac_title": "بیمه بدنه",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 67,
    "Ac_parent_id": 15,
    "Ac_title": "تغیرات اساسی",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 68,
    "Ac_parent_id": 15,
    "Ac_title": "عوارض خودرو",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 69,
    "Ac_parent_id": 16,
    "Ac_title": "کرایه آژانس",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 70,
    "Ac_parent_id": 16,
    "Ac_title": "کرایه تاکسی",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 71,
    "Ac_parent_id": 16,
    "Ac_title": "کرایه اتوبوس",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 72,
    "Ac_parent_id": 16,
    "Ac_title": "کرایه مترو",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 73,
    "Ac_parent_id": 16,
    "Ac_title": "سرویس",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 74,
    "Ac_parent_id": 16,
    "Ac_title": "بلیط قطار",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 75,
    "Ac_parent_id": 16,
    "Ac_title": "بلیط هواپیما",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 76,
    "Ac_parent_id": 16,
    "Ac_title": "بلیط اتوبوس",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 77,
    "Ac_parent_id": 16,
    "Ac_title": "کرایه هتل و محل اقامت",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 78,
    "Ac_parent_id": 17,
    "Ac_title": "کلاس های ورزشی",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 79,
    "Ac_parent_id": 17,
    "Ac_title": "شهریه مدرسه",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 80,
    "Ac_parent_id": 17,
    "Ac_title": "شهریه دانشگاه",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 81,
    "Ac_parent_id": 17,
    "Ac_title": "شهریه مهد کودک",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 82,
    "Ac_parent_id": 17,
    "Ac_title": "لوازم التحریر",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 83,
    "Ac_parent_id": 17,
    "Ac_title": "کلاس های آموزشی",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 84,
    "Ac_parent_id": 17,
    "Ac_title": "سایر",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 85,
    "Ac_parent_id": 18,
    "Ac_title": "نرم افزار ",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 86,
    "Ac_parent_id": 18,
    "Ac_title": "کتاب",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 87,
    "Ac_parent_id": 18,
    "Ac_title": "روزنامه و مجله",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 88,
    "Ac_parent_id": 18,
    "Ac_title": "فیلم",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 89,
    "Ac_parent_id": 18,
    "Ac_title": "سینما",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 90,
    "Ac_parent_id": 18,
    "Ac_title": "موسیقی",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 91,
    "Ac_parent_id": 18,
    "Ac_title": "تئاتر",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 92,
    "Ac_parent_id": 18,
    "Ac_title": "کنسرت",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 93,
    "Ac_parent_id": 18,
    "Ac_title": "اینترنت",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 94,
    "Ac_parent_id": 18,
    "Ac_title": "بازی و سرگرمی",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 95,
    "Ac_parent_id": 18,
    "Ac_title": "اماکن فرهنگی",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 96,
    "Ac_parent_id": 18,
    "Ac_title": "سایر",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 97,
    "Ac_parent_id": 19,
    "Ac_title": "سوغات",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 98,
    "Ac_parent_id": 19,
    "Ac_title": "فرهنگی",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 99,
    "Ac_parent_id": 19,
    "Ac_title": "لوازم",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 100,
    "Ac_parent_id": 19,
    "Ac_title": "سایر",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 101,
    "Ac_parent_id": 20,
    "Ac_title": "ویزیت پزشک",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 102,
    "Ac_parent_id": 20,
    "Ac_title": "لوازم بهداشتی",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 103,
    "Ac_parent_id": 20,
    "Ac_title": "لوازم آرایشی",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 104,
    "Ac_parent_id": 20,
    "Ac_title": "لوازم پزشکی",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 105,
    "Ac_parent_id": 20,
    "Ac_title": "دندانپزشکی",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 106,
    "Ac_parent_id": 20,
    "Ac_title": "جراحی",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 107,
    "Ac_parent_id": 20,
    "Ac_title": "بستری",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 108,
    "Ac_parent_id": 20,
    "Ac_title": "آزمایشگاه",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 109,
    "Ac_parent_id": 20,
    "Ac_title": "تصویر برداری",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 110,
    "Ac_parent_id": 20,
    "Ac_title": "دارو",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 111,
    "Ac_parent_id": 20,
    "Ac_title": "بیمه ها",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 112,
    "Ac_parent_id": 20,
    "Ac_title": "سایر",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 113,
    "Ac_parent_id": 21,
    "Ac_title": "هزینه های تشکیل پرونده",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 114,
    "Ac_parent_id": 21,
    "Ac_title": "کارمزد بانک",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 115,
    "Ac_parent_id": 21,
    "Ac_title": "کارمزد خدمات دولتی و اداری",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 116,
    "Ac_parent_id": 21,
    "Ac_title": "سایر",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 117,
    "Ac_parent_id": 22,
    "Ac_title": "دیه",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 118,
    "Ac_parent_id": 22,
    "Ac_title": "خمس",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 119,
    "Ac_parent_id": 22,
    "Ac_title": "زکات",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 120,
    "Ac_parent_id": 22,
    "Ac_title": "فطریه",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 121,
    "Ac_parent_id": 22,
    "Ac_title": "صدقه",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 122,
    "Ac_parent_id": 22,
    "Ac_title": "نذورات",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 123,
    "Ac_parent_id": 22,
    "Ac_title": "کفاره",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 124,
    "Ac_parent_id": 22,
    "Ac_title": "سایر",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 125,
    "Ac_parent_id": 23,
    "Ac_title": "سهام",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 126,
    "Ac_parent_id": 23,
    "Ac_title": "اوراق مشارکت",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 127,
    "Ac_parent_id": 23,
    "Ac_title": "سهام عدالت",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 128,
    "Ac_parent_id": 23,
    "Ac_title": "سایر",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 129,
    "Ac_parent_id": 36,
    "Ac_title": "حقوق ماهیانه",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 0,
    "Ac_recivable": 1,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 130,
    "Ac_parent_id": 36,
    "Ac_title": "عیدی",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 0,
    "Ac_recivable": 1,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 131,
    "Ac_parent_id": 36,
    "Ac_title": "پاداش",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 0,
    "Ac_recivable": 1,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 132,
    "Ac_parent_id": 36,
    "Ac_title": "مزایا",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 0,
    "Ac_recivable": 1,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 133,
    "Ac_parent_id": 36,
    "Ac_title": "سایر",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 0,
    "Ac_recivable": 1,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 134,
    "Ac_parent_id": 37,
    "Ac_title": "لوازم",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 0,
    "Ac_recivable": 1,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 135,
    "Ac_parent_id": 37,
    "Ac_title": "مسکن",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 0,
    "Ac_recivable": 1,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 136,
    "Ac_parent_id": 37,
    "Ac_title": "خودرو",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 0,
    "Ac_recivable": 1,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 137,
    "Ac_parent_id": 37,
    "Ac_title": "سایر",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 0,
    "Ac_recivable": 1,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 138,
    "Ac_parent_id": 38,
    "Ac_title": "سود سپرده بانکی",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 0,
    "Ac_recivable": 1,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 139,
    "Ac_parent_id": 38,
    "Ac_title": "سود اوراق مشارکت",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 0,
    "Ac_recivable": 1,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 140,
    "Ac_parent_id": 38,
    "Ac_title": "سود سهام",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 0,
    "Ac_recivable": 1,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 141,
    "Ac_parent_id": 38,
    "Ac_title": "سایر",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 0,
    "Ac_recivable": 1,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 142,
    "Ac_parent_id": 39,
    "Ac_title": "یارانه نقدی",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 0,
    "Ac_recivable": 1,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 143,
    "Ac_parent_id": 39,
    "Ac_title": "هدیه",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 0,
    "Ac_recivable": 1,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 144,
    "Ac_parent_id": 39,
    "Ac_title": "سایر",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 0,
    "Ac_recivable": 1,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 145,
    "Ac_parent_id": 40,
    "Ac_title": "اجاره آپارتمان",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 0,
    "Ac_recivable": 1,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 146,
    "Ac_parent_id": 40,
    "Ac_title": "اجاره مغازه",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 0,
    "Ac_recivable": 1,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 147,
    "Ac_parent_id": 40,
    "Ac_title": "اجاره شرکت",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 0,
    "Ac_recivable": 1,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 148,
    "Ac_parent_id": 40,
    "Ac_title": "سایر",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 0,
    "Ac_recivable": 1,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 149,
    "Ac_parent_id": 7,
    "Ac_title": "مسکن",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "2"
  },
  {
    "Ac_id": 150,
    "Ac_parent_id": 7,
    "Ac_title": "خودرو",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "29"
  },
  {
    "Ac_id": 151,
    "Ac_parent_id": 7,
    "Ac_title": "زمین",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "20"
  },
  {
    "Ac_id": 152,
    "Ac_parent_id": 3,
    "Ac_title": "کیف پول",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 1,
    "Ac_enable": null,
    "ac_icon": "36"
  },
  {
    "Ac_id": 153,
    "Ac_parent_id": 3,
    "Ac_title": "گاو صندوق",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 1,
    "Ac_enable": null,
    "ac_icon": "65"
  },
  {
    "Ac_id": 154,
    "Ac_parent_id": 3,
    "Ac_title": "منزل",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 1,
    "Ac_enable": null,
    "ac_icon": "19"
  },
  {
    "Ac_id": 156,
    "Ac_parent_id": 15,
    "Ac_title": "سایر",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 157,
    "Ac_parent_id": 13,
    "Ac_title": "سایر",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 161,
    "Ac_parent_id": 0,
    "Ac_title": "اشخاص",
    "Ac_isLeaf": 0,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 1,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 162,
    "Ac_parent_id": 0,
    "Ac_title": "سرمایه",
    "Ac_isLeaf": 0,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 1,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 163,
    "Ac_parent_id": 7,
    "Ac_title": "اسناد دریافتنی",
    "Ac_isLeaf": 0,
    "Ac_isSystematic": 2,
    "Ac_payable": 0,
    "Ac_recivable": 1,
    "Ac_enable": null,
    "ac_icon": "72"
  },
  {
    "Ac_id": 164,
    "Ac_parent_id": 163,
    "Ac_title": "اسناد دریافتنی نزد صندوق",
    "Ac_isLeaf": 0,
    "Ac_isSystematic": 2,
    "Ac_payable": 0,
    "Ac_recivable": 1,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 165,
    "Ac_parent_id": 163,
    "Ac_title": "اسناد دریافتنی درجریان وصول",
    "Ac_isLeaf": 0,
    "Ac_isSystematic": 2,
    "Ac_payable": 0,
    "Ac_recivable": 1,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 167,
    "Ac_parent_id": 8,
    "Ac_title": "وام بانکی",
    "Ac_isLeaf": 0,
    "Ac_isSystematic": 2,
    "Ac_payable": 0,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "68"
  },
  {
    "Ac_id": 169,
    "Ac_parent_id": 1,
    "Ac_title": "هزینه کارمزدوبهره",
    "Ac_isLeaf": 0,
    "Ac_isSystematic": 2,
    "Ac_payable": 0,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "38"
  },
  {
    "Ac_id": 170,
    "Ac_parent_id": 1,
    "Ac_title": "جریمه دیرکرد وام بانکی",
    "Ac_isLeaf": 0,
    "Ac_isSystematic": 2,
    "Ac_payable": 0,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 171,
    "Ac_parent_id": 8,
    "Ac_title": "بهره سنوات آتی",
    "Ac_isLeaf": 0,
    "Ac_isSystematic": 2,
    "Ac_payable": 0,
    "Ac_recivable": 0,
    "Ac_enable": null,
    "ac_icon": "defaultpic"
  },
  {
    "Ac_id": 172,
    "Ac_parent_id": 162,
    "Ac_title": "سود و زیان",
    "Ac_isLeaf": 1,
    "Ac_isSystematic": 1,
    "Ac_payable": 1,
    "Ac_recivable": 1,
    "Ac_enable": 1,
    "ac_icon": "60"
  }
];

export const PARMIS_SEED_BANKS: ParmisSeedBank[] = [
  {
    "id": 1,
    "Bank_name": "مسکن",
    "systematic": 1,
    "imageName": "maskan.png"
  },
  {
    "id": 2,
    "Bank_name": "دی",
    "systematic": 1,
    "imageName": "dey.png"
  },
  {
    "id": 3,
    "Bank_name": "ملی",
    "systematic": 1,
    "imageName": "melli.png"
  },
  {
    "id": 4,
    "Bank_name": "ملت",
    "systematic": 1,
    "imageName": "mellat.png"
  },
  {
    "id": 5,
    "Bank_name": "پاسارگاد",
    "systematic": 1,
    "imageName": "pasargad.png"
  },
  {
    "id": 6,
    "Bank_name": "پارسیان",
    "systematic": 1,
    "imageName": "parsian.png"
  },
  {
    "id": 7,
    "Bank_name": "شهر",
    "systematic": 1,
    "imageName": "shahr.png"
  },
  {
    "id": 8,
    "Bank_name": "آینده",
    "systematic": 1,
    "imageName": "ayande.png"
  },
  {
    "id": 9,
    "Bank_name": "سامان",
    "systematic": 1,
    "imageName": "saman.png"
  },
  {
    "id": 10,
    "Bank_name": "تجارت",
    "systematic": 1,
    "imageName": "tejarat.png"
  },
  {
    "id": 11,
    "Bank_name": "صادرات",
    "systematic": 1,
    "imageName": "saderat.png"
  },
  {
    "id": 12,
    "Bank_name": "سپه",
    "systematic": 1,
    "imageName": "sepah.png"
  },
  {
    "id": 13,
    "Bank_name": "اقتصاد نوین",
    "systematic": 1,
    "imageName": "eghtesadnovin.png"
  },
  {
    "id": 14,
    "Bank_name": "انصار",
    "systematic": 1,
    "imageName": "ansar.png"
  },
  {
    "id": 15,
    "Bank_name": "سینا",
    "systematic": 1,
    "imageName": "sina.png"
  },
  {
    "id": 16,
    "Bank_name": "کشاورزی",
    "systematic": 1,
    "imageName": "keshavarzi.png"
  },
  {
    "id": 17,
    "Bank_name": "مهر",
    "systematic": 1,
    "imageName": "mehr.png"
  },
  {
    "id": 18,
    "Bank_name": "پست بانک",
    "systematic": 1,
    "imageName": "postbank.png"
  },
  {
    "id": 19,
    "Bank_name": "صنعت و معدن",
    "systematic": 1,
    "imageName": "sanatomadan.png"
  },
  {
    "id": 20,
    "Bank_name": "توسعه تعاون",
    "systematic": 1,
    "imageName": "tosetaavan.png"
  },
  {
    "id": 21,
    "Bank_name": "کارافرين",
    "systematic": 1,
    "imageName": "karafarin.png"
  },
  {
    "id": 22,
    "Bank_name": "سرمايه",
    "systematic": 1,
    "imageName": "sarmaye.png"
  },
  {
    "id": 23,
    "Bank_name": "رفاه کارگران",
    "systematic": 1,
    "imageName": "refah.png"
  },
  {
    "id": 24,
    "Bank_name": "حکمت ايرانيان",
    "systematic": 1,
    "imageName": "hekmatiranean.png"
  },
  {
    "id": 25,
    "Bank_name": "ايران زمين",
    "systematic": 1,
    "imageName": "iranzamin.png"
  },
  {
    "id": 26,
    "Bank_name": "گردشگری",
    "systematic": 1,
    "imageName": "gardeshgari.png"
  },
  {
    "id": 27,
    "Bank_name": "قوامين",
    "systematic": 1,
    "imageName": "ghavamin.png"
  },
  {
    "id": 28,
    "Bank_name": "خاورميانه",
    "systematic": 1,
    "imageName": "khavarmiane.png"
  },
  {
    "id": 29,
    "Bank_name": "رسالت",
    "systematic": 1,
    "imageName": "resalat.png"
  },
  {
    "id": 30,
    "Bank_name": "مهر اقتصاد",
    "systematic": 1,
    "imageName": "mehreghtesad.png"
  },
  {
    "id": 31,
    "Bank_name": "ثامن الحجج",
    "systematic": 1,
    "imageName": "hojaj.png"
  },
  {
    "id": 32,
    "Bank_name": "کوثر",
    "systematic": 1,
    "imageName": "kosar.png"
  },
  {
    "id": 33,
    "Bank_name": "نور",
    "systematic": 1,
    "imageName": "samen.png"
  },
  {
    "id": 34,
    "Bank_name": "ثامن",
    "systematic": 1,
    "imageName": "noor.png"
  },
  {
    "id": 35,
    "Bank_name": "توسعه",
    "systematic": 1,
    "imageName": "tosee.png"
  },
  {
    "id": 36,
    "Bank_name": "ملل",
    "systematic": 1,
    "imageName": "askarie.png"
  },
  {
    "id": 37,
    "Bank_name": "فردا بانک",
    "systematic": 1,
    "imageName": "fardabank.png"
  },
  {
    "id": 38,
    "Bank_name": "تجارت الکترونیک پارسیان(تاپ)",
    "systematic": 1,
    "imageName": "topb.png"
  },
  {
    "id": 39,
    "Bank_name": "سرزمین هوشمند پاد",
    "systematic": 1,
    "imageName": "pod.png"
  },
  {
    "id": 40,
    "Bank_name": "بلوبانک",
    "systematic": 1,
    "imageName": "blu.png"
  },
  {
    "id": 41,
    "Bank_name": "ثامن الحجج",
    "systematic": 1,
    "imageName": "hojaj.png"
  },
  {
    "id": 42,
    "Bank_name": "کوثر",
    "systematic": 1,
    "imageName": "kosar.png"
  },
  {
    "id": 43,
    "Bank_name": "نور",
    "systematic": 1,
    "imageName": "samen.png"
  },
  {
    "id": 44,
    "Bank_name": "ثامن",
    "systematic": 1,
    "imageName": "noor.png"
  },
  {
    "id": 45,
    "Bank_name": "توسعه",
    "systematic": 1,
    "imageName": "tosee.png"
  },
  {
    "id": 46,
    "Bank_name": "عسکریه",
    "systematic": 1,
    "imageName": "askarie.png"
  },
  {
    "id": 47,
    "Bank_name": "ثامن الحجج",
    "systematic": 1,
    "imageName": "hojaj.png"
  },
  {
    "id": 48,
    "Bank_name": "کوثر",
    "systematic": 1,
    "imageName": "kosar.png"
  },
  {
    "id": 49,
    "Bank_name": "نور",
    "systematic": 1,
    "imageName": "samen.png"
  },
  {
    "id": 50,
    "Bank_name": "ثامن",
    "systematic": 1,
    "imageName": "noor.png"
  },
  {
    "id": 51,
    "Bank_name": "توسعه",
    "systematic": 1,
    "imageName": "tosee.png"
  }
];
