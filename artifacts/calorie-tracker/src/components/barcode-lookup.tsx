import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useCreateFood, getListFoodsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Barcode, Camera, Loader2, CheckCircle, AlertCircle, Search } from "lucide-react";
import { useT } from "@/lib/i18n";
import { BrowserMultiFormatReader } from "@zxing/browser";

type FoodFormState = {
  name: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  servingSize: string;
};

const emptyForm: FoodFormState = {
  name: "",
  calories: "",
  protein: "",
  carbs: "",
  fat: "",
  servingSize: "",
};

type LookupState = "idle" | "looking" | "found" | "notfound" | "error";

async function fetchFromOpenFoodFacts(barcode: string): Promise<FoodFormState | null> {
  const res = await fetch(
    `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`,
    { headers: { "User-Agent": "CalorieTracker/1.0" } }
  );
  if (!res.ok) return null;
  const data = await res.json();
  if (data.status !== 1) return null;

  const p = data.product ?? {};
  const n = p.nutriments ?? {};

  const name =
    p.product_name_ru ||
    p.product_name_en ||
    p.product_name ||
    "";

  const kcal =
    n["energy-kcal_100g"] ??
    (n["energy_100g"] != null ? Math.round(n["energy_100g"] / 4.184) : 0);

  const serving = p.serving_size || "100г";

  return {
    name: name.trim(),
    calories: String(Math.round(Number(kcal) || 0)),
    protein: String(Math.round(Number(n["proteins_100g"]) || 0)),
    carbs: String(Math.round(Number(n["carbohydrates_100g"]) || 0)),
    fat: String(Math.round(Number(n["fat_100g"]) || 0)),
    servingSize: serving,
  };
}

function FormField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-8 text-sm"
      />
    </div>
  );
}

export function BarcodeLookup({ onFoodAdded }: { onFoodAdded?: () => void }) {
  const { t } = useT();
  const f = t.foods;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createFood = useCreateFood();

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"scan" | "manual">("scan");
  const [manualCode, setManualCode] = useState("");
  const [lookupState, setLookupState] = useState<LookupState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [form, setForm] = useState<FoodFormState>(emptyForm);
  const [cameraAvailable, setCameraAvailable] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const scanningRef = useRef(false);

  const setField = (key: keyof FoodFormState, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const resetState = useCallback(() => {
    setLookupState("idle");
    setManualCode("");
    setForm(emptyForm);
    setErrorMsg("");
  }, []);

  const stopCamera = useCallback(() => {
    scanningRef.current = false;
    try {
      readerRef.current?.reset();
    } catch {}
    readerRef.current = null;
  }, []);

  const handleLookup = useCallback(async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;
    stopCamera();
    setLookupState("looking");
    setErrorMsg("");
    try {
      const result = await fetchFromOpenFoodFacts(trimmed);
      if (result) {
        setForm(result);
        setLookupState("found");
      } else {
        setForm({ ...emptyForm });
        setLookupState("notfound");
      }
    } catch {
      setLookupState("error");
      setErrorMsg(f.barcodeErrorNetwork);
    }
  }, [stopCamera, f.barcodeErrorNetwork]);

  const startCamera = useCallback(async () => {
    if (!videoRef.current || scanningRef.current) return;
    scanningRef.current = true;
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;
    try {
      await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result) => {
          if (result && scanningRef.current) {
            const code = result.getText();
            handleLookup(code);
          }
        }
      );
    } catch {
      setCameraAvailable(false);
      scanningRef.current = false;
      setTab("manual");
    }
  }, [handleLookup]);

  useEffect(() => {
    if (!open) {
      stopCamera();
      resetState();
      setTab("scan");
      setCameraAvailable(true);
    }
  }, [open, stopCamera, resetState]);

  useEffect(() => {
    if (open && tab === "scan" && lookupState === "idle" && cameraAvailable) {
      const timer = setTimeout(() => startCamera(), 200);
      return () => clearTimeout(timer);
    } else if (tab !== "scan") {
      stopCamera();
    }
  }, [open, tab, lookupState, cameraAvailable, startCamera, stopCamera]);

  const handleAdd = () => {
    if (!form.name) return;
    createFood.mutate(
      {
        data: {
          name: form.name,
          calories: Number(form.calories) || 0,
          protein: Number(form.protein) || 0,
          carbs: Number(form.carbs) || 0,
          fat: Number(form.fat) || 0,
          servingSize: form.servingSize || f.barcodeServingAuto,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListFoodsQueryKey() });
          toast({
            title: f.toastAdded,
            description: f.toastAddedDesc(form.name),
          });
          setOpen(false);
          onFoodAdded?.();
        },
      }
    );
  };

  const showReviewForm = lookupState === "found" || lookupState === "notfound";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Barcode className="w-4 h-4 md:mr-2" />
          <span className="hidden md:inline">{f.barcodeBtn}</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{f.barcodeDialogTitle}</DialogTitle>
          <p className="text-sm text-muted-foreground">{f.barcodeSubtitle}</p>
        </DialogHeader>

        <div className="space-y-4">
          {lookupState === "looking" && (
            <div className="flex flex-col items-center justify-center gap-3 py-8 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="text-sm">{f.barcodeLooking}</span>
            </div>
          )}

          {lookupState === "error" && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg text-destructive text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p>{errorMsg}</p>
                <Button
                  variant="link"
                  className="h-auto p-0 text-xs mt-1"
                  onClick={resetState}
                >
                  {f.barcodeLookupBtn} →
                </Button>
              </div>
            </div>
          )}

          {lookupState === "idle" && (
            <Tabs value={tab} onValueChange={(v) => setTab(v as "scan" | "manual")}>
              <TabsList className="w-full">
                <TabsTrigger value="scan" className="flex-1" disabled={!cameraAvailable}>
                  <Camera className="w-4 h-4 mr-2" />
                  {f.barcodeScanTab}
                </TabsTrigger>
                <TabsTrigger value="manual" className="flex-1">
                  <Search className="w-4 h-4 mr-2" />
                  {f.barcodeManualTab}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="scan" className="mt-3">
                {cameraAvailable ? (
                  <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                    <video
                      ref={videoRef}
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                    />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-48 h-28 border-2 border-primary/80 rounded-lg" />
                    </div>
                    <p className="absolute bottom-2 left-0 right-0 text-center text-xs text-white/80 bg-black/30 py-1">
                      {f.barcodeScanHint}
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg text-sm text-muted-foreground">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {f.barcodeErrorCamera}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="manual" className="mt-3">
                <div className="flex gap-2">
                  <Input
                    inputMode="numeric"
                    placeholder={f.barcodeInputPlaceholder}
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value.replace(/\D/g, ""))}
                    onKeyDown={(e) => e.key === "Enter" && handleLookup(manualCode)}
                    className="flex-1"
                  />
                  <Button
                    onClick={() => handleLookup(manualCode)}
                    disabled={!manualCode.trim()}
                  >
                    {f.barcodeLookupBtn}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {f.barcodeInput}: EAN-8, EAN-13, UPC-A
                </p>
              </TabsContent>
            </Tabs>
          )}

          {showReviewForm && (
            <div className="space-y-4">
              {lookupState === "found" ? (
                <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg text-sm">
                  <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-primary font-medium">{f.barcodeFound}</span>
                </div>
              ) : (
                <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{f.barcodeNotFound}</span>
                </div>
              )}

              <p className="text-xs text-muted-foreground">{f.barcodeEditHint}</p>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <FormField
                    label={f.name}
                    value={form.name}
                    onChange={(v) => setField("name", v)}
                    placeholder={f.namePlaceholder}
                  />
                </div>
                <FormField
                  label={f.servingSize}
                  value={form.servingSize}
                  onChange={(v) => setField("servingSize", v)}
                  placeholder={f.servingPlaceholder}
                />
                <FormField
                  label={f.calories}
                  value={form.calories}
                  onChange={(v) => setField("calories", v)}
                  type="number"
                />
                <FormField
                  label={f.protein}
                  value={form.protein}
                  onChange={(v) => setField("protein", v)}
                  type="number"
                />
                <FormField
                  label={f.carbs}
                  value={form.carbs}
                  onChange={(v) => setField("carbs", v)}
                  type="number"
                />
                <FormField
                  label={f.fat}
                  value={form.fat}
                  onChange={(v) => setField("fat", v)}
                  type="number"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={resetState}
                >
                  ← {f.barcodeScanTab}
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleAdd}
                  disabled={!form.name || createFood.isPending}
                >
                  {createFood.isPending ? f.barcodeAdding : f.barcodeAddToLibrary}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
