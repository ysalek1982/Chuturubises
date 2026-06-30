import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  turnId: string;
  turnLabel: string;
  onRated?: () => void;
};

export function RateTurnDialog({ open, onOpenChange, turnId, turnLabel, onRated }: Props) {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setRating(0);
      setHover(0);
      setComment("");
    }
  }, [open]);

  const submit = async () => {
    if (!user) return toast.error("Inicia sesión");
    if (rating < 1 || rating > 5) return toast.error("Elige de 1 a 5 estrellas");
    setSubmitting(true);
    const { error } = await supabase.from("turn_ratings").insert({
      turn_id: turnId,
      profile_id: user.id,
      rating_value: rating,
      comment: comment.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      if (error.code === "23505") toast.error("Ya calificaste este junte");
      else toast.error(error.message);
      return;
    }
    toast.success("¡Calificación enviada! ⭐");
    onOpenChange(false);
    onRated?.();
  };

  const active = hover || rating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-yellow-400/40 bg-neutral-950">
        <DialogHeader>
          <DialogTitle className="text-yellow-400">Calificar junte</DialogTitle>
        </DialogHeader>
        <p className="-mt-2 text-xs text-neutral-400">{turnLabel}</p>

        <div className="flex justify-center gap-1.5 py-3">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(n)}
              className="transition-transform hover:scale-125 active:scale-110"
              aria-label={`${n} estrella${n > 1 ? "s" : ""}`}
            >
              <Star
                className={`h-10 w-10 transition-all ${
                  n <= active
                    ? "fill-[#FFC400] text-[#FFC400] drop-shadow-[0_0_8px_rgba(255,196,0,0.7)]"
                    : "text-neutral-700"
                }`}
              />
            </button>
          ))}
        </div>

        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Comentario (opcional). Ej: ¡La mejor temática! 🎉"
          maxLength={500}
          className="border-neutral-800 bg-neutral-900 text-sm"
        />

        <Button
          onClick={submit}
          disabled={submitting || rating === 0}
          className="mt-2 w-full bg-yellow-400 font-black uppercase tracking-widest text-black hover:bg-yellow-300"
        >
          {submitting ? "Enviando..." : "Enviar calificación"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
