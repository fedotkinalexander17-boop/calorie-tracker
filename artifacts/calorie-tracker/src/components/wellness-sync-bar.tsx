import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, ExternalLink, WifiOff, Loader2, RefreshCw } from "lucide-react";
import { useT } from "@/lib/i18n";

type SyncStatus = { enabled: false } | { enabled: true; spreadsheetId: string; url: string };

export function WellnessSyncBar() {
  const { t } = useT();
  const wt = t.wellness;
  const { toast } = useToast();

  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/sheets/wellness-sync/status");
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
      const res = await fetch("/api/sheets/wellness-sync/enable", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStatus(data);
      toast({ title: wt.syncEnabled, description: wt.syncEnabledDesc });
    } catch {
      toast({ title: wt.syncFailed, variant: "destructive" });
    } finally {
      setToggling(false);
    }
  };

  const handleDisable = async () => {
    setToggling(true);
    try {
      await fetch("/api/sheets/wellness-sync/disable", { method: "DELETE" });
      setStatus({ enabled: false });
    } catch {
      toast({ title: wt.syncFailed, variant: "destructive" });
    } finally {
      setToggling(false);
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/sheets/wellness-sync/sync-now", { method: "POST" });
      if (!res.ok) throw new Error();
      toast({ title: wt.syncNowSuccess });
    } catch {
      toast({ title: wt.syncFailed, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  if (loading) return null;

  if (!status?.enabled) {
    return (
      <div className="flex items-center gap-3 px-4 py-2.5 bg-muted/50 rounded-xl border border-dashed text-sm">
        <WifiOff className="w-4 h-4 text-muted-foreground shrink-0" />
        <span className="text-muted-foreground flex-1">{wt.syncDisabled}</span>
        <Button size="sm" variant="outline" onClick={handleEnable} disabled={toggling} className="h-7 text-xs">
          {toggling ? <Loader2 className="w-3 h-3 animate-spin" /> : wt.syncToggleOn}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-primary/5 rounded-xl border border-primary/20 text-sm flex-wrap">
      <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
      <span className="text-primary font-medium flex-1">{wt.syncEnabled}</span>
      <Button
        size="sm"
        variant="ghost"
        onClick={handleSyncNow}
        disabled={syncing}
        className="h-7 text-xs gap-1 text-muted-foreground"
      >
        {syncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
        {syncing ? wt.syncing : wt.syncNow}
      </Button>
      <a href={status.url} target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-1 text-xs text-primary hover:underline">
        {wt.syncOpenSheet}
        <ExternalLink className="w-3 h-3" />
      </a>
      <Button size="sm" variant="ghost" onClick={handleDisable} disabled={toggling}
        className="h-7 text-xs text-muted-foreground hover:text-destructive">
        {toggling ? <Loader2 className="w-3 h-3 animate-spin" /> : wt.syncToggleOff}
      </Button>
    </div>
  );
}
