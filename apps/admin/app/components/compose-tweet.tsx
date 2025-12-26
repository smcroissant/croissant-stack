"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@repo/ui/components/dialog";
import { Button } from "@repo/ui/components/button";
import { Textarea } from "@repo/ui/components/textarea";
import { Avatar } from "@repo/ui/components/avatar";

interface ComposeTweetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (content: string, parentTweetId?: string) => Promise<void>;
  parentTweetId?: string;
  parentTweetContent?: string;
  currentUserName?: string;
}

export function ComposeTweet({
  open,
  onOpenChange,
  onSubmit,
  parentTweetId,
  parentTweetContent,
  currentUserName = "You",
}: ComposeTweetProps) {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit(content, parentTweetId);
      setContent("");
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to post tweet:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const remainingChars = 280 - content.length;
  const isOverLimit = remainingChars < 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {parentTweetId ? "Reply to Tweet" : "Compose Tweet"}
          </DialogTitle>
        </DialogHeader>

        {parentTweetId && parentTweetContent && (
          <div className="bg-muted/50 p-3 rounded-lg mb-2 text-sm">
            <p className="text-muted-foreground line-clamp-3">
              {parentTweetContent}
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <Avatar className="w-10 h-10 flex-shrink-0">
            <div className="w-full h-full bg-primary/10 flex items-center justify-center text-sm font-medium">
              {currentUserName[0]?.toUpperCase() || "?"}
            </div>
          </Avatar>

          <div className="flex-1 space-y-3">
            <Textarea
              placeholder={
                parentTweetId
                  ? "Post your reply"
                  : "What's happening?"
              }
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[120px] resize-none text-base border-0 focus-visible:ring-0 p-0"
              autoFocus
            />

            <div className="flex items-center justify-between pt-2 border-t">
              <div
                className={`text-sm ${
                  isOverLimit ? "text-red-600 font-medium" : "text-muted-foreground"
                }`}
              >
                {remainingChars}
              </div>

              <Button
                onClick={handleSubmit}
                disabled={!content.trim() || isOverLimit || isSubmitting}
                size="sm"
              >
                {isSubmitting
                  ? "Posting..."
                  : parentTweetId
                  ? "Reply"
                  : "Post"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
