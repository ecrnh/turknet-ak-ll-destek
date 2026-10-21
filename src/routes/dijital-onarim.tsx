import { createFileRoute } from "@tanstack/react-router";
import { DigitalRepairScreen } from "@/screens/DigitalRepairScreen";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/dijital-onarim")({
  head: () => pageHead("Dijital Onarım", "Hat değerlerini kontrol et ve bağlantını uzaktan onar."),
  component: DigitalRepairScreen,
});
