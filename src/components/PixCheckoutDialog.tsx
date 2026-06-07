import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useServerFn } from "@tanstack/react-start";
import { Copy, Loader2, CheckCircle2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createPixPayment, checkPaymentStatus } from "@/lib/payments.functions";
import { useAuth } from "@/hooks/use-auth";

type PlanId = "pro" | "premium" | "teste";

interface PixCheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: PlanId | null;
  planName: string;
  priceLabel: string;
}

interface PixData {
  paymentId: string;
  pixCode: string;
  amountCents: number;
  planName: string;
}

const onlyDigits = (v: string) => v.replace(/\D/g, "");

export function PixCheckoutDialog({
  open,
  onOpenChange,
  planId,
  planName,
  priceLabel,
}: PixCheckoutDialogProps) {
  const { refreshProfile } = useAuth();
  const createPix = useServerFn(createPixPayment);
  const checkStatus = useServerFn(checkPaymentStatus);

  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [pix, setPix] = useState<PixData | null>(null);
  const [paid, setPaid] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!open) {
      setCpf("");
      setPhone("");
      setPix(null);
      setPaid(false);
      setLoading(false);
      if (pollRef.current) clearInterval(pollRef.current);
    }
  }, [open]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const startPolling = (paymentId: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await checkStatus({ data: { paymentId } });
        if (res.status === "paid") {
          if (pollRef.current) clearInterval(pollRef.current);
          setPaid(true);
          await refreshProfile();
          toast.success("Pagamento confirmado! Plano ativado.");
        } else if (res.status === "failed") {
          if (pollRef.current) clearInterval(pollRef.current);
          toast.error("Pagamento não foi concluído. Tente novamente.");
        }
      } catch {
        /* keep polling silently */
      }
    }, 5000);
  };

  const handleGenerate = async () => {
    if (!planId) return;
    if (onlyDigits(cpf).length !== 11) {
      toast.error("Informe um CPF válido (11 dígitos).");
      return;
    }
    if (onlyDigits(phone).length < 10) {
      toast.error("Informe um telefone válido com DDD.");
      return;
    }
    setLoading(true);
    try {
      const res = await createPix({
        data: { planId, cpf: onlyDigits(cpf), phone: onlyDigits(phone) },
      });
      setPix(res);
      startPolling(res.paymentId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao gerar o Pix.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!pix) return;
    await navigator.clipboard.writeText(pix.pixCode);
    toast.success("Código Pix copiado!");
  };

  const handleManualCheck = async () => {
    if (!pix) return;
    try {
      const res = await checkStatus({ data: { paymentId: pix.paymentId } });
      if (res.status === "paid") {
        setPaid(true);
        await refreshProfile();
        toast.success("Pagamento confirmado! Plano ativado.");
      } else {
        toast.info("Ainda não identificamos o pagamento. Aguarde alguns instantes.");
      }
    } catch {
      toast.error("Não foi possível verificar o pagamento agora.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {paid ? "Plano ativado!" : `Assinar plano ${planName}`}
          </DialogTitle>
          <DialogDescription>
            {paid
              ? "Seu pagamento foi confirmado e os créditos já estão disponíveis."
              : `Pagamento único via Pix — ${priceLabel}`}
          </DialogDescription>
        </DialogHeader>

        {paid ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle2 className="h-16 w-16 text-success" />
            <p className="text-sm text-muted-foreground">
              Aproveite todos os recursos do plano {planName}.
            </p>
            <Button className="w-full" onClick={() => onOpenChange(false)}>
              Concluir
            </Button>
          </div>
        ) : !pix ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                inputMode="numeric"
                placeholder="000.000.000-00"
                value={cpf}
                maxLength={14}
                onChange={(e) => setCpf(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone (com DDD)</Label>
              <Input
                id="phone"
                inputMode="numeric"
                placeholder="(11) 99999-9999"
                value={phone}
                maxLength={15}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <Button className="w-full" variant="hero" onClick={handleGenerate} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gerando Pix...
                </>
              ) : (
                "Gerar código Pix"
              )}
            </Button>
            <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
              <ShieldCheck className="h-3 w-3" /> Pagamento seguro processado pela SyncPay.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-center rounded-xl bg-white p-4">
              <QRCodeSVG value={pix.pixCode} size={200} level="M" />
            </div>
            <div className="space-y-2">
              <Label>Pix copia e cola</Label>
              <div className="flex gap-2">
                <Input readOnly value={pix.pixCode} className="font-mono text-xs" />
                <Button size="icon" variant="outline" onClick={handleCopy} aria-label="Copiar">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Aguardando confirmação do pagamento...
            </div>
            <Button variant="outline" className="w-full" onClick={handleManualCheck}>
              Já paguei, verificar agora
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
