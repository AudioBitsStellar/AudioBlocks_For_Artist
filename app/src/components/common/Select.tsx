import React, { SelectHTMLAttributes, forwardRef } from 'react';
import { AlertCircle, ChevronDown } from 'lucide-react';

export interface SelectOption {
  label: string;
  value: string | number;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', label, error, helperText, options, disabled, ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label className={`text-sm font-medium ${disabled ? 'text-gray-400' : 'text-gray-200'}`}>
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            disabled={disabled}
            className={`
              appearance-none w-full bg-gray-900 border text-white rounded-lg px-4 py-2 text-sm outline-none transition-colors cursor-pointer
              ${disabled ? 'opacity-50 cursor-not-allowed border-gray-700' : 'border-gray-700 hover:border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'}
              ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500 pr-10' : 'pr-10'}
              ${className}
            `}
            {...props}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-2">
            {error && <AlertCircle size={18} className="text-red-500" />}
            <ChevronDown size={18} className={`${disabled ? 'text-gray-500' : 'text-gray-400'}`} />
          </div>
        </div>
        {(error || helperText) && (
          <p className={`text-xs ${error ? 'text-red-500' : 'text-gray-400'}`}>
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;
