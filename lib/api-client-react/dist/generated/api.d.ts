import type { QueryKey, UseMutationOptions, UseMutationResult, UseQueryOptions, UseQueryResult } from "@tanstack/react-query";
import type { CreateFoodBody, CreateMealBody, DailySummary, DayStats, Food, GetDailySummaryParams, GetMealTypeBreakdownParams, GetRecentMealsParams, GetWeeklyStatsParams, Goal, HealthStatus, ListFoodsParams, ListMealsParams, Meal, MealTypeBreakdown, SetGoalBody, UpdateFoodBody, UpdateMealBody } from "./api.schemas";
import { customFetch } from "../custom-fetch";
import type { ErrorType, BodyType } from "../custom-fetch";
type AwaitedInput<T> = PromiseLike<T> | T;
type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;
type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];
/**
 * Returns server health status
 * @summary Health check
 */
export declare const getHealthCheckUrl: () => string;
export declare const healthCheck: (options?: RequestInit) => Promise<HealthStatus>;
export declare const getHealthCheckQueryKey: () => readonly ["/api/healthz"];
export declare const getHealthCheckQueryOptions: <TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData> & {
    queryKey: QueryKey;
};
export type HealthCheckQueryResult = NonNullable<Awaited<ReturnType<typeof healthCheck>>>;
export type HealthCheckQueryError = ErrorType<unknown>;
/**
 * @summary Health check
 */
export declare function useHealthCheck<TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary List all food items
 */
export declare const getListFoodsUrl: (params?: ListFoodsParams) => string;
export declare const listFoods: (params?: ListFoodsParams, options?: RequestInit) => Promise<Food[]>;
export declare const getListFoodsQueryKey: (params?: ListFoodsParams) => readonly ["/api/foods", ...ListFoodsParams[]];
export declare const getListFoodsQueryOptions: <TData = Awaited<ReturnType<typeof listFoods>>, TError = ErrorType<unknown>>(params?: ListFoodsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listFoods>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listFoods>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListFoodsQueryResult = NonNullable<Awaited<ReturnType<typeof listFoods>>>;
export type ListFoodsQueryError = ErrorType<unknown>;
/**
 * @summary List all food items
 */
export declare function useListFoods<TData = Awaited<ReturnType<typeof listFoods>>, TError = ErrorType<unknown>>(params?: ListFoodsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listFoods>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Create a new food item
 */
export declare const getCreateFoodUrl: () => string;
export declare const createFood: (createFoodBody: CreateFoodBody, options?: RequestInit) => Promise<Food>;
export declare const getCreateFoodMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createFood>>, TError, {
        data: BodyType<CreateFoodBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createFood>>, TError, {
    data: BodyType<CreateFoodBody>;
}, TContext>;
export type CreateFoodMutationResult = NonNullable<Awaited<ReturnType<typeof createFood>>>;
export type CreateFoodMutationBody = BodyType<CreateFoodBody>;
export type CreateFoodMutationError = ErrorType<unknown>;
/**
 * @summary Create a new food item
 */
export declare const useCreateFood: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createFood>>, TError, {
        data: BodyType<CreateFoodBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createFood>>, TError, {
    data: BodyType<CreateFoodBody>;
}, TContext>;
/**
 * @summary Get a food item by ID
 */
export declare const getGetFoodUrl: (id: number) => string;
export declare const getFood: (id: number, options?: RequestInit) => Promise<Food>;
export declare const getGetFoodQueryKey: (id: number) => readonly [`/api/foods/${number}`];
export declare const getGetFoodQueryOptions: <TData = Awaited<ReturnType<typeof getFood>>, TError = ErrorType<void>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getFood>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getFood>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetFoodQueryResult = NonNullable<Awaited<ReturnType<typeof getFood>>>;
export type GetFoodQueryError = ErrorType<void>;
/**
 * @summary Get a food item by ID
 */
export declare function useGetFood<TData = Awaited<ReturnType<typeof getFood>>, TError = ErrorType<void>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getFood>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Update a food item
 */
export declare const getUpdateFoodUrl: (id: number) => string;
export declare const updateFood: (id: number, updateFoodBody: UpdateFoodBody, options?: RequestInit) => Promise<Food>;
export declare const getUpdateFoodMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateFood>>, TError, {
        id: number;
        data: BodyType<UpdateFoodBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateFood>>, TError, {
    id: number;
    data: BodyType<UpdateFoodBody>;
}, TContext>;
export type UpdateFoodMutationResult = NonNullable<Awaited<ReturnType<typeof updateFood>>>;
export type UpdateFoodMutationBody = BodyType<UpdateFoodBody>;
export type UpdateFoodMutationError = ErrorType<void>;
/**
 * @summary Update a food item
 */
export declare const useUpdateFood: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateFood>>, TError, {
        id: number;
        data: BodyType<UpdateFoodBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateFood>>, TError, {
    id: number;
    data: BodyType<UpdateFoodBody>;
}, TContext>;
/**
 * @summary Delete a food item
 */
export declare const getDeleteFoodUrl: (id: number) => string;
export declare const deleteFood: (id: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteFoodMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteFood>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteFood>>, TError, {
    id: number;
}, TContext>;
export type DeleteFoodMutationResult = NonNullable<Awaited<ReturnType<typeof deleteFood>>>;
export type DeleteFoodMutationError = ErrorType<void>;
/**
 * @summary Delete a food item
 */
export declare const useDeleteFood: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteFood>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteFood>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary List meal entries for a date
 */
export declare const getListMealsUrl: (params: ListMealsParams) => string;
export declare const listMeals: (params: ListMealsParams, options?: RequestInit) => Promise<Meal[]>;
export declare const getListMealsQueryKey: (params?: ListMealsParams) => readonly ["/api/meals", ...ListMealsParams[]];
export declare const getListMealsQueryOptions: <TData = Awaited<ReturnType<typeof listMeals>>, TError = ErrorType<unknown>>(params: ListMealsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listMeals>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listMeals>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListMealsQueryResult = NonNullable<Awaited<ReturnType<typeof listMeals>>>;
export type ListMealsQueryError = ErrorType<unknown>;
/**
 * @summary List meal entries for a date
 */
export declare function useListMeals<TData = Awaited<ReturnType<typeof listMeals>>, TError = ErrorType<unknown>>(params: ListMealsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listMeals>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Add a meal entry
 */
export declare const getCreateMealUrl: () => string;
export declare const createMeal: (createMealBody: CreateMealBody, options?: RequestInit) => Promise<Meal>;
export declare const getCreateMealMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createMeal>>, TError, {
        data: BodyType<CreateMealBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createMeal>>, TError, {
    data: BodyType<CreateMealBody>;
}, TContext>;
export type CreateMealMutationResult = NonNullable<Awaited<ReturnType<typeof createMeal>>>;
export type CreateMealMutationBody = BodyType<CreateMealBody>;
export type CreateMealMutationError = ErrorType<unknown>;
/**
 * @summary Add a meal entry
 */
export declare const useCreateMeal: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createMeal>>, TError, {
        data: BodyType<CreateMealBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createMeal>>, TError, {
    data: BodyType<CreateMealBody>;
}, TContext>;
/**
 * @summary Get a meal entry by ID
 */
export declare const getGetMealUrl: (id: number) => string;
export declare const getMeal: (id: number, options?: RequestInit) => Promise<Meal>;
export declare const getGetMealQueryKey: (id: number) => readonly [`/api/meals/${number}`];
export declare const getGetMealQueryOptions: <TData = Awaited<ReturnType<typeof getMeal>>, TError = ErrorType<void>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMeal>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getMeal>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetMealQueryResult = NonNullable<Awaited<ReturnType<typeof getMeal>>>;
export type GetMealQueryError = ErrorType<void>;
/**
 * @summary Get a meal entry by ID
 */
export declare function useGetMeal<TData = Awaited<ReturnType<typeof getMeal>>, TError = ErrorType<void>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMeal>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Update a meal entry
 */
export declare const getUpdateMealUrl: (id: number) => string;
export declare const updateMeal: (id: number, updateMealBody: UpdateMealBody, options?: RequestInit) => Promise<Meal>;
export declare const getUpdateMealMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateMeal>>, TError, {
        id: number;
        data: BodyType<UpdateMealBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateMeal>>, TError, {
    id: number;
    data: BodyType<UpdateMealBody>;
}, TContext>;
export type UpdateMealMutationResult = NonNullable<Awaited<ReturnType<typeof updateMeal>>>;
export type UpdateMealMutationBody = BodyType<UpdateMealBody>;
export type UpdateMealMutationError = ErrorType<void>;
/**
 * @summary Update a meal entry
 */
export declare const useUpdateMeal: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateMeal>>, TError, {
        id: number;
        data: BodyType<UpdateMealBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateMeal>>, TError, {
    id: number;
    data: BodyType<UpdateMealBody>;
}, TContext>;
/**
 * @summary Delete a meal entry
 */
export declare const getDeleteMealUrl: (id: number) => string;
export declare const deleteMeal: (id: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteMealMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteMeal>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteMeal>>, TError, {
    id: number;
}, TContext>;
export type DeleteMealMutationResult = NonNullable<Awaited<ReturnType<typeof deleteMeal>>>;
export type DeleteMealMutationError = ErrorType<void>;
/**
 * @summary Delete a meal entry
 */
export declare const useDeleteMeal: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteMeal>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteMeal>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary Get the current calorie goal
 */
export declare const getGetGoalUrl: () => string;
export declare const getGoal: (options?: RequestInit) => Promise<Goal>;
export declare const getGetGoalQueryKey: () => readonly ["/api/goals"];
export declare const getGetGoalQueryOptions: <TData = Awaited<ReturnType<typeof getGoal>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getGoal>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getGoal>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetGoalQueryResult = NonNullable<Awaited<ReturnType<typeof getGoal>>>;
export type GetGoalQueryError = ErrorType<unknown>;
/**
 * @summary Get the current calorie goal
 */
export declare function useGetGoal<TData = Awaited<ReturnType<typeof getGoal>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getGoal>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Set or update calorie goal
 */
export declare const getSetGoalUrl: () => string;
export declare const setGoal: (setGoalBody: SetGoalBody, options?: RequestInit) => Promise<Goal>;
export declare const getSetGoalMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof setGoal>>, TError, {
        data: BodyType<SetGoalBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof setGoal>>, TError, {
    data: BodyType<SetGoalBody>;
}, TContext>;
export type SetGoalMutationResult = NonNullable<Awaited<ReturnType<typeof setGoal>>>;
export type SetGoalMutationBody = BodyType<SetGoalBody>;
export type SetGoalMutationError = ErrorType<unknown>;
/**
 * @summary Set or update calorie goal
 */
export declare const useSetGoal: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof setGoal>>, TError, {
        data: BodyType<SetGoalBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof setGoal>>, TError, {
    data: BodyType<SetGoalBody>;
}, TContext>;
/**
 * @summary Get daily nutrition summary
 */
export declare const getGetDailySummaryUrl: (params: GetDailySummaryParams) => string;
export declare const getDailySummary: (params: GetDailySummaryParams, options?: RequestInit) => Promise<DailySummary>;
export declare const getGetDailySummaryQueryKey: (params?: GetDailySummaryParams) => readonly ["/api/dashboard/daily-summary", ...GetDailySummaryParams[]];
export declare const getGetDailySummaryQueryOptions: <TData = Awaited<ReturnType<typeof getDailySummary>>, TError = ErrorType<unknown>>(params: GetDailySummaryParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDailySummary>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getDailySummary>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetDailySummaryQueryResult = NonNullable<Awaited<ReturnType<typeof getDailySummary>>>;
export type GetDailySummaryQueryError = ErrorType<unknown>;
/**
 * @summary Get daily nutrition summary
 */
export declare function useGetDailySummary<TData = Awaited<ReturnType<typeof getDailySummary>>, TError = ErrorType<unknown>>(params: GetDailySummaryParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDailySummary>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get weekly calorie stats
 */
export declare const getGetWeeklyStatsUrl: (params: GetWeeklyStatsParams) => string;
export declare const getWeeklyStats: (params: GetWeeklyStatsParams, options?: RequestInit) => Promise<DayStats[]>;
export declare const getGetWeeklyStatsQueryKey: (params?: GetWeeklyStatsParams) => readonly ["/api/dashboard/weekly-stats", ...GetWeeklyStatsParams[]];
export declare const getGetWeeklyStatsQueryOptions: <TData = Awaited<ReturnType<typeof getWeeklyStats>>, TError = ErrorType<unknown>>(params: GetWeeklyStatsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getWeeklyStats>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getWeeklyStats>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetWeeklyStatsQueryResult = NonNullable<Awaited<ReturnType<typeof getWeeklyStats>>>;
export type GetWeeklyStatsQueryError = ErrorType<unknown>;
/**
 * @summary Get weekly calorie stats
 */
export declare function useGetWeeklyStats<TData = Awaited<ReturnType<typeof getWeeklyStats>>, TError = ErrorType<unknown>>(params: GetWeeklyStatsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getWeeklyStats>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get recent meal entries
 */
export declare const getGetRecentMealsUrl: (params?: GetRecentMealsParams) => string;
export declare const getRecentMeals: (params?: GetRecentMealsParams, options?: RequestInit) => Promise<Meal[]>;
export declare const getGetRecentMealsQueryKey: (params?: GetRecentMealsParams) => readonly ["/api/dashboard/recent-meals", ...GetRecentMealsParams[]];
export declare const getGetRecentMealsQueryOptions: <TData = Awaited<ReturnType<typeof getRecentMeals>>, TError = ErrorType<unknown>>(params?: GetRecentMealsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getRecentMeals>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getRecentMeals>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetRecentMealsQueryResult = NonNullable<Awaited<ReturnType<typeof getRecentMeals>>>;
export type GetRecentMealsQueryError = ErrorType<unknown>;
/**
 * @summary Get recent meal entries
 */
export declare function useGetRecentMeals<TData = Awaited<ReturnType<typeof getRecentMeals>>, TError = ErrorType<unknown>>(params?: GetRecentMealsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getRecentMeals>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get calorie breakdown by meal type for a date
 */
export declare const getGetMealTypeBreakdownUrl: (params: GetMealTypeBreakdownParams) => string;
export declare const getMealTypeBreakdown: (params: GetMealTypeBreakdownParams, options?: RequestInit) => Promise<MealTypeBreakdown[]>;
export declare const getGetMealTypeBreakdownQueryKey: (params?: GetMealTypeBreakdownParams) => readonly ["/api/dashboard/meal-type-breakdown", ...GetMealTypeBreakdownParams[]];
export declare const getGetMealTypeBreakdownQueryOptions: <TData = Awaited<ReturnType<typeof getMealTypeBreakdown>>, TError = ErrorType<unknown>>(params: GetMealTypeBreakdownParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMealTypeBreakdown>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getMealTypeBreakdown>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetMealTypeBreakdownQueryResult = NonNullable<Awaited<ReturnType<typeof getMealTypeBreakdown>>>;
export type GetMealTypeBreakdownQueryError = ErrorType<unknown>;
/**
 * @summary Get calorie breakdown by meal type for a date
 */
export declare function useGetMealTypeBreakdown<TData = Awaited<ReturnType<typeof getMealTypeBreakdown>>, TError = ErrorType<unknown>>(params: GetMealTypeBreakdownParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMealTypeBreakdown>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export {};
//# sourceMappingURL=api.d.ts.map