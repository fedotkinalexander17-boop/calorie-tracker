import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  useListFoods,
  useCreateFood,
  useUpdateFood,
  useDeleteFood,
  getListFoodsQueryKey,
} from "@workspace/api-client-react";
import type { Food } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Pencil, Trash2, Sheet, Download } from "lucide-react";
import { FoodPhotoAnalyzer } from "@/components/food-photo-analyzer";
import { ProGate } from "@/components/pro-gate";
import { BarcodeLookup } from "@/components/barcode-lookup";
import { useT } from "@/lib/i18n";
import type { Translations } from "@/lib/i18n";

type FoodFormData = {
  name: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  servingSize: string;
};

const emptyForm: FoodFormData = { name: "", calories: "", protein: "", carbs: "", fat: "", servingSize: "" };

function FoodForm({
  initial,
  onSubmit,
  loading,
  f,
}: {
  initial: FoodFormData;
  onSubmit: (data: FoodFormData) => void;
  loading: boolean;
  f: Translations["foods"];
}) {
  const [form, setForm] = useState<FoodFormData>(initial);
  const set = (key: keyof FoodFormData, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="name">{f.name}</Label>
        <Input id="name" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder={f.namePlaceholder} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="calories">{f.calories}</Label>
          <Input id="calories" type="number" value={form.calories} onChange={(e) => set("calories", e.target.value)} />
        </div>
        <div>
          <Label htmlFor="servingSize">{f.servingSize}</Label>
          <Input id="servingSize" value={form.servingSize} onChange={(e) => set("servingSize", e.target.value)} placeholder={f.servingPlaceholder} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label htmlFor="protein">{f.protein}</Label>
          <Input id="protein" type="number" value={form.protein} onChange={(e) => set("protein", e.target.value)} />
        </div>
        <div>
          <Label htmlFor="carbs">{f.carbs}</Label>
          <Input id="carbs" type="number" value={form.carbs} onChange={(e) => set("carbs", e.target.value)} />
        </div>
        <div>
          <Label htmlFor="fat">{f.fat}</Label>
          <Input id="fat" type="number" value={form.fat} onChange={(e) => set("fat", e.target.value)} />
        </div>
      </div>
      <Button onClick={() => onSubmit(form)} disabled={loading || !form.name} className="w-full">
        {loading ? f.saving : f.save}
      </Button>
    </div>
  );
}

export default function Foods() {
  const { t } = useT();
  const f = t.foods;
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editFood, setEditFood] = useState<Food | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: foods, isLoading } = useListFoods(search ? { search } : undefined);
  const createMutation = useCreateFood();
  const updateMutation = useUpdateFood();
  const deleteMutation = useDeleteFood();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListFoodsQueryKey() });

  const handleCreate = (form: FoodFormData) => {
    createMutation.mutate(
      {
        data: {
          name: form.name,
          calories: Number(form.calories),
          protein: Number(form.protein),
          carbs: Number(form.carbs),
          fat: Number(form.fat),
          servingSize: form.servingSize,
        },
      },
      {
        onSuccess: () => {
          invalidate();
          setDialogOpen(false);
          toast({ title: f.toastAdded, description: f.toastAddedDesc(form.name) });
        },
      },
    );
  };

  const handleUpdate = (form: FoodFormData) => {
    if (!editFood) return;
    updateMutation.mutate(
      {
        id: editFood.id,
        data: {
          name: form.name,
          calories: Number(form.calories),
          protein: Number(form.protein),
          carbs: Number(form.carbs),
          fat: Number(form.fat),
          servingSize: form.servingSize,
        },
      },
      {
        onSuccess: () => {
          invalidate();
          setEditFood(null);
          toast({ title: f.toastUpdated });
        },
      },
    );
  };

  const handleDelete = (food: Food) => {
    deleteMutation.mutate(
      { id: food.id },
      {
        onSuccess: () => {
          invalidate();
          toast({ title: f.toastDeleted, description: f.toastDeletedDesc(food.name) });
        },
      },
    );
  };

  const [exportingFoods, setExportingFoods] = useState(false);
  const handleExportFoods = async () => {
    setExportingFoods(true);
    try {
      const res = await fetch("/api/sheets/export-foods", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.open(data.url, "_blank");
      toast({ title: f.exportSuccess });
    } catch {
      toast({ title: f.exportFailed, variant: "destructive" });
    } finally {
      setExportingFoods(false);
    }
  };

  const [importOpen, setImportOpen] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);

  const handleImport = async () => {
    if (!importUrl.trim()) return;
    setImporting(true);
    try {
      const res = await fetch("/api/sheets/import-foods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spreadsheetUrl: importUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      invalidate();
      setImportOpen(false);
      setImportUrl("");
      toast({
        title: f.importSuccess(data.imported),
        description: data.skipped > 0 ? f.importSkipped(data.skipped) : undefined,
      });
    } catch (err) {
      toast({
        title: f.importFailed,
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3 md:space-y-0 md:flex md:items-center md:justify-between md:gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-serif font-semibold text-foreground">{f.title}</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">{f.subtitle}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="icon" className="md:hidden" onClick={handleExportFoods} disabled={exportingFoods} aria-label={f.exportSheets}>
            <Sheet className="w-4 h-4" />
          </Button>
          <Button variant="outline" className="hidden md:flex" onClick={handleExportFoods} disabled={exportingFoods}>
            <Sheet className="w-4 h-4 mr-2" />
            {exportingFoods ? f.exporting : f.exportSheets}
          </Button>
          <Dialog open={importOpen} onOpenChange={setImportOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" aria-label={f.importSheets}>
                <Download className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">{f.importSheets}</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{f.importDialogTitle}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>{f.importUrlLabel}</Label>
                  <Input
                    className="mt-1.5"
                    placeholder={f.importUrlPlaceholder}
                    value={importUrl}
                    onChange={(e) => setImportUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleImport()}
                  />
                  <p className="text-xs text-muted-foreground mt-2">{f.importHint}</p>
                </div>
                <Button onClick={handleImport} disabled={importing || !importUrl.trim()} className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  {importing ? f.importing : f.importBtn}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <BarcodeLookup />
          <ProGate>
            <FoodPhotoAnalyzer />
          </ProGate>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">{f.addFood}</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{f.addNewFood}</DialogTitle>
              </DialogHeader>
              <FoodForm initial={emptyForm} onSubmit={handleCreate} loading={createMutation.isPending} f={f} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-10"
          placeholder={f.searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : foods && foods.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {foods.map((food) => (
            <Card key={food.id} className="group hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base font-semibold">{food.name}</CardTitle>
                  <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setEditFood(food)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => handleDelete(food)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{food.servingSize}</p>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm">
                  <div className="text-center">
                    <p className="font-bold text-primary">{Math.round(food.calories)}</p>
                    <p className="text-xs text-muted-foreground">{f.cal}</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold">{food.protein}{t.gram}</p>
                    <p className="text-xs text-muted-foreground">{f.protein_abbr}</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold">{food.carbs}{t.gram}</p>
                    <p className="text-xs text-muted-foreground">{f.carbs_abbr}</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold">{food.fat}{t.gram}</p>
                    <p className="text-xs text-muted-foreground">{f.fat_abbr}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {search ? f.noResults(search) : f.emptyLibrary}
          </CardContent>
        </Card>
      )}

      <Dialog open={!!editFood} onOpenChange={(open) => !open && setEditFood(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{f.editFood}</DialogTitle>
          </DialogHeader>
          {editFood && (
            <FoodForm
              initial={{
                name: editFood.name,
                calories: String(editFood.calories),
                protein: String(editFood.protein),
                carbs: String(editFood.carbs),
                fat: String(editFood.fat),
                servingSize: editFood.servingSize,
              }}
              onSubmit={handleUpdate}
              loading={updateMutation.isPending}
              f={f}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
