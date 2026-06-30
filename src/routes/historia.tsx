import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Pencil, Save, X } from "lucide-react";

export const Route = createFileRoute("/historia")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Historia · Chuturubises Jrs." },
      { name: "description", content: "Reseña histórica de la Fraternidad Chuturubises Jrs." },
    ],
  }),
  component: Historia,
});

const FALLBACK =
  'La **Fraternidad Chuturubises Jrs.** nació en las calles polvorientas del carnaval.\n\n**Lema:** "Zumba duro o no zumbes."';

function Historia() {
  const { isAdmin } = useAuth();
  const [text, setText] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("fraternity_settings")
      .select("value")
      .eq("key", "historia")
      .maybeSingle();
    setText((data?.value as string) ?? FALLBACK);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const startEdit = () => {
    setDraft(text);
    setEditing(true);
  };

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("fraternity_settings")
      .upsert({ key: "historia", value: draft, updated_at: new Date().toISOString() });
    setSaving(false);
    if (error) return toast.error(error.message);
    setText(draft);
    setEditing(false);
    toast.success("Historia actualizada");
  };

  return (
    <AppShell>
      <PageHeader title="Historia" subtitle="Nuestras raíces" />
      <article className="space-y-5 px-5 text-sm leading-relaxed text-neutral-300">
        {isAdmin && !editing && (
          <Button
            onClick={startEdit}
            size="sm"
            className="bg-yellow-400 font-bold uppercase tracking-wider text-black hover:bg-yellow-300"
          >
            <Pencil className="h-4 w-4" /> Editar historia
          </Button>
        )}

        {editing ? (
          <div className="space-y-3">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="min-h-[320px] border-yellow-400/30 bg-neutral-950 text-neutral-100"
            />
            <div className="flex gap-2">
              <Button
                onClick={save}
                disabled={saving}
                className="flex-1 bg-yellow-400 font-bold text-black hover:bg-yellow-300"
              >
                <Save className="h-4 w-4" /> Guardar
              </Button>
              <Button
                onClick={() => setEditing(false)}
                variant="outline"
                className="border-neutral-700 bg-transparent text-neutral-300"
              >
                <X className="h-4 w-4" /> Cancelar
              </Button>
            </div>
          </div>
        ) : loading ? (
          <p className="text-neutral-500">Cargando historia...</p>
        ) : (
          <div className="space-y-4 whitespace-pre-wrap rounded-xl border border-yellow-400/20 bg-yellow-400/5 p-4 text-neutral-200">
            {renderMarkdownLite(text)}
          </div>
        )}
      </article>
    </AppShell>
  );
}

function renderMarkdownLite(src: string) {
  return src.split("\n").map((line, i) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return (
      <p key={i} className={line.startsWith("**Lema") ? "text-lg font-bold text-yellow-400" : ""}>
        {parts.map((p, j) =>
          p.startsWith("**") && p.endsWith("**") ? (
            <strong key={j} className="text-yellow-400">
              {p.slice(2, -2)}
            </strong>
          ) : (
            <span key={j}>{p}</span>
          ),
        )}
      </p>
    );
  });
}
