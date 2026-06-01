import { useState, useEffect } from "react";
import { Copy, Plus, X, RefreshCw, Crown, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

interface TokenRow {
  id: number;
  token: string;
  label: string;
  createdAt: string;
  expiresAt: string;
  isRevoked: boolean;
  isExpired: boolean;
  daysLeft: number;
}

export default function AdminTokensPage() {
  const [secret, setSecret] = useState(() => localStorage.getItem("admin_secret") ?? "");
  const [authed, setAuthed] = useState(false);
  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [label, setLabel] = useState("");
  const [days, setDays] = useState("32");
  const [creating, setCreating] = useState(false);
  const [newUrl, setNewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const headers = { "Content-Type": "application/json", "x-admin-secret": secret };

  const loadTokens = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/tokens", { headers, credentials: "include" });
      if (res.status === 403) { setError("Неверный секретный ключ"); setAuthed(false); return; }
      const data = await res.json();
      setTokens(data.data ?? []);
      setAuthed(true);
      localStorage.setItem("admin_secret", secret);
    } catch {
      setError("Ошибка сети");
    } finally {
      setLoading(false);
    }
  };

  const createToken = async () => {
    setCreating(true);
    setNewUrl(null);
    try {
      const res = await fetch("/api/admin/tokens", {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({ label, days: Number(days) }),
      });
      const data = await res.json();
      setNewUrl(data.url);
      setLabel("");
      loadTokens();
    } catch {
      setError("Не удалось создать токен");
    } finally {
      setCreating(false);
    }
  };

  const revokeToken = async (id: number) => {
    await fetch(`/api/admin/tokens/${id}/revoke`, { method: "PATCH", headers, credentials: "include" });
    loadTokens();
  };

  const copy = (text: string) => navigator.clipboard.writeText(text);

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="w-full max-w-sm p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-primary" />
            <h1 className="font-semibold text-lg">Управление Pro-доступом</h1>
          </div>
          <Input
            type="password"
            placeholder="Секретный ключ администратора"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadTokens()}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button className="w-full" onClick={loadTokens}>Войти</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-primary" />
          <h1 className="font-semibold text-xl">Управление Pro-токенами</h1>
        </div>
        <Button variant="outline" size="icon" onClick={loadTokens} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <Card className="p-4 space-y-3">
        <h2 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Новый токен</h2>
        <div className="flex gap-2">
          <Input placeholder="Имя клиента (Иван, мес. апрель)" value={label} onChange={(e) => setLabel(e.target.value)} />
          <Input className="w-20" type="number" min={1} max={365} value={days} onChange={(e) => setDays(e.target.value)} />
          <span className="flex items-center text-sm text-muted-foreground whitespace-nowrap">дней</span>
          <Button onClick={createToken} disabled={creating}>
            <Plus className="w-4 h-4 mr-1" /> Создать
          </Button>
        </div>
        {newUrl && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-sm font-mono break-all flex-1 text-primary">{newUrl}</p>
            <Button size="icon" variant="ghost" onClick={() => copy(newUrl)}>
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        )}
      </Card>

      <div className="space-y-3">
        {tokens.length === 0 && !loading && (
          <p className="text-center text-muted-foreground text-sm py-8">Токенов пока нет</p>
        )}
        {tokens.map((t) => (
          <Card key={t.id} className={`p-4 ${t.isRevoked || t.isExpired ? "opacity-60" : ""}`}>
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{t.label || "—"}</span>
                  {t.isRevoked && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Отозван</span>}
                  {!t.isRevoked && t.isExpired && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">Истёк</span>}
                  {!t.isRevoked && !t.isExpired && t.daysLeft <= 5 && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">⚠ {t.daysLeft}д</span>}
                  {!t.isRevoked && !t.isExpired && t.daysLeft > 5 && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ {t.daysLeft}д</span>}
                </div>
                <p className="text-xs text-muted-foreground font-mono truncate">{t.token}</p>
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  до {new Date(t.expiresAt).toLocaleDateString("ru-RU")}
                </p>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => copy(t.token)} title="Копировать токен">
                  <Copy className="w-4 h-4" />
                </Button>
                {!t.isRevoked && (
                  <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => revokeToken(t.id)} title="Отозвать">
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
