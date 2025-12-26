"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@repo/ui/components/dialog";
import { Button } from "@repo/ui/components/button";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";

interface AuthRequiredDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthRequiredDialog({
  open,
  onOpenChange,
}: AuthRequiredDialogProps) {
  const router = useRouter();

  const handleLogin = () => {
    onOpenChange(false);
    router.push("/login");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Sign in required</DialogTitle>
          <DialogDescription>
            You need to be signed in to post tweets, like, retweet, or interact
            with content.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleLogin}>
            <LogIn className="w-4 h-4 mr-2" />
            Sign in
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
