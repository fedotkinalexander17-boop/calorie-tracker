import { Crown, Lock } from "lucide-react";
import { useProAccess } from "@/lib/pro-access";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function ProStatusBadge({ className }: { className?: string }) {
  const { status } = useProAccess();
  const { t } = useT();
  const pg = t.proGate;

  if (status.state === "loading" || status.state === "free") return null;

  if (status.state === "active") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200",
          className,
        )}
      >
        <Crown className="w-3 h-3" />
        {pg.proBadge}
        {status.daysLeft <= 5 && (
          <span className="text-amber-600">· {pg.daysLeft(status.daysLeft)}</span>
        )}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200",
        className,
      )}
    >
      <Lock className="w-3 h-3" />
      {pg.expiredBadge}
    </span>
  );
}
