import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown, Heart, Activity, Brain, Stethoscope } from 'lucide-react';

// Button Component
interface ButtonProps extends React.ComponentProps<typeof motion.button> {
  variant?: 'default' | 'destructive' | 'outline' | 'ghost' | 'success' | 'warning';
  size?: 'default' | 'sm' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    const baseClasses = "custom-button inline-flex items-center justify-center rounded-lg text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none transform hover:scale-105 active:scale-95 shadow-md hover:shadow-lg";
    const variantClasses = {
      default: 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 focus-visible:ring-blue-500 shadow-blue-200',
      destructive: 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 focus-visible:ring-red-500 shadow-red-200',
      outline: 'border-2 border-slate-300 bg-white text-slate-700 hover:bg-blue-50 hover:border-blue-500 hover:text-blue-700 focus-visible:ring-blue-400',
      ghost: 'text-slate-700 hover:bg-slate-100 hover:text-slate-800 shadow-none hover:shadow-md',
      success: 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 focus-visible:ring-green-500 shadow-green-200',
      warning: 'bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700 focus-visible:ring-amber-500 shadow-amber-200',
    };
    const sizeClasses = {
        default: 'px-6 py-3 text-sm',
        sm: 'px-4 py-2 text-xs',
        lg: 'px-8 py-4 text-base',
    };

    return (
      <motion.button
        whileTap={{ scale: 0.95 }}
        whileHover={{ scale: 1.02 }}
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        ref={ref}
        {...props}
      />
    );
  }
);

// Badge Component
interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'success' | 'warning';
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variantClasses = {
      default: 'bg-blue-100 text-blue-800 border-blue-200',
      secondary: 'bg-slate-100 text-slate-800 border-slate-200',
      destructive: 'bg-red-100 text-red-800 border-red-200',
      success: 'bg-green-100 text-green-800 border-green-200',
      warning: 'bg-amber-100 text-amber-800 border-amber-200',
    };

    return (
      <span
        ref={ref}
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variantClasses[variant]} ${className}`}
        {...props}
      />
    );
  }
);

// Input Component
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, style, ...props }, ref) => {
    return (
      <input
        className={`flex h-12 w-full rounded-lg border-2 border-slate-200 bg-white px-4 py-3 text-sm transition-all duration-200 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-500 hover:border-slate-300 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50 dark:focus-visible:ring-blue-500 ${className}`}
        style={style}
        ref={ref}
        {...props}
      />
    );
  }
);

// Label Component
export const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
    ({ className, ...props }, ref) => (
      <label ref={ref} className={`text-sm font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-700 dark:text-slate-300 ${className}`} {...props} />
    )
);

// Card Components
export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
      <motion.div 
        ref={ref} 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-lg hover:shadow-xl transition-all duration-300 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 ${className}`} 
        {...props} 
      />
    )
);

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
      <div ref={ref} className={`flex flex-col space-y-2 p-6 ${className}`} {...props} />
    )
);

export const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
    ({ className, ...props }, ref) => (
      <h3 ref={ref} className={`text-2xl font-bold leading-none tracking-tight text-slate-900 dark:text-slate-100 ${className}`} {...props} />
    )
);

export const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
    ({ className, ...props }, ref) => (
      <p ref={ref} className={`text-sm text-slate-600 dark:text-slate-400 leading-relaxed ${className}`} {...props} />
    )
);

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
      <div ref={ref} className={`p-6 pt-0 ${className}`} {...props} />
    )
);

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
      <div ref={ref} className={`flex items-center p-6 pt-0 gap-3 ${className}`} {...props} />
    )
);

// Professional Animated Select Component
interface AnimatedSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string; icon?: string }[];
  onValueChange?: (value: string) => void;
}

const iconMap = {
  'Heart': Heart,
  'Activity': Activity,
  'Brain': Brain,
  'Stethoscope': Stethoscope,
} as const;

const renderIcon = (iconName?: string) => {
  if (!iconName || !(iconName in iconMap)) return null;
  const IconComponent = iconMap[iconName as keyof typeof iconMap];
  return <IconComponent className="w-4 h-4" />;
};

export const AnimatedSelect = React.forwardRef<HTMLSelectElement, AnimatedSelectProps>(
  ({ className, label, options, onValueChange, value, ...props }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedOption, setSelectedOption] = useState(
      options.find(opt => opt.value === value) || options[0]
    );
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (option: { value: string; label: string; icon?: string }) => {
      setSelectedOption(option);
      setIsOpen(false);
      onValueChange?.(option.value);
    };

    return (
      <div className="relative" ref={dropdownRef}>
        {label && (
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            {label}
          </label>
        )}
        
        <motion.button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex h-12 w-full items-center justify-between rounded-xl border-2 border-slate-400 bg-white px-4 py-3 text-sm text-slate-900 font-medium transition-all duration-300 hover:border-blue-400 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm ${className}`}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          <div className="flex items-center space-x-3">
            {selectedOption.icon && (
              <div className="text-slate-600">{renderIcon(selectedOption.icon)}</div>
            )}
            <span className="text-slate-800 font-medium">{selectedOption.label}</span>
          </div>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-5 h-5 text-slate-600" />
          </motion.div>
        </motion.button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="absolute z-50 mt-2 w-full bg-white border-2 border-slate-200 rounded-xl shadow-2xl overflow-hidden"
            >
              <div className="py-2">
                {options.map((option, index) => (
                  <motion.button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option)}
                    className="w-full flex items-center px-4 py-3 text-left hover:bg-blue-50 transition-colors duration-200 group"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ backgroundColor: "#eff6ff", x: 4 }}
                  >
                    <div className="flex items-center space-x-3">
                      {option.icon && (
                        <div className="text-slate-600 group-hover:text-blue-600 group-hover:scale-110 transition-all duration-200">
                          {renderIcon(option.icon)}
                        </div>
                      )}
                      <span className="text-slate-800 font-medium group-hover:text-blue-700">
                        {option.label}
                      </span>
                    </div>
                    {selectedOption.value === option.value && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="ml-auto"
                      >
                        <Check className="w-4 h-4 text-blue-600" />
                      </motion.div>
                    )}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

// Select Component
export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        className={`flex h-12 w-full items-center justify-between rounded-lg border-2 border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50 hover:border-slate-400 hover:bg-slate-50 shadow-sm appearance-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 dark:focus:ring-blue-400 ${className}`}
        style={{ 
          color: '#1f2937',
          backgroundColor: '#ffffff',
          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
          backgroundPosition: 'right 12px center',
          backgroundRepeat: 'no-repeat',
          backgroundSize: '16px'
        }}
        ref={ref}
        {...props}
      >
        {children}
      </select>
    );
  }
);

// Textarea Component
export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={`flex min-h-[100px] w-full rounded-lg border-2 border-slate-200 bg-white px-4 py-3 text-sm transition-all duration-200 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-500 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50 dark:focus-visible:ring-blue-500 ${className}`}
        ref={ref}
        {...props}
      />
    );
  }
);

// Professional Date Picker Component
interface DatePickerProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string;
  onDateChange?: (date: string) => void;
  value?: string;
  placeholder?: string;
}

export const DatePicker = React.forwardRef<HTMLInputElement, DatePickerProps>(
  ({ className, onDateChange, value, placeholder = "Filter from date...", ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [displayValue, setDisplayValue] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);
    
    const formatDisplayDate = (dateString: string) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    };

    const getTodayString = () => {
      const today = new Date();
      return today.toISOString().split('T')[0];
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setDisplayValue(formatDisplayDate(newValue));
      onDateChange?.(newValue);
    };

    const handleFocus = () => {
      setIsFocused(true);
      setIsOpen(true);
    };

    const handleBlur = (e: React.FocusEvent) => {
      // Don't close if focus is moving to the dropdown
      if (e.relatedTarget && dropdownRef.current?.contains(e.relatedTarget as Node)) {
        return;
      }
      setIsFocused(false);
      setTimeout(() => setIsOpen(false), 200);
    };

    // Update display value when value prop changes
    React.useEffect(() => {
      if (value) {
        setDisplayValue(formatDisplayDate(value));
      } else {
        setDisplayValue('');
      }
    }, [value]);

    return (
      <div ref={dropdownRef} className="relative">      
        <motion.div
          className="relative"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          {/* Hidden native date input */}
          <input
            type="date"
            ref={ref}
            value={value || ''}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            {...props}
          />
          
          {/* Custom styled display */}
          <div
            className={`flex h-12 w-full items-center justify-between rounded-xl border-2 border-slate-400 bg-white px-4 py-3 text-sm font-medium transition-all duration-300 hover:border-blue-400 hover:bg-blue-50 focus-within:border-blue-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/20 ${className}`}
          >
            <div className="flex items-center space-x-3">
              <motion.div
                animate={{ 
                  scale: isFocused ? 1.1 : 1,
                  color: isFocused ? "#3b82f6" : "#64748b"
                }}
                transition={{ duration: 0.2 }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </motion.div>
              <span className={displayValue ? "text-slate-800" : "text-slate-400"}>
                {displayValue || placeholder}
              </span>
            </div>
            
            {displayValue && (
              <motion.button
                type="button"
                onClick={() => {
                  setDisplayValue('');
                  onDateChange?.('');
                }}
                className="text-slate-400 hover:text-slate-600 transition-colors duration-200"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </motion.button>
            )}
          </div>
          
          {/* Quick date options and custom date input */}
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="absolute z-50 mt-2 w-full bg-white border-2 border-slate-200 rounded-xl shadow-2xl overflow-hidden"
              >
                <div className="p-2">
                  {/* Custom Date Input Section */}
                  <div className="mb-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                    <div className="flex items-center space-x-2 mb-2">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <div className="text-xs font-semibold text-blue-700">Custom Date</div>
                    </div>
                    <div className="relative">
                      <input
                        type="date"
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          if (e.target.value) {
                            setDisplayValue(formatDisplayDate(e.target.value));
                            onDateChange?.(e.target.value);
                            setIsOpen(false);
                          }
                        }}
                        className="w-full h-9 px-3 text-sm bg-white border border-blue-200 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 hover:border-blue-300"
                        style={{ colorScheme: 'light' }}
                        placeholder="Select any date..."
                      />
                    </div>
                    <div className="text-xs text-blue-600 mt-1 opacity-75">
                      Enter any date you need
                    </div>
                  </div>

                  {/* Quick Select Options */}
                  <div className="text-xs font-semibold text-slate-500 px-2 py-1 mb-1">Quick Select</div>
                  {[
                    { label: 'Today', value: getTodayString() },
                    { label: 'Yesterday', value: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
                    { label: 'Last Week', value: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
                    { label: 'Last Month', value: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
                  ].map((option, index) => (
                    <motion.button
                      key={option.label}
                      type="button"
                      onClick={() => {
                        onDateChange?.(option.value);
                        setIsOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-blue-50 rounded-lg transition-colors duration-200 group"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ x: 4 }}
                    >
                      <span className="text-sm font-medium text-slate-700 group-hover:text-blue-700">
                        {option.label}
                      </span>
                      <span className="text-xs text-slate-500 group-hover:text-blue-600">
                        {formatDisplayDate(option.value)}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    );
  }
);

// File Input Component
export const FileInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        type="file"
        className={`flex h-12 w-full rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600 transition-all duration-200 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 hover:border-slate-400 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:file:bg-blue-900 dark:file:text-blue-300 ${className}`}
        ref={ref}
        {...props}
      />
    );
  }
);

// Modal/Dialog Components
export const Modal = ({ children, isOpen, onClose }: { children: React.ReactNode; isOpen: boolean; onClose: () => void }) => {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        className="relative max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </motion.div>
    </motion.div>
  );
};

// Loading Spinner
export const LoadingSpinner = ({ size = 'default' }: { size?: 'sm' | 'default' | 'lg' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    default: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      className={`${sizeClasses[size]} border-2 border-blue-200 border-t-blue-600 rounded-full`}
    />
  );
};

// Alert Component
interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive' | 'success' | 'warning';
}

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variantClasses = {
      default: 'bg-blue-50 border-blue-200 text-blue-800',
      destructive: 'bg-red-50 border-red-200 text-red-800',
      success: 'bg-green-50 border-green-200 text-green-800',
      warning: 'bg-amber-50 border-amber-200 text-amber-800',
    };

    return (
      <div
        ref={ref}
        className={`relative w-full rounded-lg border px-4 py-3 text-sm ${variantClasses[variant]} ${className}`}
        {...props}
      />
    );
  }
);

// Professional Search Input with Icon
export const SearchInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, style, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const [hasValue, setHasValue] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setHasValue(e.target.value.length > 0);
      props.onChange?.(e);
    };

    return (
      <motion.div 
        className="relative"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <motion.div 
          className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"
          animate={{ 
            scale: isFocused ? 1.1 : 1,
            color: isFocused ? "#3b82f6" : hasValue ? "#059669" : "#64748b"
          }}
          transition={{ duration: 0.2 }}
        >
          <motion.svg 
            className="h-5 w-5" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
            animate={{ rotate: isFocused ? 12 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </motion.svg>
        </motion.div>
        <input
          ref={ref}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onChange={handleChange}
          className={`flex h-12 w-full rounded-xl border-2 border-slate-400 bg-white pl-12 pr-4 py-3 text-sm font-medium text-slate-800 transition-all duration-300 placeholder:text-slate-400 hover:border-blue-400 hover:bg-blue-50 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm ${className}`}
          style={{ color: '#1f2937', ...style }}
          {...props}
        />
        
        {/* Focus ring animation */}
        {isFocused && (
          <motion.div
            className="absolute inset-0 rounded-xl border-2 border-blue-500 pointer-events-none"
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 0.3, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </motion.div>
    );
  }
);
