interface NumberInputProps {
  value: number | string
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  required?: boolean
  placeholder?: string
  className?: string
  disabled?: boolean
  allowDecimal?: boolean
}

export function NumberInput({
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  required,
  placeholder = '0',
  className = '',
  disabled = false,
  allowDecimal = false,
}: NumberInputProps) {
  const numVal = Number(value) || 0

  function clamp(v: number) {
    if (min !== undefined && v < min) return min
    if (max !== undefined && v > max) return max
    return v
  }

  function decrement() {
    onChange(clamp(parseFloat((numVal - step).toFixed(10))))
  }

  function increment() {
    onChange(clamp(parseFloat((numVal + step).toFixed(10))))
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value
    if (raw === '' || raw === '-') { onChange(0); return }
    const parsed = allowDecimal ? parseFloat(raw) : parseInt(raw, 10)
    if (!isNaN(parsed)) onChange(clamp(parsed))
  }

  const canDecrement = min === undefined || numVal > min
  const canIncrement = max === undefined || numVal < max

  return (
    <div className={`inline-flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 overflow-hidden h-10 ${className}`}>
      <button
        type="button"
        onClick={decrement}
        disabled={disabled || !canDecrement}
        className="flex items-center justify-center w-9 h-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-base font-medium select-none"
      >
        −
      </button>
      <div className="w-px h-5 bg-slate-200 dark:bg-slate-700" />
      <input
        type="number"
        value={value === 0 && !required ? '' : value}
        onChange={handleChange}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        step={allowDecimal ? 'any' : step}
        min={min}
        max={max}
        className="w-16 h-full text-center text-sm font-medium bg-transparent text-slate-900 dark:text-slate-100 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <div className="w-px h-5 bg-slate-200 dark:bg-slate-700" />
      <button
        type="button"
        onClick={increment}
        disabled={disabled || !canIncrement}
        className="flex items-center justify-center w-9 h-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-base font-medium select-none"
      >
        +
      </button>
    </div>
  )
}
