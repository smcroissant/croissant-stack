import { planetsRouter } from "./routers/planets";
import { feedRouter } from "./routers/feed";
import { exploreRouter } from "./routers/explore";
import { notificationsRouter } from "./routers/notifications";

export const router = {
  planets: planetsRouter,
  feed: feedRouter,
  explore: exploreRouter,
  notifications: notificationsRouter,
};
