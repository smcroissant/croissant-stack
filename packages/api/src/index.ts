import { planetsRouter } from "./routers/planets";
import { postsRouter } from "./routers/posts";
import { likesRouter } from "./routers/likes";
import { repostsRouter } from "./routers/reposts";
import { followsRouter } from "./routers/follows";
import { trendingRouter } from "./routers/trending";
import { notificationsRouter } from "./routers/notifications";

export const router = {
  planets: planetsRouter,
  posts: postsRouter,
  likes: likesRouter,
  reposts: repostsRouter,
  follows: followsRouter,
  trending: trendingRouter,
  notifications: notificationsRouter,
};
