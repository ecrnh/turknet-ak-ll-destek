import { createFileRoute } from "@tanstack/react-router";
import { QrTicketScreen } from "@/features/qrSupport/screens/QrTicketScreen";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/qr/talep/$id")({
  head: ({ params }) => pageHead(`Talep ${params.id}`, "QR ile oluşturulan destek talebinin durumu."),
  component: TicketPage,
});

function TicketPage() {
  const { id } = Route.useParams();
  return <QrTicketScreen id={id} />;
}
