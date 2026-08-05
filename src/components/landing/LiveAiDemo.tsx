import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Check, Loader2, FileText, Search, Tag, Layout } from "lucide-react";
import { cn } from "@/lib/utils";

interface DemoArticle {
  title: string;
  meta: string;
  h2: string;
  content: string;
}

const STEPS = [
  { id: "analyzing", icon: Search, color: "text-blue-400" },
  { id: "structuring", icon: Layout, color: "text-teal-400" },
  { id: "writing", icon: FileText, color: "text-emerald-400" },
  { id: "optimizing", icon: Sparkles, color: "text-purple-400" },
];

export function LiveAiDemo() {
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<"typing" | "idle" | "completed">("typing");

  const fullText = "Como a Inteligência Artificial está revolucionando o Blogger em 2026. A automação de conteúdo permite que criadores foquem na estratégia enquanto a IA cuida do SEO técnico, geração de imagens e publicação otimizada.";

  useEffect(() => {
    let timer: any;
    
    if (phase === "typing") {
      if (text.length < fullText.length) {
        timer = setTimeout(() => {
          setText(fullText.slice(0, text.length + 1));
          setProgress((text.length / fullText.length) * 100);
          
          // Change step based on progress
          if (progress > 25 && step === 0) setStep(1);
          if (progress > 50 && step === 1) setStep(2);
          if (progress > 75 && step === 2) setStep(3);
        }, 30 + Math.random() * 40);
      } else {
        setPhase("completed");
        timer = setTimeout(() => {
          setPhase("typing");
          setText("");
          setStep(0);
          setProgress(0);
        }, 5000);
      }
    }

    return () => clearTimeout(timer);
  }, [text, phase, progress, step]);

  return (
    <div className="w-full h-full bg-[#0b0a14] p-6 font-mono text-sm overflow-hidden flex flex-col">
      {/* AI Status Header */}
      <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <div className="absolute inset-0 w-3 h-3 rounded-full bg-emerald-500 blur-sm animate-ping" />
          </div>
          <span className="text-emerald-400 font-bold tracking-widest text-xs uppercase">AI Engine Active</span>
        </div>
        <div className="flex gap-2">
          {STEPS.map((s, i) => (
            <div 
              key={s.id}
              className={cn(
                "p-2 rounded-lg transition-colors",
                i <= step ? "bg-white/5 " + s.color : "text-white/20"
              )}
            >
              <s.icon className="w-4 h-4" />
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 space-y-6 overflow-hidden">
        {/* Title Generation */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[10px] text-white/30 uppercase tracking-tighter">
            <Tag className="w-3 h-3" /> SEO Optimized Title
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-white/90 min-h-[44px]">
            {step >= 1 ? "A Revolução da IA no Blogger: Guia Completo 2026" : <span className="text-white/20">Gerando...</span>}
          </div>
        </div>

        {/* Content Typing */}
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-2 text-[10px] text-white/30 uppercase tracking-tighter">
            <FileText className="w-3 h-3" /> Body Content
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-white/70 h-full overflow-hidden leading-relaxed text-xs">
            {text}
            <span className="w-1 h-4 bg-emerald-500 inline-block ml-1 animate-caret" />
          </div>
        </div>

        {/* SEO Metrics Overlay */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <div className="text-[9px] text-emerald-400/60 uppercase">SEO Score</div>
            <div className="text-xl font-bold text-emerald-400">{Math.min(98, Math.round(progress * 1.2))}%</div>
          </div>
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <div className="text-[9px] text-blue-400/60 uppercase">Keywords</div>
            <div className="text-xl font-bold text-blue-400">{Math.round(progress / 10)}/12</div>
          </div>
          <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
            <div className="text-[9px] text-purple-400/60 uppercase">Readability</div>
            <div className="text-xl font-bold text-purple-400">High</div>
          </div>
        </div>
      </div>

      {/* Progress Footer */}
      <div className="mt-6 pt-4 border-t border-white/5">
        <div className="flex justify-between text-[10px] text-white/30 mb-2">
          <span>Generating Article Structure...</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ type: "spring", bounce: 0, duration: 0.5 }}
          />
        </div>
      </div>
    </div>
  );
}
