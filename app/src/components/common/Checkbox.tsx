import React, { InputHTMLAttributes, forwardRef } from 'react';
import { Check } from 'lucide-react';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  error?: string;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className = '', label, error, disabled, checked, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        <label className={`flex items-center gap-3 cursor-pointer ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}>
          <div className="relative flex items-center justify-center">
            <input
              type="checkbox"
              ref={ref}
              disabled={disabled}
              checked={checked}
              className={`
                peer appearance-none w-5 h-5 border rounded bg-gray-900 transition-colors
                ${error ? 'border-red-500' : 'border-gray-700 hover:border-gray-600 checked:bg-blue-600 checked:border-blue-600'}
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900
                ${className}
              `}
              {...props}
            />
            <Check 
              size={14} 
              className="absolute text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" 
            />
          </div>
          <span className={`text-sm ${disabled ? 'text-gray-400' : 'text-gray-200'}`}>
            {label}
          </span>
        </label>
        {error && (
          <p className="text-xs text-red-500 ml-8">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export default Checkbox;

export { Checkbox };
