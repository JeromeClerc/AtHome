import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

export const controlClass =
  'block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:disabled:bg-slate-800'

interface FieldWrapperProps {
  label: string
  hint?: ReactNode
  error?: string | null
  required?: boolean
  className?: string
  children: (id: string, describedBy: string | undefined) => ReactNode
}

/** Enveloppe accessible (label, aide, erreur) pour un contrôle de formulaire. */
export function FieldWrapper({ label, hint, error, required, className, children }: FieldWrapperProps) {
  const id = useId()
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined
  return (
    <div className={cn('space-y-1', className)}>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
        {required && <span className="ml-0.5 text-rose-600">*</span>}
      </label>
      {children(id, describedBy)}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-rose-600 dark:text-rose-400">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-slate-500 dark:text-slate-400">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

type BaseProps = { label: string; hint?: ReactNode; error?: string | null; wrapperClassName?: string }

export function Input({ label, hint, error, wrapperClassName, className, required, ...rest }: BaseProps & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <FieldWrapper label={label} hint={hint} error={error} required={required} className={wrapperClassName}>
      {(id, describedBy) => (
        <input
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          required={required}
          className={cn(controlClass, error && 'border-rose-500', className)}
          {...rest}
        />
      )}
    </FieldWrapper>
  )
}

export function Select({ label, hint, error, wrapperClassName, className, required, children, ...rest }: BaseProps & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <FieldWrapper label={label} hint={hint} error={error} required={required} className={wrapperClassName}>
      {(id, describedBy) => (
        <select id={id} aria-describedby={describedBy} required={required} className={cn(controlClass, className)} {...rest}>
          {children}
        </select>
      )}
    </FieldWrapper>
  )
}

export function Textarea({ label, hint, error, wrapperClassName, className, required, ...rest }: BaseProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <FieldWrapper label={label} hint={hint} error={error} required={required} className={wrapperClassName}>
      {(id, describedBy) => (
        <textarea
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          required={required}
          className={cn(controlClass, 'min-h-24', className)}
          {...rest}
        />
      )}
    </FieldWrapper>
  )
}

export function Checkbox({ label, className, ...rest }: { label: ReactNode } & Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  return (
    <label className={cn('inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-300', className)}>
      <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-slate-600" {...rest} />
      {label}
    </label>
  )
}
