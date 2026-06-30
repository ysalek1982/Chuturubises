import { AtSign, Cake, Save, Share2, Shirt, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InstallPwaButton } from "./InstallPwaButton";

const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];

type Props = {
  fullName: string;
  nickname: string;
  birthDate: string;
  tshirtSize: string;
  busy: boolean;
  onFullNameChange: (v: string) => void;
  onNicknameChange: (v: string) => void;
  onBirthDateChange: (v: string) => void;
  onTshirtSizeChange: (v: string) => void;
  onSave: () => void;
  onShare: () => void;
};

export function ProfileForm({
  fullName,
  nickname,
  birthDate,
  tshirtSize,
  busy,
  onFullNameChange,
  onNicknameChange,
  onBirthDateChange,
  onTshirtSizeChange,
  onSave,
  onShare,
}: Props) {
  return (
    <section className="chutu-panel space-y-4 rounded-[1.45rem] p-4">
      <div>
        <p className="chutu-eyebrow">Datos del fraterno</p>
        <h3 className="mt-1 text-lg font-black text-white">Ficha oficial</h3>
      </div>

      <div className="space-y-1.5">
        <Label className="font-bold uppercase tracking-wider text-[#FFD60A]">Nombre completo</Label>
        <div className="relative">
          <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-yellow-300/70" />
          <Input
            value={fullName}
            onChange={(e) => onFullNameChange(e.target.value)}
            autoComplete="name"
            className="chutu-input pl-10"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="font-bold uppercase tracking-wider text-[#FFD60A]">Apodo</Label>
        <div className="relative">
          <AtSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-yellow-300/70" />
          <Input
            value={nickname}
            onChange={(e) => onNicknameChange(e.target.value)}
            autoComplete="nickname"
            className="chutu-input pl-10"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[#FFD60A]">
            <Cake className="h-3.5 w-3.5" /> Cumple
          </Label>
          <Input
            type="date"
            value={birthDate ?? ""}
            onChange={(e) => onBirthDateChange(e.target.value)}
            className="chutu-input"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[#FFD60A]">
            <Shirt className="h-3.5 w-3.5" /> Talla
          </Label>
          <Select value={tshirtSize ?? ""} onValueChange={onTshirtSizeChange}>
            <SelectTrigger className="chutu-input h-12">
              <SelectValue placeholder="Talla" />
            </SelectTrigger>
            <SelectContent>
              {SIZES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2">
        <Button
          onClick={onSave}
          disabled={busy}
          className="chutu-primary h-11 rounded-xl font-black uppercase tracking-widest"
        >
          <Save className="h-4 w-4" /> Guardar cambios
        </Button>

        <Button
          onClick={onShare}
          variant="outline"
          className="chutu-outline h-11 rounded-xl font-black uppercase tracking-widest"
        >
          <Share2 className="h-4 w-4" /> Invitar fraternos
        </Button>
      </div>

      <InstallPwaButton />
    </section>
  );
}
