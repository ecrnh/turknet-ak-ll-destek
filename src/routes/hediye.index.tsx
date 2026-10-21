import { createFileRoute } from "@tanstack/react-router";
import { GiftWalletScreen } from "@/features/giftData/screens/GiftWalletScreen";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/hediye/")({
  head: () => pageHead("Hediye İnternet Cüzdanım", "Kesinti telafisi hediye GB, ücretsiz sosyal medya ve aile paylaşımı."),
  component: GiftWalletScreen,
});
