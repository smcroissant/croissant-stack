import { planetsRouter } from "./routers/planets";
import { tweetsRouter } from "./routers/tweets";
import { likesRouter } from "./routers/likes";
import { retweetsRouter } from "./routers/retweets";
import { followsRouter } from "./routers/follows";

export const router = {
  planets: planetsRouter,
  tweets: tweetsRouter,
  likes: likesRouter,
  retweets: retweetsRouter,
  follows: followsRouter,
}
