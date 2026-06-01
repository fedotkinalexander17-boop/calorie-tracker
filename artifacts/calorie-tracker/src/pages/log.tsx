import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  useListMeals,
  useListFoods,
  useCreateMeal,
  useDeleteMeal,
  getListMealsQueryKey,
  getGetDailySummaryQueryKey,
  getGetRecentMealsQueryKey,
  getGetMealTypeBreakdownQueryKey,
  getGetWeeklyStatsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, ChevronLeft, ChevronRight, Sheet, X, Search } from "lucide-react";
import { useT } from "@/lib/i18n";
import { SheetSyncBar } from "@/components/sheet-sync-bar";
import { cn } from "@/lib/utils";

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;

function getToday() {
  return new Date().toISOString().split("T")[0];
}

type FoodItem = { id: number; name: string; calories: number; servingSize: string };

function FoodPicker({
  foods,
  selectedFood,
  onSelect,
  placeholder,
  searchPlaceholder,
  calLabel,
  noResultsFn,
}: {
  foods: FoodItem[] | undefined;
  selectedFood: string;
  onSelect: (id: string) => void;
  placeholder: string;
  searchPlaceholder: string;
  calLabel: string;
  noResultsFn: (q: string) => string;
}) {
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = foods?.find((f) => String(f.id) === selectedFood);
  const filtered = foods?.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  useEffect(() => {
    if (!selectedFood) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [selectedFood]);

  if (selected) {
    return (
      <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2.5">
        <span className="flex-1 text-sm font-medium truncate">{selected.name}</span>
        <span className="text-xs text-muted-foreground shrink-0">
          {Math.round(selected.calories)} {calLabel}
        </span>
        <button
          type="button"
          onClick={() => onSelect("")}
          className="shrink-0 rounded-full p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Clear selection"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        <Input
          ref={searchRef}
          className="pl-8 h-9 text-sm"
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoComplete="off"
        />
      </div>
      <div className="max-h-48 overflow-y-auto rounded-lg border bg-popover shadow-sm overscroll-contain">
        {filtered.length === 0 ? (
          <p className="px-3 py-4 text-center text-sm text-muted-foreground">
            {noResultsFn(search)}
          </p>
        ) : (
          filtered.map((food) => (
            <button
              key={food.id}
              type="button"
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 text-sm text-left",
                "hover:bg-accent active:bg-accent/80 transition-colors",
                "border-b border-border/50 last:border-0"
              )}
              onPointerDown={(e) => {
                e.preventDefault();
                onSelect(String(food.id));
                setSearch("");
              }}
            >
              <span className="truncate">{food.name}</span>
              <span className="ml-2 text-xs text-muted-foreground shrink-0">
                {Math.round(food.calories)} {calLabel}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

export default function Log() {
  const { t } = useT();
  const l = t.log;
  const mealTypeLabels = l.mealTypes;

  const [date, setDate] = useState(getToday());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedFood, setSelectedFood] = useState<string>("");
  const [selectedMealType, setSelectedMealType] = useState<string>("lunch");
  const [servings, setServings] = useState("1");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: meals, isLoading } = useListMeals({ date });
  const { data: foods } = useListFoods();
  const createMutation = useCreateMeal();
  const deleteMutation = useDeleteMeal();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: getListMealsQueryKey({ date }) });
    queryClient.invalidateQueries({ queryKey: getGetDailySummaryQueryKey({ date }) });
    queryClient.invalidateQueries({ queryKey: getGetRecentMealsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetMealTypeBreakdownQueryKey({ date }) });
    queryClient.invalidateQueries({ queryKey: getGetWeeklyStatsQueryKey({ date }) });
  };

  const handleAdd = () => {
    if (!selectedFood) return;
    createMutation.mutate(
      {
        data: {
          foodId: Number(selectedFood),
          mealType: selectedMealType as "breakfast" | "lunch" | "dinner" | "snack",
          servings: Number(servings),
          date,
        },
      },
      {
        onSuccess: () => {
          invalidateAll();
          setDialogOpen(false);
          setSelectedFood("");
          setServings("1");
          toast({ title: l.toastLogged });
        },
      },
    );
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => {
          invalidateAll();
          toast({ title: l.toastRemoved });
        },
      },
    );
  };

  const changeDate = (delta: number) => {
    const d = new Date(date + "T00:00:00");
    d.setDate(d.getDate() + delta);
    setDate(d.toISOString().split("T")[0]);
  };

  const [exportingLog, setExportingLog] = useState(false);
  const handleExportLog = async () => {
    setExportingLog(true);
    try {
      const res = await fetch("/api/sheets/export-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.open(data.url, "_blank");
      toast({ title: l.exportSuccess });
    } catch {
      toast({ title: l.exportFailed, variant: "destructive" });
    } finally {
      setExportingLog(false);
    }
  };

  const dateLabel = new Date(date + "T00:00:00").toLocaleDateString(l.dateFmt, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const groupedMeals = MEAL_TYPES.map((type) => ({
    type,
    label: mealTypeLabels[type],
    items: meals?.filter((m) => m.mealType === type) ?? [],
  }));

  const totalCalories = meals?.reduce((sum, m) => sum + m.calories, 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-serif font-semibold text-foreground">{l.title}</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">{l.subtitle}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" className="md:hidden" onClick={handleExportLog} disabled={exportingLog}>
            <Sheet className="w-4 h-4" />
          </Button>
          <Button variant="outline" className="hidden md:flex" onClick={handleExportLog} disabled={exportingLog}>
            <Sheet className="w-4 h-4 mr-2" />
            {exportingLog ? l.exporting : l.exportSheets}
          </Button>
          <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) {
                setSelectedFood("");
                setServings("1");
              }
            }}
          >
            <DialogTrigger asChild>
              <Button aria-label={l.addEntry}>
                <Plus className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">{l.addEntry}</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{l.logMeal}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label className="mb-1.5 block">{l.food}</Label>
                  <FoodPicker
                    foods={foods as FoodItem[] | undefined}
                    selectedFood={selectedFood}
                    onSelect={setSelectedFood}
                    placeholder={l.selectFood}
                    searchPlaceholder={t.foods.searchPlaceholder}
                    calLabel={t.foods.cal}
                    noResultsFn={t.foods.noResults}
                  />
                </div>
                <div>
                  <Label>{l.mealType}</Label>
                  <Select value={selectedMealType} onValueChange={setSelectedMealType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MEAL_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {mealTypeLabels[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{l.servings}</Label>
                  <Input
                    type="number"
                    min="0.25"
                    step="0.25"
                    value={servings}
                    onChange={(e) => setServings(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleAdd}
                  disabled={!selectedFood || createMutation.isPending}
                  className="w-full"
                >
                  {createMutation.isPending ? l.adding : l.addToLog}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex items-center justify-between bg-card rounded-xl p-4 border">
        <Button variant="ghost" size="icon" onClick={() => changeDate(-1)}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="text-center">
          <p className="font-semibold">{dateLabel}</p>
          <p className="text-sm text-muted-foreground">{l.calTotal(Math.round(totalCalories))}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => changeDate(1)} disabled={date >= getToday()}>
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      <SheetSyncBar date={date} />

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {groupedMeals.map(({ type, label, items }) => (
            <Card key={type}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>{label}</span>
                  <span className="text-sm font-normal text-muted-foreground">
                    {items.length > 0 ? `${Math.round(items.reduce((s, i) => s + i.calories, 0))} ${t.foods.cal}` : ""}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {items.length > 0 ? (
                  <div className="space-y-2">
                    {items.map((meal) => (
                      <div key={meal.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40 group">
                        <div className="min-w-0 flex-1 mr-2">
                          <p className="font-medium text-sm truncate">{meal.foodName}</p>
                          <p className="text-xs text-muted-foreground">
                            {l.serving(meal.servings)} &middot;{" "}
                            {t.macroLine(Math.round(meal.protein), Math.round(meal.carbs), Math.round(meal.fat))}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-semibold text-sm">{Math.round(meal.calories)} {t.foods.cal}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                            onClick={() => handleDelete(meal.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-3 text-center">
                    {l.noMealType(label)}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
