import { forwardRef, useId, type InputHTMLAttributes } from 'react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const TextField = forwardRef<HTMLInputElement, Props>(function TextField(
  { label, error, hint, id, ...rest },
  ref,
) {
  const auto = useId();
  const inputId = id ?? auto;
  const describedBy = [hint ? `${inputId}-hint` : '', error ? `${inputId}-err` : '']
    .filter(Boolean)
    .join(' ');
  return (
    <div className="field">
      <label htmlFor={inputId}>{label}</label>
      <input
        ref={ref}
        id={inputId}
        className="input"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        {...rest}
      />
      {hint && (
        <span id={`${inputId}-hint`} className="hint">
          {hint}
        </span>
      )}
      {error && (
        <span id={`${inputId}-err`} className="field-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
});
