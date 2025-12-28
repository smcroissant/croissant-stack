"use client";

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { orpc } from "../lib/orpc";

export interface Notification {
  id: string;
  type: "like" | "repost" | "reply" | "follow";
  actorId: string;
  actorName: string | null;
  actorEmail: string;
  actorImage: string | null;
  postId: string | null;
  postContent: string | null;
  isRead: boolean;
  createdAt: Date;
}

/**
 * Hook to fetch notifications with infinite scroll
 */
export function useNotifications(limit: number = 20) {
  return useInfiniteQuery({
    queryKey: ["notifications", limit],
    queryFn: async ({ pageParam }) => {
      const result = await orpc.notifications.getNotifications.call({
        limit,
        cursor: pageParam,
      });
      return result;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined as string | undefined,
  });
}

/**
 * Hook to get unread notifications count
 */
export function useUnreadNotificationsCount() {
  return useQuery({
    queryKey: ["notificationsUnreadCount"],
    queryFn: async () => {
      return orpc.notifications.getUnreadCount.call({});
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

/**
 * Hook to mark a single notification as read
 */
export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      return orpc.notifications.markAsRead.call({ notificationId });
    },
    onMutate: async (notificationId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["notifications"] });
      await queryClient.cancelQueries({ queryKey: ["notificationsUnreadCount"] });

      // Snapshot the previous values
      const previousNotifications = queryClient.getQueryData(["notifications", 20]);
      const previousCount = queryClient.getQueryData(["notificationsUnreadCount"]);

      // Optimistically update notifications
      queryClient.setQueryData(["notifications", 20], (old: any) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            notifications: page.notifications.map((notif: Notification) =>
              notif.id === notificationId ? { ...notif, isRead: true } : notif
            ),
          })),
        };
      });

      // Optimistically update count
      queryClient.setQueryData(["notificationsUnreadCount"], (old: any) => {
        if (old?.count && old.count > 0) {
          return { count: old.count - 1 };
        }
        return old;
      });

      return { previousNotifications, previousCount };
    },
    onError: (_err, _notificationId, context) => {
      // Rollback on error
      if (context?.previousNotifications) {
        queryClient.setQueryData(["notifications", 20], context.previousNotifications);
      }
      if (context?.previousCount) {
        queryClient.setQueryData(["notificationsUnreadCount"], context.previousCount);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notificationsUnreadCount"] });
    },
  });
}

/**
 * Hook to mark all notifications as read
 */
export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return orpc.notifications.markAllAsRead.call({});
    },
    onMutate: async () => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["notifications"] });
      await queryClient.cancelQueries({ queryKey: ["notificationsUnreadCount"] });

      // Snapshot the previous values
      const previousNotifications = queryClient.getQueryData(["notifications", 20]);
      const previousCount = queryClient.getQueryData(["notificationsUnreadCount"]);

      // Optimistically update all notifications as read
      queryClient.setQueryData(["notifications", 20], (old: any) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            notifications: page.notifications.map((notif: Notification) => ({
              ...notif,
              isRead: true,
            })),
          })),
        };
      });

      // Optimistically set count to 0
      queryClient.setQueryData(["notificationsUnreadCount"], { count: 0 });

      return { previousNotifications, previousCount };
    },
    onError: (_err, _vars, context) => {
      // Rollback on error
      if (context?.previousNotifications) {
        queryClient.setQueryData(["notifications", 20], context.previousNotifications);
      }
      if (context?.previousCount) {
        queryClient.setQueryData(["notificationsUnreadCount"], context.previousCount);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notificationsUnreadCount"] });
    },
  });
}

/**
 * Hook to delete a notification
 */
export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      return orpc.notifications.deleteNotification.call({ notificationId });
    },
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] });

      const previousNotifications = queryClient.getQueryData(["notifications", 20]);

      // Optimistically remove the notification
      queryClient.setQueryData(["notifications", 20], (old: any) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            notifications: page.notifications.filter(
              (notif: Notification) => notif.id !== notificationId
            ),
          })),
        };
      });

      return { previousNotifications };
    },
    onError: (_err, _notificationId, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(["notifications", 20], context.previousNotifications);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notificationsUnreadCount"] });
    },
  });
}

/**
 * Hook to clear all notifications
 */
export function useClearAllNotifications() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return orpc.notifications.clearAllNotifications.call({});
    },
    onSuccess: () => {
      queryClient.setQueryData(["notifications", 20], { pages: [{ notifications: [], nextCursor: undefined }], pageParams: [undefined] });
      queryClient.setQueryData(["notificationsUnreadCount"], { count: 0 });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notificationsUnreadCount"] });
    },
  });
}

