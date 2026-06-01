import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useGetDailySummary,
  useGetWeeklyStats,
  useGetRecentMeals,
  useGetMealTypeBreakdown,
} from "@workspace/api-client-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";
import { Flame, Drumstick, Wheat, Droplets, TrendingUp, Clock } from "lucide-react";
import { useT } from "@/lib/i18n";

function getToday() {
  return new Date().toISOString().split("T")[0];
}

const MEAL_TYPE_COLORS: Record<string, string> = {
  breakfast: "hsl(var(--chart-1))",
  lunch: "hsl(var(--chart-2))",
  dinner: "hsl(var(--chart-3))",
  snack: "hsl(var(--chart-4))",
};

export default function Dashboard() {
  const { t } = useT();
  const d = t.dashboard;
  const today = getToday();
  const { data: summary, isLoading: summaryLoading } = useGetDailySummary({ date: today });
  const { data: weeklyStats, isLoading: weeklyLoading } = useGetWeeklyStats({ date: today });
  const { data: recentMeals, isLoading: recentLoading } = useGetRecentMeals({ limit: 5 });
  const { data: breakdown, isLoading: breakdownLoading } = useGetMealTypeBreakdown({ date: today });

  const caloriePercent = summary ? Math.min((summary.totalCalories / summary.goalCalories) * 100, 100) : 0;
  const proteinPercent = summary ? Math.min((summary.totalProtein / summary.goalProtein) * 100, 100) : 0;
  const carbsPercent = summary ? Math.min((summary.totalCarbs / summary.goalCarbs) * 100, 100) : 0;
  const fatPercent = summary ? Math.min((summary.totalFat / summary.goalFat) * 100, 100) : 0;

  const mealTypeLabel = (type: string) =>
    d.mealTypes[type as keyof typeof d.mealTypes] ?? type;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-serif font-semibold text-foreground">{d.title}</h1>
        <p className="text-muted-foreground mt-1 text-sm md:text-base">{d.subtitle}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {summaryLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card className="border-l-4 border-l-primary">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-primary/10 p-2 rounded-lg">
                    <Flame className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{d.calories}</p>
                    <p className="text-2xl font-bold">{Math.round(summary?.totalCalories ?? 0)}</p>
                  </div>
                </div>
                <Progress value={caloriePercent} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">{d.ofGoal(summary?.goalCalories ?? 0)}</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-chart-1">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-chart-1/10 p-2 rounded-lg">
                    <Drumstick className="w-5 h-5 text-chart-1" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{d.protein}</p>
                    <p className="text-2xl font-bold">{Math.round(summary?.totalProtein ?? 0)}{t.gram}</p>
                  </div>
                </div>
                <Progress value={proteinPercent} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">{d.ofGoalG(summary?.goalProtein ?? 0)}</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-chart-2">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-chart-2/10 p-2 rounded-lg">
                    <Wheat className="w-5 h-5 text-chart-2" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{d.carbs}</p>
                    <p className="text-2xl font-bold">{Math.round(summary?.totalCarbs ?? 0)}{t.gram}</p>
                  </div>
                </div>
                <Progress value={carbsPercent} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">{d.ofGoalG(summary?.goalCarbs ?? 0)}</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-chart-3">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-chart-3/10 p-2 rounded-lg">
                    <Droplets className="w-5 h-5 text-chart-3" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{d.fat}</p>
                    <p className="text-2xl font-bold">{Math.round(summary?.totalFat ?? 0)}{t.gram}</p>
                  </div>
                </div>
                <Progress value={fatPercent} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">{d.ofGoalG(summary?.goalFat ?? 0)}</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              {d.weeklyCalories}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {weeklyLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : weeklyStats && weeklyStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={weeklyStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(val: string) => {
                      const dateStr = val.includes("T") ? val.split("T")[0] : val;
                      const date = new Date(dateStr + "T12:00:00");
                      return date.toLocaleDateString(d.weekdayFmt, { weekday: "short" });
                    }}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "13px",
                    }}
                    labelFormatter={(val: string) => {
                      const dateStr = val.includes("T") ? val.split("T")[0] : val;
                      const date = new Date(dateStr + "T12:00:00");
                      return date.toLocaleDateString(d.weekdayFmt, { weekday: "long", month: "long", day: "numeric" });
                    }}
                    formatter={(value: number) => [`${Math.round(value)} ${d.cal}`, d.calories]}
                  />
                  <Bar dataKey="totalCalories" name={d.calories} radius={[4, 4, 0, 0]}>
                    {weeklyStats.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={entry.totalCalories > entry.goalCalories ? "hsl(var(--destructive))" : "hsl(var(--primary))"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                {d.noWeeklyData}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{d.mealBreakdown}</CardTitle>
          </CardHeader>
          <CardContent>
            {breakdownLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : breakdown && breakdown.length > 0 ? (
              <div className="space-y-4">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={breakdown}
                      dataKey="totalCalories"
                      nameKey="mealType"
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={4}
                    >
                      {breakdown.map((entry, index) => (
                        <Cell key={index} fill={MEAL_TYPE_COLORS[entry.mealType] ?? "hsl(var(--chart-5))"} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "13px",
                      }}
                      formatter={(value: number, _name: string, props: { payload?: { mealType?: string } }) => [
                        `${Math.round(value)} ${d.cal}`,
                        mealTypeLabel(props.payload?.mealType ?? ""),
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {breakdown.map((item) => (
                    <div key={item.mealType} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ background: MEAL_TYPE_COLORS[item.mealType] ?? "hsl(var(--chart-5))" }}
                        />
                        <span>{mealTypeLabel(item.mealType)}</span>
                      </div>
                      <span className="font-medium">{Math.round(item.totalCalories)} {d.cal}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                {d.noMealsToday}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            {d.recentMeals}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : recentMeals && recentMeals.length > 0 ? (
            <div className="space-y-3">
              {recentMeals.map((meal) => (
                <div
                  key={meal.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/40"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-2 h-8 rounded-full"
                      style={{ background: MEAL_TYPE_COLORS[meal.mealType] ?? "hsl(var(--chart-5))" }}
                    />
                    <div>
                      <p className="font-medium text-sm">{meal.foodName}</p>
                      <p className="text-xs text-muted-foreground">
                        {mealTypeLabel(meal.mealType)} &middot; {d.serving(meal.servings)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm">{Math.round(meal.calories)} {d.cal}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.macroLine(Math.round(meal.protein), Math.round(meal.carbs), Math.round(meal.fat))}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              {d.noMealsYet}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
