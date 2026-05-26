import { Suspense } from "react";
import { notFound } from "next/navigation";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { EventForm } from "@/components/events/event-form";
import { getEventById } from "@/lib/queries/events";

async function EditEventContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await getEventById(id);
  if (!event) notFound();

  const defaultValues = {
    title: event.title,
    description: event.description ?? "",
    // datetime-local 호환: YYYY-MM-DDTHH:mm (ISO 문자열 앞 16자)
    eventDate: event.eventDate.slice(0, 16),
    location: event.location,
  };

  return (
    <main className="flex-1 px-4 py-6 pb-20">
      <h1 className="text-2xl font-bold">이벤트 수정</h1>
      <p className="mt-1 text-sm text-muted-foreground">{event.title}</p>
      <div className="mt-6">
        <EventForm
          mode="edit"
          eventId={event.id}
          defaultValues={defaultValues}
        />
      </div>
    </main>
  );
}

export default function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Suspense
        fallback={
          <main className="flex-1 px-4 py-6 pb-20">
            <p className="text-muted-foreground">로딩...</p>
          </main>
        }
      >
        <EditEventContent params={params} />
      </Suspense>
      <MobileBottomNav />
    </div>
  );
}
