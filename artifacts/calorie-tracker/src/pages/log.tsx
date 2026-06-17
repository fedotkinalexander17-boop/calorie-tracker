import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useT } from "@/lib/i18n";
import { Plus, Trash2, Search } from "lucide-react";

interface Food {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  serving_size: string;
  default_servings: number;
}

interface MealFood {
  food_id: string;
  food_name: string;
  servings: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface Meal {
  id?: string;
  meal_type: string;
  foods: MealFood[];
  date: string;
}

const MEAL_TYPES = [
  { value: "breakfast", label: "Завтрак", icon: "🍳" },
  { value: "lunch", label: "Обед", icon: "🍱" },
  { value: "dinner", label: "Ужин", icon: "🍽️" },
  { value: "snack", label: "Перекус", icon: "🍎" },
];

function getToday() {
  return new Date().toISOString().split("T")[0];
}

export default function Log() {
  const { t } = useT();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [activeTab, setActiveTab] = useState(MEAL_TYPES[0].value);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFoods, setSelectedFoods] = useState<MealFood[]>([]);

  console.log("🔄 Log component rendering, searchQuery:", searchQuery);

  // Получение списка продуктов
  const { data: foods, isLoading: foodsLoading, error: foodsError } = useQuery({
    queryKey: ["foods", searchQuery],
    queryFn: async () => {
      console.log("🔍 Fetching foods with search:", searchQuery);
      const url = `https://calorie-tracker-3-2j7n.onrender.com/api/foods?search=${encodeURIComponent(searchQuery)}`;
      console.log("📡 Request URL:", url);
      
      const res = await fetch(url, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      console.log("📊 Response status:", res.status);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error("❌ Error response:", errorText);
        throw new Error(`Failed to fetch foods: ${res.status}`);
      }
      
      const data = await res.json();
      console.log("✅ Foods data:", data);
      console.log("📦 Type of data:", typeof data);
      console.log("📦 Is array?", Array.isArray(data));
      console.log("📦 Data length:", data?.length);
      
      // Гарантируем, что возвращаем массив
      return Array.isArray(data) ? data : [];
    },
    enabled: searchQuery.length > 1,
  });

  // Логируем результат useQuery
  console.log("📊 useQuery result:", { 
    foods, 
    isLoading: foodsLoading, 
    error: foodsError, 
    searchQuery 
  });

  // Добавляем лог для отслеживания изменения foods
  useEffect(() => {
    console.log("📦 foods state updated:", foods);
    console.log("📦 foods is array?", Array.isArray(foods));
    console.log("📦 foods length:", foods?.length);
  }, [foods]);

  // Временный тестовый запрос
  useEffect(() => {
    const testFetch = async () => {
      try {
        const res = await fetch('https://calorie-tracker-3-2j7n.onrender.com/api/foods?search=яб', {
          credentials: "include",
        });
        const data = await res.json();
        console.log('🧪 TEST FETCH directly from browser:', data);
        console.log('🧪 Is array?', Array.isArray(data));
      } catch (err) {
        console.error('🧪 TEST FETCH error:', err);
      }
    };
    testFetch();
  }, []);

  // Получение существующего приёма пищи за день
  const { data: existingMeal, isLoading: mealLoading } = useQuery({
    queryKey: ["meal", selectedDate, activeTab],
    queryFn: async () => {
      console.log("🔍 Fetching meal for:", { date: selectedDate, mealType: activeTab });
      const res = await fetch(`https://calorie-tracker-3-2j7n.onrender.com/api/meals?date=${selectedDate}&mealType=${activeTab}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch meal");
      const data = await res.json();
      console.log("✅ Meal data:", data);
      if (data && data.foods) {
        setSelectedFoods(data.foods);
      }
      return data;
    },
    enabled: true,
  });

  // Мутация для сохранения приёма пищи
  const saveMealMutation = useMutation({
    mutationFn: async (meal: Meal) => {
      console.log("💾 Saving meal:", meal);
      const res = await fetch("https://calorie-tracker-3-2j7n.onrender.com/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(meal),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to save meal");
      const data = await res.json();
      console.log("✅ Meal saved:", data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meal", selectedDate, activeTab] });
      queryClient.invalidateQueries({ queryKey: ["dailySummary", selectedDate] });
      toast({ title: "Приём пищи сохранён", variant: "default" });
    },
    onError: (error) => {
      console.error("❌ Save meal error:", error);
      toast({ title: "Ошибка сохранения", variant: "destructive" });
    },
  });

  // Добавление продукта в список
  const addFoodToMeal = (food: Food) => {
    console.log("➕ Adding food to meal:", food);
    setSelectedFoods((prev) => {
      const existing = prev.find((f) => f.food_id === food.id);
      if (existing) {
        return prev.map((f) =>
          f.food_id === food.id
            ? { ...f, servings: f.servings + (food.default_servings || 1) }
            : f
        );
      }
      return [
        ...prev,
        {
          food_id: food.id,
          food_name: food.name,
          servings: food.default_servings || 1,
          calories: food.calories || 0,
          protein: food.protein || 0,
          carbs: food.carbs || 0,
          fat: food.fat || 0,
        },
      ];
    });
    setSearchQuery("");
  };

  // Удаление продукта из списка
  const removeFoodFromMeal = (foodId: string) => {
    console.log("🗑️ Removing food:", foodId);
    setSelectedFoods((prev) => prev.filter((f) => f.food_id !== foodId));
  };

  // Обновление порции
  const updateServings = (foodId: string, servings: number) => {
    console.log("🔄 Updating servings:", { foodId, servings });
    setSelectedFoods((prev) =>
      prev.map((f) =>
        f.food_id === foodId
          ? {
              ...f,
              servings,
              calories: (f.calories / (f.servings || 1)) * servings,
              protein: (f.protein / (f.servings || 1)) * servings,
              carbs: (f.carbs / (f.servings || 1)) * servings,
              fat: (f.fat / (f.servings || 1)) * servings,
            }
          : f
      )
    );
  };

  // Сохранение
  const handleSave = () => {
    if (selectedFoods.length === 0) {
      toast({ title: "Добавьте хотя бы один продукт", variant: "destructive" });
      return;
    }

    const meal: Meal = {
      meal_type: activeTab,
      foods: selectedFoods,
      date: selectedDate,
    };

    console.log("📤 Submitting meal:", meal);
    saveMealMutation.mutate(meal);
  };

  // Подсчёт итогов
  const totals = selectedFoods.reduce(
    (acc, food) => ({
      calories: acc.calories + food.calories,
      protein: acc.protein + food.protein,
      carbs: acc.carbs + food.carbs,
      fat: acc.fat + food.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  console.log("🖥️ Rendering with foods:", foods);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-serif font-semibold text-foreground">
          Ежедневный лог
        </h1>
        <p className="text-muted-foreground mt-1 text-sm md:text-base">
          Добавляйте продукты к каждому приёму пищи
        </p>
      </div>

      <div className="flex items-center gap-4">
        <Label>Дата:</Label>
        <Input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-auto"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          {MEAL_TYPES.map((type) => (
            <TabsTrigger key={type.value} value={type.value}>
              {type.icon} {type.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {MEAL_TYPES.map((type) => (
          <TabsContent key={type.value} value={type.value} className="space-y-4">
            {/* Поиск продуктов */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Добавить продукты</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Поиск продуктов..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      console.log("🔍 Search query changed:", e.target.value);
                    }}
                    className="pl-9"
                  />
                </div>
                {foodsLoading && <p className="text-sm text-muted-foreground mt-2">Поиск...</p>}
                {Array.isArray(foods) && foods.length > 0 && (
                  <div className="mt-3 space-y-1 max-h-60 overflow-y-auto">
                    {foods.map((food) => (
                      <div
                        key={food.id}
                        className="flex items-center justify-between p-2 hover:bg-muted rounded-lg cursor-pointer"
                        onClick={() => addFoodToMeal(food)}
                      >
                        <div>
                          <p className="font-medium text-sm">{food.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {food.calories || 0} ккал | Б: {food.protein || 0}г | Ж: {food.fat || 0}г | У: {food.carbs || 0}г
                          </p>
                        </div>
                        <Button size="sm" variant="ghost">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                {Array.isArray(foods) && foods.length === 0 && searchQuery.length > 1 && (
                  <p className="text-sm text-muted-foreground mt-2">Ничего не найдено</p>
                )}
              </CardContent>
            </Card>

            {/* Список выбранных продуктов */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Продукты</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedFoods.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Нет добавленных продуктов
                  </p>
                ) : (
                  <>
                    {selectedFoods.map((food) => (
                      <div key={food.food_id} className="flex items-center justify-between p-2 bg-muted/40 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{food.food_name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Label className="text-xs">Порций:</Label>
                            <Input
                              type="number"
                              step="0.5"
                              min="0.5"
                              value={food.servings}
                              onChange={(e) => updateServings(food.food_id, parseFloat(e.target.value))}
                              className="w-20 h-8 text-sm"
                            />
                          </div>
                        </div>
                        <div className="text-right mr-4">
                          <p className="text-sm font-semibold">{Math.round(food.calories || 0)} ккал</p>
                          <p className="text-xs text-muted-foreground">
                            Б: {Math.round(food.protein || 0)}г Ж: {Math.round(food.fat || 0)}г У: {Math.round(food.carbs || 0)}г
                          </p>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => removeFoodFromMeal(food.food_id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    ))}

                    {/* Итоги */}
                    <div className="border-t pt-3 mt-3">
                      <div className="flex justify-between items-center">
                        <p className="font-semibold">Итого:</p>
                        <div className="text-right">
                          <p className="font-bold text-lg">{Math.round(totals.calories || 0)} ккал</p>
                          <p className="text-xs text-muted-foreground">
                            Б: {Math.round(totals.protein || 0)}г | Ж: {Math.round(totals.fat || 0)}г | У: {Math.round(totals.carbs || 0)}г
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <Button onClick={handleSave} disabled={saveMealMutation.isPending} className="w-full mt-4">
                  {saveMealMutation.isPending ? "Сохранение..." : "Сохранить"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}