"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../providers/auth-provider";
import { Spinner } from "@repo/ui/components/spinner";

export default function MyProfilePage() {
  const router = useRouter();
  const { session, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && session) {
      router.replace(`/profile/${session.user.id}`);
    }
  }, [session, isLoading, router]);

  return (
    <div className="flex items-center justify-center p-12">
      <Spinner />
    </div>
  );
}
