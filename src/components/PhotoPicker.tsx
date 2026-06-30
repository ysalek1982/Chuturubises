import { useEffect, useRef, useState } from "react";
import { Camera, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  value: File | null;
  onChange: (file: File | null) => void;
  required?: boolean;
};

export function PhotoPicker({ value, onChange, required }: Props) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!value) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(value);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 rounded-2xl border border-yellow-300/15 bg-white/[0.035] p-3">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Vista previa"
            className="h-20 w-20 rounded-2xl border border-yellow-300/45 object-cover shadow-[0_14px_28px_rgba(0,0,0,0.35)]"
          />
        ) : (
          <div className="grid h-20 w-20 place-items-center rounded-2xl border border-dashed border-yellow-300/45 bg-black/25 text-yellow-300/70">
            <Camera className="h-7 w-7" />
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Button
            type="button"
            onClick={() => cameraRef.current?.click()}
            className="chutu-primary h-10 w-full rounded-xl text-xs font-black uppercase tracking-wider"
            size="sm"
          >
            <Camera className="h-4 w-4" /> Cámara
          </Button>
          <Button
            type="button"
            onClick={() => galleryRef.current?.click()}
            variant="outline"
            size="sm"
            className="chutu-outline h-10 w-full rounded-xl text-xs font-black uppercase tracking-wider"
          >
            <ImageIcon className="h-4 w-4" /> Galería
          </Button>
        </div>
      </div>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
      {required && !value && (
        <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">* Requerida</p>
      )}
    </div>
  );
}
