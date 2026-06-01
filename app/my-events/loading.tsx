import { EventListSkeleton } from "@/components/events/event-card-skeleton";

export default function MyEventsLoading() {
  return (
    <main className="flex-1 px-4 py-6 pb-20">
      <EventListSkeleton count={4} />
    </main>
  );
}
