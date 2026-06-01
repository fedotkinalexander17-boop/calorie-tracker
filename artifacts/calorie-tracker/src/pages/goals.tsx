import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useGetGoal, useSetGoal, getGetGoalQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Target, Save } from "lucide-react";
import { useT } from "@/lib/i18n";

export default function Goals() {
  const { t } = useT();
  const g = t.goals;
  const { data: goal, isLoading } = useGetGoal();
  const setGoalMutation = useSetGoal();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");

  useEffect(() => {
    if (goal) {
      setCalories(String(goal.dailyCalories));
      setProtein(String(goal.dailyProtein));
      setCarbs(String(goal.dailyCarbs));
      setFat(String(goal.dailyFat));
    }
  }, [goal]);

  const handleSave = () => {
    setGoalMutation.mutate(
      {
        data: {
          dailyCalories: Number(calories),
          dailyProtein: Number(protein),
          dailyCarbs: Number(carbs),
          dailyFat: Number(fat),
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetGoalQueryKey() });
          toast({ title: g.toastUpdated, description: g.toastUpdatedDesc });
        },
      },
    );
  };

  const estimatedCaloriesFromMacros = Number(protein) * 4 + Number(carbs) * 4 + Number(fat) * 9;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-serif font-semibold text-foreground">{g.title}</h1>
        <p className="text-muted-foreground mt-1 text-sm md:text-base">{g.subtitle}</p>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                {g.calorieTarget}
              </CardTitle>
              <CardDescription>{g.calorieTargetDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="calories">{g.caloriesLabel}</Label>
                  <Input
                    id="calories"
                    type="number"
                    value={calories}
                    onChange={(e) => setCalories(e.target.value)}
                    className="text-2xl font-bold h-14"
                  />
                </div>
                <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                  {g.estimatedFromMacros(Math.round(estimatedCaloriesFromMacros))}
                  {Math.abs(estimatedCaloriesFromMacros - Number(calories)) > 100 && (
                    <span className="text-amber-600 block mt-1">{g.macroMismatch}</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{g.macroTargets}</CardTitle>
              <CardDescription>{g.macroTargetsDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="protein">{g.protein}</Label>
                  <Input
                    id="protein"
                    type="number"
                    value={protein}
                    onChange={(e) => setProtein(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">{g.kcalFromProtein(Number(protein) * 4)}</p>
                </div>
                <div>
                  <Label htmlFor="carbs">{g.carbs}</Label>
                  <Input
                    id="carbs"
                    type="number"
                    value={carbs}
                    onChange={(e) => setCarbs(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">{g.kcalFromCarbs(Number(carbs) * 4)}</p>
                </div>
                <div>
                  <Label htmlFor="fat">{g.fat}</Label>
                  <Input
                    id="fat"
                    type="number"
                    value={fat}
                    onChange={(e) => setFat(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">{g.kcalFromFat(Number(fat) * 9)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="lg:col-span-2">
            <Button onClick={handleSave} disabled={setGoalMutation.isPending} size="lg" className="w-full">
              <Save className="w-4 h-4 mr-2" />
              {setGoalMutation.isPending ? g.saving : g.saveGoals}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
