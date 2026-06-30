import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { routesApi, busApi, ticketApi, alertApi, feedbackApi, newsApi, adminApi } from '../services/api';
import { onBusLocationUpdate, onNewAlert } from '../services/socket';
import { subscribeToRoute, unsubscribeFromRoute } from '../services/socket';
import type { Bus, Alert, SocketBusUpdate } from '../types';

export function useRoutes(params?: { type?: string; tourist?: boolean }) {
  return useQuery({
    queryKey: ['routes', params],
    queryFn: () => routesApi.getAll(params).then((r) => r.data),
    staleTime: 5 * 60_000,
  });
}

export function useRoute(id: string) {
  return useQuery({
    queryKey: ['route', id],
    queryFn: () => routesApi.getById(id).then((r) => r.data),
    enabled: !!id,
  });
}

export function useStops() {
  return useQuery({
    queryKey: ['stops'],
    queryFn: () => routesApi.getStops().then((r) => r.data),
    staleTime: 60 * 60_000,
  });
}

export function useStopETA(stopId: string) {
  return useQuery({
    queryKey: ['stopETA', stopId],
    queryFn: () => routesApi.getStopETA(stopId).then((r) => r.data),
    enabled: !!stopId,
    refetchInterval: 30_000,
  });
}

export function useBuses() {
  const [buses, setBuses] = useState<Bus[]>([]);
  const { data, isLoading } = useQuery({
    queryKey: ['buses'],
    queryFn: () => busApi.getAll().then((r) => r.data),
    staleTime: 10_000,
  });

  useEffect(() => {
    if (data) setBuses(data);
  }, [data]);

  useEffect(() => {
    const cleanup = onBusLocationUpdate((update: SocketBusUpdate) => {
      setBuses((prev) =>
        prev.map((b) =>
          b.id === update.bus_id
            ? {
                ...b,
                latitude: update.latitude,
                longitude: update.longitude,
                ...(update.occupied_seats !== undefined && { occupied_seats: update.occupied_seats }),
                last_updated: update.last_updated,
              }
            : b
        )
      );
    });
    return () => { cleanup(); };
  }, []);

  return { buses, isLoading };
}

export function useBusStats() {
  return useQuery({
    queryKey: ['busStats'],
    queryFn: () => busApi.getStats().then((r) => r.data),
    refetchInterval: 30_000,
  });
}

export function useAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const { data } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => alertApi.getActive().then((r) => r.data),
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (data) setAlerts(data);
  }, [data]);

  useEffect(() => {
    const cleanup = onNewAlert((alert: Alert) => {
      setAlerts((prev) => [alert, ...prev]);
    });
    return () => { cleanup(); };
  }, []);

  return alerts;
}

export function useMyTickets(status?: string) {
  return useQuery({
    queryKey: ['tickets', status],
    queryFn: () => ticketApi.getMyTickets(status).then((r) => r.data),
  });
}

export function useBuyTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (route_id: string) => ticketApi.buy(route_id).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tickets'] });
      qc.invalidateQueries({ queryKey: ['me'] });
    },
  });
}

export function useTopUp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (amount: number) => ticketApi.topUp(amount).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me'] }),
  });
}

export function useWalletHistory() {
  return useQuery({
    queryKey: ['walletHistory'],
    queryFn: () => ticketApi.getWalletHistory().then((r) => r.data),
  });
}

export function useFeedback() {
  return useQuery({
    queryKey: ['feedback'],
    queryFn: () => feedbackApi.getAll().then((r) => r.data),
  });
}

export function useSubmitFeedback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { bus_id?: string; rating: number; comment?: string }) =>
      feedbackApi.submit(data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feedback'] }),
  });
}

export function useNews() {
  return useQuery({
    queryKey: ['news'],
    queryFn: () => newsApi.getAll().then((r) => r.data),
    staleTime: 10 * 60_000,
  });
}

export function useAnalytics() {
  return useQuery({
    queryKey: ['analytics'],
    queryFn: () => adminApi.getAnalytics().then((r) => r.data),
    refetchInterval: 60_000,
  });
}
