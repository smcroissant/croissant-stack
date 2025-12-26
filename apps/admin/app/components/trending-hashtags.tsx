"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@repo/ui/components/card";
import { TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";

interface Hashtag {
  id: string;
  name: string;
  postCount: number;
}

interface TrendingHashtagsProps {
  hashtags: Hashtag[];
}

export function TrendingHashtags({ hashtags }: TrendingHashtagsProps) {
  const router = useRouter();

  const handleHashtagClick = (hashtag: string) => {
    router.push(`/explore?hashtag=${encodeURIComponent(hashtag)}`);
  };

  if (hashtags.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Trending Hashtags
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {hashtags.map((hashtag, index) => (
            <button
              key={hashtag.id}
              onClick={() => handleHashtagClick(hashtag.name)}
              className="w-full text-left px-4 py-3 hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm text-muted-foreground">
                      #{index + 1}
                    </span>
                    <span className="font-semibold text-base">
                      #{hashtag.name}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {hashtag.postCount.toLocaleString()}{" "}
                    {hashtag.postCount === 1 ? "post" : "posts"}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
