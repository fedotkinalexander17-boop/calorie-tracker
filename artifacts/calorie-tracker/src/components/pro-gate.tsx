import { ReactNode } from "react";
import { Lock, Sparkles } from "lucide-react";
import { useProAccess, isPro } from "@/lib/pro-access";
import { useT } from "@/lib/i18n";

interface ProGateProps {
  children: ReactNode;
  feature?: string;
}

export function ProGate({ children, feature }: ProGateProps) {
  const { status } = useProAccess();
  const { t } = useT();
  const pg = t.proGate;

  if (status.state === "loading") return null;

  if (isPro(status)) {
    return <>{children}</>;
  }

  const isExpired = status.state === "expired" || status.state === "revoked";

  return (
    <div className="relative rounded-2xl overflow-hidden">
      <div className="pointer-events-none select-none blur-sm opacity-40 scale-95 origin-top">
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-sm p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          {isExpired ? (
            <Lock className="w-6 h-6 text-primary" />
          ) : (
            <Sparkles className="w-6 h-6 text-primary" />
          )}
        </div>
        <div>
          <p className="font-semibold text-foreground text-base">
            {isExpired ? pg.expiredTitle : pg.lockedTitle}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {isExpired ? pg.expiredDesc : pg.lockedDesc}
            {feature && !isExpired && (
              <span className="block font-medium text-foreground mt-1">{feature}</span>
            )}
          </p>
        </div>
        <a
          href="mailto:support@example.com"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          {isExpired ? pg.renewBtn : pg.upgradeBtn}
        </a>
      </div>
    </div>
  );
}
