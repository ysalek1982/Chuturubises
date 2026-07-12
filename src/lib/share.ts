export async function shareInvite(url: string = window.location.origin) {
  const shareData = {
    title: "Chuturubises Jrs.",
    text: "¡Descarga la app oficial de los Chuturubises Jrs! Únete aquí:",
    url,
  };
  if (navigator.share) {
    try {
      await navigator.share(shareData);
      return "shared" as const;
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "AbortError") return "cancelled" as const;
      // fall through to clipboard
    }
  }
  try {
    await navigator.clipboard.writeText(`${shareData.text} ${url}`);
    return "copied" as const;
  } catch {
    return "unavailable" as const;
  }
}
