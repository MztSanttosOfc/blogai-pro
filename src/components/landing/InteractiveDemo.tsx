import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Send, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function InteractiveDemo() {
  const [topic, setTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic || isGenerating) return;

    setIsGenerating(true);
    setResult(null);

    // Simulated generation
    setTimeout(() => {
      setIsGenerating(false);
      setResult(`Pronto! A IA estruturou um artigo completo sobre "${topic}" com 1.200 palavras, 8 imagens e SEO 100% otimizado. Quer ver o resultado real?`);
    }, 3000);
  };

  return (
    <section className="py-24 relative overflow-hidden">
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="font-display text-3xl md:text-5xl font-bold mb-6"
            >
              Experimente a <span className="text-emerald-400">Magia da IA</span>
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-muted-foreground text-lg"
            >
              Digite qualquer tema e veja como nossa inteligência artificial estrutura o seu próximo grande sucesso no Blogger.
            </motion.p>
          </div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="p-8 md:p-12 rounded-3xl border border-emerald-500/20 bg-black/40 backdrop-blur-xl shadow-2xl relative"
          >
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-emerald-500 text-black font-bold px-6 py-2 rounded-full text-sm shadow-[0_0_20px_rgba(16,185,129,0.4)]">
              SIMULADOR EM TEMPO REAL
            </div>

            <form onSubmit={handleGenerate} className="flex flex-col md:flex-row gap-4 mb-8">
              <div className="relative flex-1">
                <Input 
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Ex: Como ganhar dinheiro com Blogger em 2026"
                  className="h-14 bg-white/5 border-white/10 text-lg px-6 focus:ring-emerald-500/50"
                  disabled={isGenerating}
                />
                <Sparkles className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500 w-5 h-5 pointer-events-none" />
              </div>
              <Button 
                type="submit" 
                size="xl" 
                className="bg-emerald-500 hover:bg-emerald-600 text-white min-w-[160px]"
                disabled={isGenerating || !topic}
              >
                {isGenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : "Gerar Agora"}
              </Button>
            </form>

            <AnimatePresence mode="wait">
              {isGenerating && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-3 text-emerald-400 text-sm font-medium">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analizando nicho e pesquisando palavras-chave...
                  </div>
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-emerald-500"
                      initial={{ width: 0 }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 3 }}
                    />
                  </div>
                </motion.div>
              )}

              {result && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20"
                >
                  <p className="text-emerald-100 mb-6 leading-relaxed">
                    {result}
                  </p>
                  <Button variant="outline" className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 group">
                    Ver demonstração completa <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </motion.div>
              )}

              {!isGenerating && !result && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 opacity-50">
                  <div className="p-4 rounded-xl border border-white/5 bg-white/5 text-xs text-white/50 text-center">
                    Geração de H1, H2 e H3
                  </div>
                  <div className="p-4 rounded-xl border border-white/5 bg-white/5 text-xs text-white/50 text-center">
                    Meta Description Automática
                  </div>
                  <div className="p-4 rounded-xl border border-white/5 bg-white/5 text-xs text-white/50 text-center">
                    FAQ e Tags de SEO
                  </div>
                </div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>

      {/* Background Decor */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/10 blur-[120px] pointer-events-none" />
    </section>
  );
}
