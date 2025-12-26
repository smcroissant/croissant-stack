import { planetsRouter } from "./routers/planets";
import { tweetsRouter } from "./routers/tweets";
import { likesRouter } from "./routers/likes";
import { retweetsRouter } from "./routers/retweets";
import { followsRouter } from "./routers/follows";
import { trendingRouter } from "./routers/trending";
import { notificationsRouter } from "./routers/notifications";

export const router = {
  planets: planetsRouter,
  tweets: tweetsRouter,
  likes: likesRouter,
  retweets: retweetsRouter,
  follows: followsRouter,
  trending: trendingRouter,
  notifications: notificationsRouter,
}
