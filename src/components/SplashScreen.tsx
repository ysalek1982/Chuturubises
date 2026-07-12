export function SplashScreen() {
  return (
    <div className="chutu-stage min-h-dvh text-white" role="status" aria-live="polite">
      <div className="mx-auto min-h-dvh max-w-md px-4 pb-10 pt-[calc(1rem+env(safe-area-inset-top))] sm:max-w-lg">
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <img
            src="/logo-256.webp"
            alt=""
            className="h-12 w-12 rounded-xl border border-[#FFD60A]/35 object-cover shadow-[0_0_26px_rgba(255,214,10,0.18)]"
          />
          <div>
            <p className="chutu-eyebrow text-[#00E0FF]">Chuturubises Jrs.</p>
            <p className="chutu-display mt-1 text-3xl leading-none text-[#FFD60A]">El enjambre</p>
          </div>
        </div>

        <div className="chutu-carnival-card mt-4 overflow-hidden rounded-[1.65rem] p-4">
          <div className="h-3 w-32 animate-pulse rounded-full bg-[#00E0FF]/30" />
          <div className="mt-3 h-12 w-4/5 animate-pulse rounded-xl bg-[#FFD60A]/18" />
          <div className="mt-5 grid grid-cols-4 gap-2">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="space-y-2">
                <div className="mx-auto h-14 w-14 animate-pulse rounded-full border border-[#FFD60A]/20 bg-white/[0.06]" />
                <div className="mx-auto h-2 w-12 animate-pulse rounded-full bg-white/10" />
              </div>
            ))}
          </div>
          <div className="mt-5 h-16 animate-pulse rounded-2xl border border-white/10 bg-white/[0.035]" />
        </div>

        <p className="mt-5 text-center text-[10px] font-black uppercase tracking-[0.3em] text-[#FFD60A]/75">
          Preparando el junte
        </p>
        <span className="sr-only">Cargando la aplicación</span>
      </div>
    </div>
  );
}
