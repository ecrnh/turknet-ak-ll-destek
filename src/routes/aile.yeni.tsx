import { createFileRoute } from "@tanstack/react-router";
import { NewDelegateScreen } from "@/features/family/screens/NewDelegateScreen";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/aile/yeni")({
  head: () => pageHead("Yeni Kişi Ekle", "Yetki kapsamı, süre, KVKK onayı ve SMS doğrulama ile yeni yetkili ekle."),
  component: NewDelegateScreen,
});
