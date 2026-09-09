import { AppLayout } from "@/components/layout/AppLayout";
import { PriceCollectionTaskDetail } from "@/components/ai-workflow/PriceCollectionTaskDetail";

type PageProps = { params: Promise<{ id: string }> };

export default async function PriceCollectionTaskDetailPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <AppLayout>
      <PriceCollectionTaskDetail taskId={id} />
    </AppLayout>
  );
}
