import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/proxy/")({
  beforeLoad: () => {
    throw redirect({ to: "/proxy/dashboard" });
  },
});
