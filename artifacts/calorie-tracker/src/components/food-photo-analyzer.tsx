import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useCreateFood, getListFoodsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, Upload, Loader2, CheckCircle, AlertCircle, Plus } from "lucide-react";
import { useT } from "@/lib/i18n";

type AnalysisResult = {
  foodName: string;
  servingSize: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: "high" | "medium" | "low";
  notes: string;
};

const CONFIDENCE_COLORS: Record<string, string> = {
  high: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  low: "bg-red-100 text-red-800",
};

export function FoodPhotoAnalyzer({ onFoodAdded }: { onFoodAdded?: () => void }) {
  const { t } = useT();
  const a = t.analyzer;
  const f = t.foods;

  const [open, setOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>("image/jpeg");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createFood = useCreateFood();

  const handleFileSelect = (file: File) => {
    setResult(null);
    setError(null);
    const mime = file.type || "image/jpeg";
    setMimeType(mime);
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setImagePreview(dataUrl);
      const base64 = dataUrl.split(",")[1];
      setImageBase64(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) handleFileSelect(file);
  };

  const handleAnalyze = async () => {
    if (!imageBase64) return;
    setAnalyzing(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze-food-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64, mimeType }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? a.invalidResult);
      }
      const data: AnalysisResult = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : a.invalidResult);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAddToLibrary = () => {
    if (!result) return;
    createFood.mutate(
      {
        data: {
          name: result.foodName,
          calories: result.calories,
          protein: result.protein,
          carbs: result.carbs,
          fat: result.fat,
          servingSize: result.servingSize,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListFoodsQueryKey() });
          toast({ title: a.toastAdded, description: a.toastAddedDesc(result.foodName) });
          setOpen(false);
          setImagePreview(null);
          setImageBase64(null);
          setResult(null);
          onFoodAdded?.();
        },
      },
    );
  };

  const reset = () => {
    setImagePreview(null);
    setImageBase64(null);
    setResult(null);
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" aria-label={f.analyzePhoto}>
          <Camera className="w-4 h-4 md:mr-2" />
          <span className="hidden md:inline">{f.analyzePhoto}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{a.dialogTitle}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!imagePreview ? (
            <div
              className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="font-medium text-sm">{a.dropHint}</p>
              <p className="text-xs text-muted-foreground mt-1">{a.dropSub}</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleInputChange}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative rounded-xl overflow-hidden">
                <img src={imagePreview} alt="Food to analyze" className="w-full max-h-64 object-cover" />
                <button
                  className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs hover:bg-black/80 transition-colors"
                  onClick={reset}
                >
                  ✕
                </button>
              </div>

              {!result && !analyzing && (
                <Button onClick={handleAnalyze} className="w-full">
                  <Camera className="w-4 h-4 mr-2" />
                  {a.analyzeBtn}
                </Button>
              )}

              {analyzing && (
                <div className="flex items-center justify-center gap-3 py-4 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">{a.analyzing}</span>
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg text-destructive text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {result && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">{result.foodName}</h3>
                    <Badge className={`text-xs ml-auto ${CONFIDENCE_COLORS[result.confidence]}`}>
                      {a.confidence[result.confidence]}
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground">{a.serving}: {result.servingSize}</p>

                  <div className="grid grid-cols-4 gap-2">
                    <div className="bg-primary/10 rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-primary">{Math.round(result.calories)}</p>
                      <p className="text-xs text-muted-foreground">{a.cal}</p>
                    </div>
                    <div className="bg-muted rounded-lg p-3 text-center">
                      <p className="text-lg font-bold">{Math.round(result.protein)}{t.gram}</p>
                      <p className="text-xs text-muted-foreground">{a.protein}</p>
                    </div>
                    <div className="bg-muted rounded-lg p-3 text-center">
                      <p className="text-lg font-bold">{Math.round(result.carbs)}{t.gram}</p>
                      <p className="text-xs text-muted-foreground">{a.carbs}</p>
                    </div>
                    <div className="bg-muted rounded-lg p-3 text-center">
                      <p className="text-lg font-bold">{Math.round(result.fat)}{t.gram}</p>
                      <p className="text-xs text-muted-foreground">{a.fat}</p>
                    </div>
                  </div>

                  {result.notes && (
                    <p className="text-xs text-muted-foreground italic bg-muted/50 rounded-lg p-2">
                      {result.notes}
                    </p>
                  )}

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={reset} className="flex-1">
                      {a.tryAgain}
                    </Button>
                    <Button onClick={handleAddToLibrary} disabled={createFood.isPending} className="flex-1">
                      <Plus className="w-4 h-4 mr-1" />
                      {createFood.isPending ? a.adding : a.addToLibrary}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
