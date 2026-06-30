import { useState } from "react";
import { BadgeCheck, Mail, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { compressImage } from "@/lib/image-compress";
import { PhotoPicker } from "@/components/PhotoPicker";

export function AuthScreen() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [nickname, setNickname] = useState("");
  const [avatar, setAvatar] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("¡Bienvenido al enjambre!");
      } else {
        if (!avatar) {
          toast.error("La foto de perfil es obligatoria");
          setBusy(false);
          return;
        }

        const { data: signUp, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName, nickname },
          },
        });
        if (error) throw error;

        const user = signUp.user;
        if (!user) throw new Error("No se pudo crear el usuario");

        const { error: profErr } = await supabase.from("profiles").upsert(
          {
            id: user.id,
            full_name: fullName,
            nickname,
            avatar_url: null,
          },
          { onConflict: "id" },
        );
        if (profErr) console.warn("No se pudo crear la ficha inicial", profErr);

        try {
          const { blob, ext, type } = await compressImage(avatar, 800, 0.82);
          const path = `${user.id}/avatar.${ext}`;
          const { error: upErr } = await supabase.storage
            .from("avatars")
            .upload(path, blob, { upsert: true, contentType: type });
          if (upErr) throw upErr;

          const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
          await supabase.auth.updateUser({
            data: { full_name: fullName, nickname, avatar_url: pub.publicUrl },
          });

          const { error: avatarProfileErr } = await supabase
            .from("profiles")
            .update({ avatar_url: pub.publicUrl })
            .eq("id", user.id);
          if (avatarProfileErr) console.warn("No se pudo guardar la foto en la ficha", avatarProfileErr);
        } catch (avatarErr) {
          console.warn("La cuenta se creó, pero la foto no se pudo subir", avatarErr);
          await supabase.auth.updateUser({ data: { full_name: fullName, nickname } });
        }

        toast.success("Cuenta creada. Ya estás aprobado para entrar.");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Algo falló");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="chutu-stage flex min-h-dvh items-center px-5 py-8 text-neutral-100">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 grid h-32 w-32 place-items-center rounded-[2rem] border border-yellow-300/40 bg-black/55 p-2 shadow-[0_22px_60px_rgba(0,0,0,0.45),0_0_45px_rgba(255,196,0,0.24),0_0_0_8px_rgba(255,46,147,0.06)] backdrop-blur">
            <img
              src="/logo.png"
              alt="Logo de Fraternidad Chuturubises Jrs."
              className="h-full w-full rounded-[1.55rem] object-cover"
            />
          </div>
          <p className="chutu-eyebrow">Fraternidad oficial</p>
          <h1 className="chutu-display mt-2 text-5xl leading-none text-[#FFD60A]">
            Chuturubises Jrs.
          </h1>
          <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.38em] text-white/45">
            Aguijon & Honor
          </p>
          <div className="mt-4 flex justify-center gap-2">
            {["SCZ", "Carnaval", "Junte"].map((item) => (
              <span key={item} className="chutu-ribbon rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-widest">
                {item}
              </span>
            ))}
          </div>
        </div>

        <form
          onSubmit={submit}
          className="chutu-carnival-card relative space-y-4 rounded-[1.65rem] p-5"
        >
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#FF2E93] via-[#FFD60A] to-[#00E0FF]"
          />
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="chutu-eyebrow">
                {mode === "login" ? "Acceso privado" : "Nuevo fraterno"}
              </p>
              <p className="mt-1 text-sm font-bold text-white/80">
                {mode === "login" ? "Entra al rol del enjambre" : "Registro directo al enjambre"}
              </p>
            </div>
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-yellow-300/30 bg-yellow-300/10 text-yellow-300">
              {mode === "login" ? <ShieldCheck className="h-5 w-5" /> : <BadgeCheck className="h-5 w-5" />}
            </div>
          </div>

          {mode === "signup" && (
            <>
              <div className="space-y-1.5">
                <Label className="text-yellow-300">Nombre completo</Label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  autoComplete="name"
                  className="chutu-input"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-yellow-300">Apodo en la fraternidad</Label>
                <Input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  required
                  autoComplete="nickname"
                  className="chutu-input"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-yellow-300">Foto de perfil *</Label>
                <PhotoPicker value={avatar} onChange={setAvatar} required />
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <Label className="text-yellow-300">Email</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-yellow-300/70" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="chutu-input pl-10"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-yellow-300">Contraseña</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              className="chutu-input"
            />
          </div>

          <Button
            type="submit"
            disabled={busy}
            className="chutu-primary h-12 w-full rounded-xl font-black uppercase tracking-[0.18em] transition"
          >
            {busy ? "..." : mode === "login" ? "Entrar al enjambre" : "Unirme"}
          </Button>

          <button
            type="button"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="w-full rounded-lg py-2 text-center text-xs font-bold text-neutral-400 transition hover:bg-white/5 hover:text-yellow-300"
          >
            {mode === "login" ? "¿Nuevo? Regístrate" : "Ya tengo cuenta · Iniciar sesión"}
          </button>
        </form>
      </div>
    </div>
  );
}
