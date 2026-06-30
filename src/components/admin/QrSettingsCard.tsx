import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { QrCode } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { compressImage } from "@/lib/image-compress";
import { toast } from "sonner";

export function QrSettingsCard() {
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from("fraternity_settings")
      .select("value")
      .eq("key", "payment_qr_url")
      .maybeSingle();
    setQrUrl((data?.value as string) || null);
  };
  useEffect(() => {
    load();
  }, []);

  const upload = async (file: File) => {
    setBusy(true);
    try {
      const { blob, type } = await compressImage(file, 1000, 0.9);
      const path = `fraternity/qr-${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { contentType: type, upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const { error } = await supabase.from("fraternity_settings").upsert({
        key: "payment_qr_url",
        value: pub.publicUrl,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      toast.success("QR actualizado");
      setQrUrl(pub.publicUrl);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al subir QR");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="rounded-xl border border-yellow-400/30 bg-neutral-950 p-3">
      <p className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-yellow-400">
        <QrCode className="h-4 w-4" /> QR bancario
      </p>
      <div className="flex items-center gap-3">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-yellow-400/30 bg-white">
          {qrUrl ? (
            <img src={qrUrl} alt="QR" className="h-full w-full object-contain" />
          ) : (
            <QrCode className="h-8 w-8 text-neutral-400" />
          )}
        </div>
        <div className="flex-1">
          <p className="text-[11px] text-neutral-400">
            {qrUrl ? "Visible para todos los fraternos al pagar." : "Aún no has subido el QR."}
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
          />
          <Button
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="mt-2 bg-yellow-400 font-bold text-black hover:bg-yellow-300"
          >
            {busy ? "Subiendo..." : qrUrl ? "Reemplazar QR" : "Subir QR"}
          </Button>
        </div>
      </div>
    </div>
  );
}
