import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { CajaStatusCard } from "@/components/CajaStatusCard";
import { MisCuotas } from "@/components/MisCuotas";
import { PageHeader } from "@/components/PageHeader";
import { ProfileAvatarUploader } from "@/components/perfil/ProfileAvatarUploader";
import { ProfileForm } from "@/components/perfil/ProfileForm";
import { useAuth } from "@/lib/auth";
import { compressImage } from "@/lib/image-compress";
import { shareInvite } from "@/lib/share";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export const Route = createFileRoute("/perfil")({
  ssr: false,
  head: () => ({ meta: [{ title: "Perfil - Chuturubises Jrs." }] }),
  component: PerfilPage,
});

function PerfilPage() {
  return (
    <AppShell>
      <div className="min-h-dvh">
        <PageHeader title="Perfil" subtitle="Tu aguijon" />
        <PerfilInner />
      </div>
    </AppShell>
  );
}

function PerfilInner() {
  const { profile, user, refreshProfile, signOut, role } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [nickname, setNickname] = useState(profile?.nickname ?? "");
  const [birthDate, setBirthDate] = useState(profile?.birth_date ?? "");
  const [tshirtSize, setTshirtSize] = useState(profile?.tshirt_size ?? "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
    setNickname(profile?.nickname ?? "");
    setBirthDate(profile?.birth_date ?? "");
    setTshirtSize(profile?.tshirt_size ?? "");
  }, [profile]);

  if (!profile) {
    return <p className="px-5 pt-6 text-sm text-neutral-500">No se encontro tu perfil.</p>;
  }

  const update = async () => {
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        nickname,
        birth_date: birthDate || null,
        tshirt_size: tshirtSize || null,
      })
      .eq("id", profile.id);
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Perfil actualizado");
      refreshProfile();
    }
  };

  const changeAvatar = async (file: File) => {
    if (!user) return;
    setBusy(true);
    try {
      const { blob, ext, type } = await compressImage(file, 800, 0.82);
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { contentType: type, upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: pub.publicUrl })
        .eq("id", user.id);
      if (error) throw error;
      toast.success("Foto actualizada");
      refreshProfile();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Error al subir la foto";
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const onShare = async () => {
    const r = await shareInvite();
    if (r === "copied") toast.success("Enlace copiado al portapapeles");
    else if (r === "unavailable") toast.error("Tu navegador no permite compartir.");
  };

  return (
    <div className="px-4 pb-6 pt-4">
      <ProfileAvatarUploader
        avatarUrl={profile.avatar_url}
        nickname={profile.nickname}
        fullName={profile.full_name}
        approvalStatus={profile.approval_status}
        role={role}
        tshirtSize={profile.tshirt_size}
        birthDate={profile.birth_date}
        onPick={changeAvatar}
      />

      <div className="mt-4 space-y-4">
        <ProfileForm
          fullName={fullName}
          nickname={nickname}
          birthDate={birthDate ?? ""}
          tshirtSize={tshirtSize ?? ""}
          busy={busy}
          onFullNameChange={setFullName}
          onNicknameChange={setNickname}
          onBirthDateChange={setBirthDate}
          onTshirtSizeChange={setTshirtSize}
          onSave={update}
          onShare={onShare}
        />

        <CajaStatusCard />
        <MisCuotas />

        <Button
          onClick={signOut}
          variant="outline"
          className="h-11 w-full rounded-xl border border-[#FF2E93]/45 bg-[#FF2E93]/8 font-black uppercase tracking-wider text-[#FF5CAD] hover:bg-[#FF2E93]/15 hover:text-[#FF8AC2]"
        >
          <LogOut className="h-4 w-4" /> Cerrar sesión
        </Button>
      </div>
    </div>
  );
}
