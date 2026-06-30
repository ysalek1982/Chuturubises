export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="sticky top-0 z-30 overflow-hidden border-b border-white/10 bg-[#050506]/82 px-5 pb-4 pt-[calc(1rem+env(safe-area-inset-top))] backdrop-blur-xl">
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-[#FF2E93] via-[#FFD60A] to-[#00E0FF]"
      />
      <div className="flex items-end justify-between gap-4 pr-12">
        <div className="min-w-0">
          {subtitle && <p className="chutu-eyebrow truncate text-[#00E0FF]">{subtitle}</p>}
          <h1 className="chutu-display mt-1 truncate text-4xl leading-none text-[#FFD60A]">
            {title.toUpperCase()}
          </h1>
        </div>
        <div className="hidden h-11 w-[3px] shrink-0 rounded-full bg-gradient-to-b from-[#FFD60A] via-[#FF2E93] to-[#00E0FF] sm:block" />
      </div>
    </header>
  );
}
