import { createFileRoute } from "@tanstack/react-router";
import { useAtomValue } from "jotai";
import { languageAtom } from "@/domain/i18n/store";
import { en } from "./en";
import { ko } from "./ko";

export const Route = createFileRoute("/about/")({
  component: About,
});

function About() {
  const lang = useAtomValue(languageAtom);
  const t = lang === "ko" ? ko : en;

  return <div className="p-2">{t.hello}</div>;
}
