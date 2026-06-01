import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, ExternalLink, WifiOff, Loader2 } from "lucide-react";
import { useT } from "@/lib/i18n";

type SyncStatus = { enabled: false } | { enabled: true; spreadsheetId: string; url: string };

export function SheetSyncBar({ date }: { date: string }) {
  const { t } = useT();
  const l = t.log;
  const { toast } = useToast();

  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/sheets/auto-sync/status");
      const data = await res.json();
      setStatus(data);
    } catch {
      setStatus({ enabled: false });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStatus(); }, []);

  const handleEnable = async () => {
    setToggling(true);
    try {
      const res = await fetch("/api/sheets/auto-sync/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStatus(data);
    } catch {
      toast({ title: l.syncFailed, variant: "destructive" });
    } finally {
      setToggling(false);
    }
  };

  const handleDisable = async () => {
    setToggling(true);
    try {
      await fetch("/api/sheets/auto-sync/disable", { method: "DELETE" });
      setStatus({ enabled: false });
    } catch {
      toast({ title: l.syncFailed, variant: "destructive" });
    } finally {
      setToggling(false);
    }
  };

  if (loading) return null;

  if (!status?.enabled) {
    return (
      <div className="flex items-center gap-3 px-4 py-2.5 bg-muted/50 rounded-xl border border-dashed text-sm">
        <WifiOff className="w-4 h-4 text-muted-foreground shrink-0" />
        <span className="text-muted-foreground flex-1">{l.syncDisabled}</span>
        <Button
          size="sm"
          variant="outline"
          onClick={handleEnable}
          disabled={toggling}
          className="h-7 text-xs"
        >
          {toggling ? <Loader2 className="w-3 h-3 animate-spin" /> : l.syncToggleOn}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-primary/5 rounded-xl border border-primary/20 text-sm">
      <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
      <span className="text-primary font-medium flex-1">{l.syncEnabled}</span>
      <a
        href={status.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 text-xs text-primary hover:underline"
      >
        {l.syncOpenSheet}
        <ExternalLink className="w-3 h-3" />
      </a>
      <Button
        size="sm"
        variant="ghost"
        onClick={handleDisable}
        disabled={toggling}
        className="h-7 text-xs text-muted-foreground hover:text-destructive"
      >
        {toggling ? <Loader2 className="w-3 h-3 animate-spin" /> : l.syncToggleOff}
      </Button>
    </div>
  );
}
