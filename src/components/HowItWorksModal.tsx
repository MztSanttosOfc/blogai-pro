import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  UserPlus,
  Globe,
  Sparkles,
  Library,
  Send,
  DollarSign,
  BarChart3,
  ArrowLeft,
  ArrowRight,
  Check,
  type LucideIcon,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface Step {
  icon: LucideIcon;
  title: string;
  desc: string;
}

const STEPS: Step[] = [
  {
    icon: UserPlus,
    title: "Crie sua conta gratuitamente",
    desc: "Cadastre-se em segundos e receba 10 créditos gratuitos para testar a plataforma.",
  },
  {
    icon: Globe,
    title: "Conecte seu blog do Blogger",
    desc: "Autorize o acesso com a sua conta Google e selecione o blog onde vai publicar.",
  },
  {
    icon: Sparkles,
    title: "Gere artigos otimizados para SEO",
    desc: "Informe uma palavra-chave e a IA cria título, meta descrição, headings, FAQ e tags.",
  },
  {
    icon: Library,
    title: "Edite conteúdos na biblioteca",
    desc: "Revise e ajuste seus artigos com o editor de texto rico antes de publicar.",
  },
  {
    icon: Send,
    title: "Publique diretamente no Blogger",
    desc: "Envie o artigo finalizado para o seu blog sem sair da plataforma.",
  },
  {
    icon: DollarSign,
    title: "Prepare seu blog para monetização",
    desc: "Aprenda boas práticas e recomendações para deixar seu blog mais profissional.",
  },
  {
    icon: BarChart3,
    title: "Acompanhe créditos e desempenho",
    desc: "Veja créditos, estatísticas e o histórico de produção no seu painel.",
  },
];

interface HowItWorksModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HowItWorksModal({ open, onOpenChange }: HowItWorksModalProps) {
  const [step, setStep] = useState(0);
  const total = STEPS.length;
  const current = STEPS[step];
  const Icon = current.icon;
  const progress = ((step + 1) / total) * 100;

  const handleOpenChange = (next: boolean) => {
    if (!next) setStep(0);
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-base font-medium text-muted-foreground">
            Como funciona — passo {step + 1} de {total}
          </DialogTitle>
        </DialogHeader>

        <Progress value={progress} className="h-2" />

        {/* Step dots */}
        <div className="flex items-center justify-center gap-1.5">
          {STEPS.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Ir para o passo ${i + 1}`}
              onClick={() => setStep(i)}
              className={cn(
                "h-2 rounded-full transition-all",
                i === step ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30",
              )}
            />
          ))}
        </div>

        <div className="min-h-[220px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="flex flex-col items-center gap-4 px-2 py-6 text-center"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Icon className="h-8 w-8" />
              </div>
              <h3 className="font-display text-xl font-bold">{current.title}</h3>
              <p className="max-w-sm text-sm text-muted-foreground">{current.desc}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
          >
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
          {step < total - 1 ? (
            <Button variant="hero" onClick={() => setStep((s) => Math.min(total - 1, s + 1))}>
              Próximo <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button variant="hero" onClick={() => handleOpenChange(false)}>
              Concluir <Check className="h-4 w-4" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
