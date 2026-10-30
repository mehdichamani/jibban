import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Sparkles } from 'lucide-react';
import {
  JALALI_MONTH_NAMES,
  dateToJalaliParts,
  jalaliToIso,
  getDaysInJalaliMonth,
  formatJalali,
} from '../lib/date.js';

interface JalaliDatePickerProps {
  value: string; // ISO string
  onChange: (isoString: string) => void;
  label?: string;
}

export const JalaliDatePicker: React.FC<JalaliDatePickerProps> = ({
  value,
  onChange,
  label = 'تاریخ و زمان تراکنش (شمسی):',
}) => {
  const initialDate = value ? new Date(value) : new Date();
  const initialParts = dateToJalaliParts(isNaN(initialDate.getTime()) ? new Date() : initialDate);

  const [year, setYear] = useState<number>(initialParts.year);
  const [month, setMonth] = useState<number>(initialParts.month);
  const [day, setDay] = useState<number>(initialParts.day);
  const [hour, setHour] = useState<number>(initialParts.hour);
  const [minute, setMinute] = useState<number>(initialParts.minute);

  // تعداد روزهای ماه انتخاب‌شده
  const daysInMonth = getDaysInJalaliMonth(year, month);

  useEffect(() => {
    if (day > daysInMonth) {
      setDay(daysInMonth);
    }
  }, [month, year, daysInMonth, day]);

  const updateDate = (y: number, m: number, d: number, h: number, min: number) => {
    const validDay = Math.min(d, getDaysInJalaliMonth(y, m));
    const iso = jalaliToIso(y, m, validDay, h, min);
    onChange(iso);
  };

  const handleQuickSelect = (daysAgo: number) => {
    const target = new Date(Date.now() - daysAgo * 86400000);
    const parts = dateToJalaliParts(target);
    setYear(parts.year);
    setMonth(parts.month);
    setDay(parts.day);
    setHour(parts.hour);
    setMinute(parts.minute);
    updateDate(parts.year, parts.month, parts.day, parts.hour, parts.minute);
  };

  // لیست سال‌های در دسترس (مثلاً ۱۴۰۲ تا ۱۴۰۶)
  const currentYear = initialParts.year;
  const years = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

  const currentDateObj = new Date(jalaliToIso(year, month, day, hour, minute));

  return (
    <div className="space-y-2 p-3 bg-slate-950/70 border border-slate-800 rounded-2xl">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-sky-400" />
          <span>{label}</span>
        </label>

        {/* دکمه‌های سریع امروز / دیروز */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleQuickSelect(0)}
            className="text-[11px] px-2 py-0.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 transition"
          >
            امروز
          </button>
          <button
            type="button"
            onClick={() => handleQuickSelect(1)}
            className="text-[11px] px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            دیروز
          </button>
        </div>
      </div>

      {/* انتخاب‌کننده‌های روز، ماه، سال */}
      <div className="grid grid-cols-3 gap-2">
        {/* روز */}
        <div>
          <label className="text-[10px] text-slate-400 block mb-0.5">روز:</label>
          <select
            value={day}
            onChange={(e) => {
              const newDay = Number(e.target.value);
              setDay(newDay);
              updateDate(year, month, newDay, hour, minute);
            }}
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
          >
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        {/* ماه */}
        <div>
          <label className="text-[10px] text-slate-400 block mb-0.5">ماه:</label>
          <select
            value={month}
            onChange={(e) => {
              const newMonth = Number(e.target.value);
              setMonth(newMonth);
              updateDate(year, newMonth, day, hour, minute);
            }}
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
          >
            {JALALI_MONTH_NAMES.map((name, index) => (
              <option key={index + 1} value={index + 1}>
                {name} ({index + 1})
              </option>
            ))}
          </select>
        </div>

        {/* سال */}
        <div>
          <label className="text-[10px] text-slate-400 block mb-0.5">سال:</label>
          <select
            value={year}
            onChange={(e) => {
              const newYear = Number(e.target.value);
              setYear(newYear);
              updateDate(newYear, month, day, hour, minute);
            }}
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500 font-mono"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* انتخاب ساعت و دقیقه */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>ساعت:</span>
        </div>

        <div className="flex items-center gap-1 font-mono text-xs">
          <select
            value={hour}
            onChange={(e) => {
              const newH = Number(e.target.value);
              setHour(newH);
              updateDate(year, month, day, newH, minute);
            }}
            className="bg-slate-900 border border-slate-700/80 rounded-lg px-2 py-1 text-slate-200 focus:outline-none focus:border-sky-500 text-center"
          >
            {Array.from({ length: 24 }, (_, i) => i).map((h) => (
              <option key={h} value={h}>
                {String(h).padStart(2, '0')}
              </option>
            ))}
          </select>
          <span className="text-slate-500 font-bold">:</span>
          <select
            value={minute}
            onChange={(e) => {
              const newMin = Number(e.target.value);
              setMinute(newMin);
              updateDate(year, month, day, hour, newMin);
            }}
            className="bg-slate-900 border border-slate-700/80 rounded-lg px-2 py-1 text-slate-200 focus:outline-none focus:border-sky-500 text-center"
          >
            {Array.from({ length: 60 }, (_, i) => i).map((m) => (
              <option key={m} value={m}>
                {String(m).padStart(2, '0')}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* پیش‌نمایش متنی تاریخ شمسی */}
      <div className="text-[11px] text-sky-400 bg-sky-500/10 border border-sky-500/20 rounded-xl px-2.5 py-1.5 flex items-center justify-between">
        <span>تاریخ انتخابی:</span>
        <span className="font-bold">{formatJalali(currentDateObj, 'full')}</span>
      </div>
    </div>
  );
};
