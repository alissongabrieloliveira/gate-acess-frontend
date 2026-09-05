import { Shield, ShieldCheck } from 'lucide-react'

export default function AuthLayout({ children }) {
  return (
    <div className="relative flex min-h-screen flex-col items-start justify-between overflow-hidden bg-page px-6 py-6 font-sans md:px-12">
      <BackgroundIllustration />

      <header className="flex w-full items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-brand">
            <ShieldCheck className="size-5 text-white" strokeWidth={2.25} />
          </div>
          <div className="flex flex-col">
            <p className="text-lg font-extrabold leading-tight text-ink">PORTARIA</p>
            <p className="text-[11px] font-semibold uppercase leading-tight text-muted">
              Controle de Acesso
            </p>
          </div>
        </div>
      </header>

      <div className="flex w-full flex-1 items-center justify-center py-10">{children}</div>

      <footer className="flex w-full items-center justify-between">
        <span className="rounded-md bg-brand-50 px-2 py-1 text-[11px] font-bold text-brand">
          v1.0.0
        </span>
      </footer>
    </div>
  )
}

function BackgroundIllustration() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute right-0 top-1/2 hidden h-[600px] w-[480px] -translate-y-1/2 items-center justify-center opacity-65 lg:flex"
    >
      <div className="flex h-[480px] w-[320px] items-center justify-center rounded-b-2xl rounded-t-[160px] border-2 border-line p-6">
        <div className="flex h-[400px] w-60 items-center justify-center rounded-b-lg rounded-t-[120px] border border-line p-6">
          <Shield className="size-20 text-line" strokeWidth={1.25} />
        </div>
      </div>
    </div>
  )
}
