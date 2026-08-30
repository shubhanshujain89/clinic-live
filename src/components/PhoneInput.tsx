import React from 'react';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  maxLength?: number;
}

const getSubscriberDigits = (value: string) => {
  const rawValue = String(value || '').trim();
  const digits = rawValue.replace(/\D/g, '');
  if (rawValue.startsWith('+91')) return digits.slice(2, 12);
  return digits.slice(0, 10);
};

export const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  onChange,
  className = '',
  placeholder = '98765 43210',
}) => (
  <div className={`flex overflow-hidden rounded-lg border border-slate-600 bg-slate-700 focus-within:border-emerald-400 ${className}`}>
    <span className="flex items-center border-r border-slate-600 px-3 text-sm font-semibold text-slate-300" aria-hidden="true">+91</span>
    <input
      type="tel"
      inputMode="numeric"
      value={getSubscriberDigits(value)}
      onChange={(event) => onChange(event.target.value.replace(/\D/g, '').slice(0, 10))}
      className="min-w-0 flex-1 bg-transparent px-4 py-2 text-white outline-none"
      placeholder={placeholder}
      maxLength={10}
    />
  </div>
);
