import { useQuery } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

const API_URL = import.meta.env.VITE_API_URL || 'https://calorie-tracker-3-2j7n.onrender.com';

export function useGetDailySummary({ date }: { date: string }) {
  return useQuery({
    queryKey: ["dailySummary", date],
    queryFn: async () => {
      const res = await customFetch(`${API_URL}/api/daily-summary?date=${date}`);
      return res;
    },
  });
}

export function useGetWeeklyStats({ date }: { date: string }) {
  return useQuery({
    queryKey: ["weeklyStats", date],
    queryFn: async () => {
      const res = await customFetch(`${API_URL}/api/weekly-stats?date=${date}`);
      return res;
    },
  });
}

export function useGetRecentMeals({ limit }: { limit: number }) {
  return useQuery({
    queryKey: ["recentMeals", limit],
    queryFn: async () => {
      const res = await customFetch(`${API_URL}/api/recent-meals?limit=${limit}`);
      return res;
    },
  });
}

export function useGetMealTypeBreakdown({ date }: { date: string }) {
  return useQuery({
    queryKey: ["mealBreakdown", date],
    queryFn: async () => {
      const res = await customFetch(`${API_URL}/api/meal-breakdown?date=${date}`);
      return res;
    },
  });
}