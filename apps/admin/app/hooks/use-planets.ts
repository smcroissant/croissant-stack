"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { orpc } from "../lib/orpc";

/**
 * Hook to fetch all planets
 */
export function usePlanets() {
  return useQuery(orpc.planets.list.queryOptions());
}

/**
 * Hook to fetch a single planet by ID
 */
export function usePlanet(id: string) {
  return useQuery({
    ...orpc.planets.find.queryOptions({ input: { id } }),
    enabled: !!id,
  });
}

/**
 * Hook to create a new planet
 */
export function useCreatePlanet() {
  const queryClient = useQueryClient();

  return useMutation({
    ...orpc.planets.create.mutationOptions(),
    onSuccess: () => {
      // Invalidate the planets list to refetch
      queryClient.invalidateQueries({ queryKey: orpc.planets.list.key() });
    },
  });
}

