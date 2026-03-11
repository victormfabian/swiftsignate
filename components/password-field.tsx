"use client";

import { useId, useState } from "react";

type PasswordFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className: string;
  labelClassName: string;
  autoComplete?: string;
};

export function PasswordField({
  label,
  value,
  onChange,
  placeholder,
  className,
  labelClassName,
  autoComplete
}: PasswordFieldProps) {
  const [revealed, setRevealed] = useState(false);
  const inputId = useId();

  return (
    <label>
      <span className={labelClassName}>{label}</span>
      <div className="relative">
        <input
          id={inputId}
          type={revealed ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={`${className} pr-12`}
        />
        <button
          type="button"
          onClick={() => setRevealed((current) => !current)}
          className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
          aria-label={revealed ? "Hide password" : "Show password"}
        >
          {revealed ? (
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M3 3 21 21" strokeLinecap="round" />
              <path d="M10.6 10.7A2.5 2.5 0 0 0 14 14.1" strokeLinecap="round" />
              <path
                d="M9.9 5.2A10.9 10.9 0 0 1 12 5c5 0 8.7 3.2 10 7-0.5 1.5-1.5 2.9-2.8 4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M6.2 6.3C4.4 7.6 3.2 9.5 2 12c1.3 3.8 5 7 10 7 1.8 0 3.4-.4 4.8-1"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path
                d="M2 12c1.3-3.8 5-7 10-7s8.7 3.2 10 7c-1.3 3.8-5 7-10 7S3.3 15.8 2 12Z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
    </label>
  );
}
