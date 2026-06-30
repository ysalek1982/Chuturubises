export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="sticky top-0 z-30 overflow-hidden border-b border-yellow-300/15 bg-[#050506]/86 px-5 pb-4 pt-[calc(1rem+env(safe-area-inset-top))] backdrop-blur-xl">
      <div
        aria-hidden
        className="absolute -left-12 top-0 h-20 w-44 rotate-[-18deg] bg-[#FF2E93]/18 blur-xl"
      />
      <div
        aria-hidden
        className="absolute right-8 top-2 h-16 w-28 rotate-12 bg-[#FFD60A]/14 blur-xl"
      />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-[#FF2E93] via-[#FFD60A] to-[#00E0FF]"
      />
      <div className="relative flex items-center justify-between gap-4 pr-12">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[1rem] border border-yellow-300/35 bg-black/45 p-1 shadow-[0_0_28px_rgba(255,214,10,0.16)]">
            <img src="/logo.png" alt="" className="h-full w-full rounded-[0.8rem] object-cover" />
          </div>
          <div className="min-w-0">
            {subtitle && <p className="chutu-eyebrow truncate text-[#00E0FF]">{subtitle}</p>}
            <h1 className="chutu-display mt-1 truncate text-[2.35rem] leading-none text-[#FFD60A]">
              {title.toUpperCase()}
            </h1>
          </div>
        </div>
        <div className="hidden h-12 w-[3px] shrink-0 rounded-full bg-gradient-to-b from-[#FFD60A] via-[#FF2E93] to-[#00E0FF] sm:block" />
      </div>
    </header>
  );
}
