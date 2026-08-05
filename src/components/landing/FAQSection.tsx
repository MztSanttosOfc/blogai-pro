import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export function FAQSection() {
  const { t } = useTranslation("landing");

  const faqItems = [
    "q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8",
    "q9", "q10", "q11", "q12", "q13", "q14", "q15"
  ];

  return (
    <section id="faq" className="py-24 relative overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-5xl font-bold mb-6">
              Perguntas <span className="text-emerald-400">Frequentes</span>
            </h2>
            <p className="text-muted-foreground text-lg">
              Tudo o que você precisa saber sobre o BlogAI Pro.
            </p>
          </div>

          <Accordion type="single" collapsible className="w-full space-y-4">
            {faqItems.map((key, i) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <AccordionItem 
                  value={key}
                  className="border border-white/5 bg-white/[0.02] rounded-2xl px-6 py-2 backdrop-blur-sm overflow-hidden"
                >
                  <AccordionTrigger className="text-left text-lg hover:no-underline hover:text-emerald-400 transition-colors">
                    {t(`faq.items.${key}.q`)}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed pt-2 pb-6">
                    {t(`faq.items.${key}.a`)}
                  </AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
