import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase, type PhotoAlbumItem, type Profile } from "@/lib/supabase";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth";
import { compressImage } from "@/lib/image-compress";
import { toast } from "sonner";
import { Camera, ImagePlus, Trash2, X } from "lucide-react";

export const Route = createFileRoute("/galeria")({
  ssr: false,
  head: () => ({ meta: [{ title: "Galería · Chuturubises Jrs." }] }),
  component: GaleriaPage,
});

type PhotoWithProfile = PhotoAlbumItem & { profile: Profile | null };

function GaleriaPage() {
  const { user, profile, isAdmin } = useAuth();
  const [photos, setPhotos] = useState<PhotoWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [active, setActive] = useState<PhotoWithProfile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const [pending, setPending] = useState<File | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const approved = profile?.approval_status !== "rejected";
  const pendingPreview = useMemo(() => (pending ? URL.createObjectURL(pending) : null), [pending]);

  useEffect(() => {
    return () => {
      if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    };
  }, [pendingPreview]);

  const load = useCallback(async () => {
    setErrorMsg(null);
    try {
      const { data, error } = await supabase
        .from("photo_album")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const items = (data as PhotoAlbumItem[]) ?? [];
      const ids = Array.from(new Set(items.map((p) => p.profile_id).filter(Boolean)));
      let profList: Profile[] = [];

      if (ids.length) {
        const { data: profs, error: profilesError } = await supabase
          .from("profiles")
          .select("*")
          .in("id", ids);
        if (profilesError) console.warn("No se pudieron cargar autores del álbum", profilesError);
        profList = (profs as Profile[]) ?? [];
      }

      setPhotos(
        items.map((it) => ({ ...it, profile: profList.find((p) => p.id === it.profile_id) ?? null })),
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : "No se pudo cargar el álbum";
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const ch = supabase
      .channel("photo_album_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "photo_album" },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [load]);

  const pickPhoto = (file: File | null) => {
    setPending(file);
    if (cameraRef.current) cameraRef.current.value = "";
    if (galleryRef.current) galleryRef.current.value = "";
  };

  const upload = async (file: File) => {
    if (!user) return toast.error("Debes iniciar sesión para subir fotos");
    if (!approved) return toast.error("Tu perfil debe estar aprobado para publicar fotos");
    setUploading(true);
    let uploadedPath: string | null = null;
    try {
      const { blob, ext, type } = await compressImage(file, 1400, 0.85);
      const safeExt = ext === "bin" ? "jpg" : ext;
      const path = `${user.id}/${Date.now()}.${safeExt}`;
      const { error: upErr } = await supabase.storage
        .from("album_photos")
        .upload(path, blob, { contentType: type || "image/jpeg", upsert: false });
      if (upErr) throw upErr;
      uploadedPath = path;
      const { data: pub } = supabase.storage.from("album_photos").getPublicUrl(path);
      const { error: insErr } = await supabase.from("photo_album").insert({
        profile_id: user.id,
        image_url: pub.publicUrl,
        caption: caption.trim() || null,
      });
      if (insErr) throw insErr;
      toast.success("¡Foto añadida al álbum!");
      setCaption("");
      setPending(null);
      load();
    } catch (e) {
      if (uploadedPath) await supabase.storage.from("album_photos").remove([uploadedPath]);
      toast.error(e instanceof Error ? e.message : "Error subiendo foto");
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = async (photo: PhotoWithProfile) => {
    if (!confirm("¿Eliminar esta foto del álbum?")) return;
    // best-effort remove from storage
    try {
      const url = new URL(photo.image_url);
      const idx = url.pathname.indexOf("/album_photos/");
      if (idx !== -1) {
        const path = decodeURIComponent(url.pathname.slice(idx + "/album_photos/".length));
        await supabase.storage.from("album_photos").remove([path]);
      }
    } catch {
      /* ignore */
    }
    const { error } = await supabase.from("photo_album").delete().eq("id", photo.id);
    if (error) return toast.error(error.message);
    toast.success("Foto eliminada");
    setActive(null);
    load();
  };

  return (
    <AppShell>
      <PageHeader title="Álbum" subtitle="Recuerdos del enjambre" />

      <div className="px-4 pb-28">
        {loading ? (
          <p className="text-sm text-neutral-500">Cargando recuerdos...</p>
        ) : errorMsg ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-center">
            <p className="text-sm font-bold text-red-200">No se pudo abrir el álbum</p>
            <p className="mt-1 text-xs text-red-100/80">{errorMsg}</p>
            <Button
              onClick={() => {
                setLoading(true);
                load();
              }}
              size="sm"
              className="mt-4 bg-yellow-400 font-bold text-black hover:bg-yellow-300"
            >
              Reintentar
            </Button>
          </div>
        ) : photos.length === 0 ? (
          <div className="rounded-xl border border-yellow-400/20 bg-neutral-950 p-8 text-center text-sm text-neutral-400">
            Aún no hay fotos. ¡Sé el primero en subir un recuerdo del junte! 📸
          </div>
        ) : (
          <div className="columns-2 gap-2 sm:columns-3 [column-fill:_balance]">
            {photos.map((p) => (
              <button
                key={p.id}
                onClick={() => setActive(p)}
                className="mb-2 block w-full break-inside-avoid overflow-hidden rounded-lg border border-yellow-400/20 bg-neutral-900 transition-transform hover:scale-[1.02] hover:border-yellow-400/60 hover:shadow-[0_0_20px_rgba(255,196,0,0.25)]"
              >
                <img
                  src={p.image_url}
                  alt={p.caption ?? "Foto del junte"}
                  className="w-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* FAB upload */}
      {approved && (
        <div className="fixed bottom-24 right-5 z-40 flex flex-col items-end gap-2">
          {pending && (
            <div className="w-72 rounded-xl border-2 border-yellow-400 bg-neutral-950 p-3 shadow-[0_0_25px_rgba(255,196,0,0.35)]">
              <img
                src={pendingPreview ?? ""}
                alt="preview"
                className="mb-2 h-40 w-full rounded-md object-cover"
              />
              <Input
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Comentario (opcional)"
                className="mb-2 border-neutral-800 bg-neutral-900 text-sm"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => upload(pending)}
                  disabled={uploading}
                  className="flex-1 bg-yellow-400 text-black hover:bg-yellow-300"
                >
                  {uploading ? "Subiendo..." : "Publicar"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  aria-label="Cancelar subida"
                  onClick={() => {
                    setPending(null);
                    setCaption("");
                  }}
                  className="border-neutral-700 bg-neutral-900 text-neutral-300"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          )}
          {!pending && (
            <div className="flex flex-col gap-2">
              <Button
                onClick={() => galleryRef.current?.click()}
                size="icon"
                className="h-12 w-12 rounded-full border-2 border-yellow-400 bg-neutral-900 text-yellow-400 shadow-lg hover:bg-neutral-800"
                aria-label="Galería"
              >
                <ImagePlus className="h-5 w-5" />
              </Button>
              <Button
                onClick={() => cameraRef.current?.click()}
                size="icon"
                className="h-16 w-16 rounded-full bg-yellow-400 text-black shadow-[0_0_25px_rgba(255,196,0,0.55)] hover:bg-yellow-300"
                aria-label="Cámara"
              >
                <Camera className="h-7 w-7" />
              </Button>
            </div>
          )}
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => pickPhoto(e.target.files?.[0] ?? null)}
          />
          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => pickPhoto(e.target.files?.[0] ?? null)}
          />
        </div>
      )}

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-2xl border-yellow-400/30 bg-neutral-950 p-0">
          {active && (
            <div>
              <img src={active.image_url} alt={active.caption ?? ""} className="w-full" />
              <div className="flex items-center justify-between gap-2 p-3">
                <div className="flex items-center gap-2">
                  <Avatar className="h-9 w-9 border border-yellow-400/50">
                    <AvatarImage src={active.profile?.avatar_url ?? undefined} className="object-cover" />
                    <AvatarFallback className="bg-neutral-800 text-yellow-400">🐝</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-xs font-bold text-yellow-300">
                      @{active.profile?.nickname ?? "?"}
                    </p>
                    {active.caption && (
                      <p className="text-xs text-neutral-300">{active.caption}</p>
                    )}
                  </div>
                </div>
                {(isAdmin || active.profile_id === user?.id) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => removePhoto(active)}
                    className="border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20 hover:text-red-200"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
