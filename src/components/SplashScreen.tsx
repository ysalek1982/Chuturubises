export function SplashScreen() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[#111111]">
      <div className="relative">
        <div className="absolute inset-0 animate-ping rounded-full bg-yellow-400/20" />
        <img
          src="/logo.png"
          alt="Chuturubises Jrs."
          className="relative h-32 w-32 animate-pulse rounded-full border-2 border-yellow-400 object-cover shadow-[0_0_45px_rgba(255,196,0,0.45)]"
        />
      </div>
      <p className="mt-8 animate-pulse text-xs font-black uppercase tracking-[0.4em] text-yellow-400">
        Chuturubises Jrs.
      </p>
    </div>
  );
}
