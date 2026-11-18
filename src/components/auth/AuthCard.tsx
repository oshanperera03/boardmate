import type { ReactNode } from 'react'
import { ShieldCheck } from 'lucide-react'
import { Brand } from '../common/UI'

export function AuthCard({
  children,
  title,
  description,
  admin = false,
}: {
  children: ReactNode
  title: string
  description: string
  admin?: boolean
}) {
  return (
    <div className="min-h-screen bg-[#f7f9fc]">
      <header className="mx-auto flex h-[76px] max-w-7xl items-center px-5 sm:px-8"><Brand /></header>
      <main className="mx-auto grid max-w-6xl gap-10 px-5 pb-16 pt-6 sm:px-8 lg:grid-cols-[1fr_440px] lg:items-center lg:gap-16 lg:pb-24">
        <div className="hidden lg:block">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-[#183b63]">
            <ShieldCheck size={15} /> A better way to find your place
          </div>
          <h1 className="max-w-xl text-5xl font-bold leading-[1.12] tracking-tight text-slate-950">
            Find a place that feels like <span className="text-[#2b65a0]">home.</span>
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-8 text-slate-500">A trusted community connecting Sri Lankan students with boarding owners.</p>
          <div className="mt-10 flex items-center gap-4 text-sm text-slate-600">
            <span className="grid size-10 place-items-center rounded-xl bg-white text-[#2b65a0] shadow-sm"><ShieldCheck size={19} /></span>
            {admin ? 'Secure access for authorized administrators only' : 'Your account and information are kept secure'}
          </div>
        </div>
        <section className="mx-auto w-full max-w-[440px] rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_42px_rgba(27,52,84,0.06)] sm:p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h2>
            <p className="mt-1.5 text-sm leading-6 text-slate-500">{description}</p>
          </div>
          {children}
        </section>
      </main>
    </div>
  )
}
