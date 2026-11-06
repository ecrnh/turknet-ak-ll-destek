import { MessageSquareHeart } from "lucide-react";
import { TabHeader } from "@/components/layout/headers";
import { ActionRow, CampaignCard, ListCard, ListRow } from "@/components/tn/cards";
import { FeedbackButton } from "@/components/tn/FeedbackButton";
import { IconBox, SectionTitle } from "@/components/tn/primitives";
import { INTERNET_OPS, OPS_LIST, SUBSCRIPTION_OPS } from "@/data/mock";

export function OperationsScreen() {
  return (
    <div>
      <TabHeader title="İşlemler" />
      <div className="px-4">
        <CampaignCard className="mt-4" />

        <ListCard className="mt-5">
          <ListRow title="Yardım & Destek" to="/yardim" desc="Bağlantı, fatura, abonelik, dijital destek ve daha fazlası." icon={<IconBox icon={MessageSquareHeart} />} />
        </ListCard>

        <SectionTitle>Abonelik İşlemlerim</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          {SUBSCRIPTION_OPS.map((o) => (
            <ActionRow key={o.slug} item={o} />
          ))}
        </div>

        <SectionTitle>İnternet İşlemlerim</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          {INTERNET_OPS.map((o) => (
            <ActionRow key={o.slug} item={o} />
          ))}
        </div>

        <ListCard className="mt-8">
          {OPS_LIST.map((o) => (
            <ListRow key={o.title} title={o.title} to={o.to} />
          ))}
        </ListCard>

        <FeedbackButton />
      </div>
    </div>
  );
}

