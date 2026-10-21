import { UserPlus } from "lucide-react";
import { TabHeader } from "@/components/layout/headers";
import { ActionRow, CampaignCard, ListCard, ListRow } from "@/components/tn/cards";
import { FeedbackButton } from "@/components/tn/FeedbackButton";
import { AppLink, IconBox, SectionTitle } from "@/components/tn/primitives";
import { INTERNET_OPS, OPS_LIST, SUBSCRIPTION_OPS, SUPPORT_OPS } from "@/data/mock";

export function OperationsScreen() {
  return (
    <div>
      <TabHeader title="İşlemler" />
      <div className="px-4">
        <CampaignCard className="mt-2" />

        <SectionTitle>Destek İşlemlerim</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          {SUPPORT_OPS.map((o) => (
            <ActionRow key={o.slug} item={o} />
          ))}
        </div>

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

        <AppLink to="/islem/yeni-abonelik" className="mt-5 block rounded-card bg-card p-5 shadow-card">
          <div className="flex items-center gap-3">
            <IconBox icon={UserPlus} />
            <span className="text-xl font-semibold text-primary">Yeni Abonelik</span>
          </div>
          <p className="mt-3 text-sm text-foreground">Abonelik işlemlerini buradan hızlıca başlatabilirsin</p>
        </AppLink>

        <div className="mt-5">
          <FeedbackButton />
        </div>
      </div>
    </div>
  );
}
