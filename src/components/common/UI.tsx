import { useId, type InputHTMLAttributes, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, CheckCircle2, LoaderCircle, ShieldCheck } from 'lucide-react'

export function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link to="/" className="inline-flex items-center gap-2.5 font-bold tracking-tight">
      <span className="grid size-9 place-items-center rounded-xl bg-[#e6f0fb] text-[#183b63]">
        <ShieldCheck size={20} strokeWidth={2.2} />
      </span>
      <span className={light ? 'text-white' : 'text-[#183b63]'}>boardmate</span>
    </Link>
  )
}

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: string
  error?: string
}

export function Field({ label, hint, error, id, ...props }: FieldProps) {
  const generatedId = useId()
  const inputId = id || props.name || generatedId
  const hintId = hint ? `${inputId}-hint` : undefined
  const errorId = error ? `${inputId}-error` : undefined
  const describedBy = [props['aria-describedby'], hintId, errorId].filter(Boolean).join(' ') || undefined
  return (
    <div className="grid gap-1.5">
      <label htmlFor={inputId} className="text-sm font-semibold text-slate-700">{label}</label>
      <input
        id={inputId}
        className={`h-11 w-full rounded-lg border bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 disabled:bg-slate-50 ${error ? 'border-rose-300 focus:border-rose-500 focus:ring-4 focus:ring-rose-100' : 'border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'}`}
        {...props}
        aria-invalid={error ? true : props['aria-invalid']}
        aria-describedby={describedBy}
      />
      {hint && <p id={hintId} className="text-xs leading-relaxed text-slate-500">{hint}</p>}
      {error && <p id={errorId} role="alert" className="text-sm text-rose-700">{error}</p>}
    </div>
  )
}

export function Alert({
  children,
  type = 'error',
}: {
  children: ReactNode
  type?: 'error' | 'success' | 'info'
}) {
  const styles = {
    error: 'border-rose-200 bg-rose-50 text-rose-800',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    info: 'border-blue-200 bg-blue-50 text-blue-800',
  }
  const Icon = type === 'error' ? AlertCircle : CheckCircle2
  return (
    <div role={type === 'error' ? 'alert' : 'status'} className={`flex gap-2.5 rounded-lg border p-3 text-sm ${styles[type]}`}>
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div>{children}</div>
    </div>
  )
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center gap-2 text-sm text-slate-500" role="status">
      <LoaderCircle className="size-5 animate-spin" />
      {label}…
    </div>
  )
}

export function PageTitle({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="mb-1 text-xs font-bold uppercase tracking-[0.14em] text-blue-700">{eyebrow}</p>}
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function StatusPill({ children, tone = 'slate' }: { children: ReactNode; tone?: 'blue' | 'green' | 'amber' | 'red' | 'slate' }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700 ring-blue-200',
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    amber: 'bg-amber-50 text-amber-800 ring-amber-200',
    red: 'bg-rose-50 text-rose-700 ring-rose-200',
    slate: 'bg-slate-100 text-slate-700 ring-slate-200',
  }
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${tones[tone]}`}>{children}</span>
}

export const primaryButtonClass =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#183b63] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#102d4d] focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60'

export const secondaryButtonClass =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60'
