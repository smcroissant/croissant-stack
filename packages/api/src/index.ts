import { planetsRouter } from "./routers/planets";
import { feedRouter } from "./routers/feed";

export const router = {
  planets: planetsRouter,
  feed: feedRouter,
};
