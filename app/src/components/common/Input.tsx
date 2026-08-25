import React, { InputHTMLAttributes, forwardRef } from 'react';
import { AlertCircle } from 'lucide-react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, helperText, disabled, ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label className={`text-sm font-medium ${disabled ? 'text-gray-400' : 'text-gray-200'}`}>
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            disabled={disabled}
            className={`
              w-full bg-gray-900 border text-white rounded-lg px-4 py-2 text-sm outline-none transition-colors
              placeholder:text-gray-500
              ${disabled ? 'opacity-50 cursor-not-allowed border-gray-700' : 'border-gray-700 hover:border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'}
              ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500 pr-10' : ''}
              ${className}
            `}
            {...props}
          />
          {error && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500">
              <AlertCircle size={18} />
            </div>
          )}
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

Input.displayName = 'Input';

export default Input;

export { Input };
