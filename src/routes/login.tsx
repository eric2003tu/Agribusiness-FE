import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useWorkspace } from "@/lib/workspace-store";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — TaskFlow" },
      { name: "description", content: "Sign in to TaskFlow." },
      { property: "og:title", content: "Sign in — TaskFlow" },
    ],
  }),
  component: LoginRedirect,
});

function LoginRedirect() {
  const { session, ready } = useWorkspace();
  const navigate = useNavigate();

  useEffect(() => {
    if (ready) void navigate({ to: session ? "/dashboard" : "/", replace: true });
  }, [ready, session, navigate]);

  return null;
}
