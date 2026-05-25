import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { EventDetailHeader } from "@/components/events/event-detail-header";
import { EventParticipantsList } from "@/components/events/event-participants-list";
import { EventShareActions } from "@/components/events/event-share-actions";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getEventById } from "@/lib/dummy/events";
import {
  getParticipantsOfEvent,
  countParticipantsOfEvent,
} from "@/lib/dummy/participants";
import { CURRENT_DUMMY_USER } from "@/lib/dummy/users";
import { Pencil } from "lucide-react";

async function EventDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = getEventById(id);
  if (!event) notFound();

  const participants = getParticipantsOfEvent(event.id);
  const count = countParticipantsOfEvent(event.id);
  const isHost = event.createdBy === CURRENT_DUMMY_USER.id;

  return (
    <main className="flex-1 px-4 py-6 pb-20">
      <EventDetailHeader event={event} participantCount={count} />

      <Separator className="my-6" />

      {isHost ? (
        <Tabs defaultValue="participants" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="participants">참여자 ({count})</TabsTrigger>
            <TabsTrigger value="manage">관리</TabsTrigger>
          </TabsList>
          <TabsContent value="participants" className="space-y-3">
            <EventParticipantsList participants={participants} />
          </TabsContent>
          <TabsContent value="manage" className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-medium">초대 링크 공유</p>
              <EventShareActions inviteCode={event.inviteCode} />
            </div>
            <Button asChild variant="outline" className="w-full">
              <Link href={`/events/${event.id}/edit`}>
                <Pencil className="mr-2 h-4 w-4" />
                이벤트 수정
              </Link>
            </Button>
          </TabsContent>
        </Tabs>
      ) : (
        <section className="space-y-3">
          <h2 className="text-base font-semibold">참여자 ({count})</h2>
          <EventParticipantsList participants={participants} />
        </section>
      )}
    </main>
  );
}

export default function EventDetailPage({
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
        <EventDetailContent params={params} />
      </Suspense>
      <MobileBottomNav />
    </div>
  );
}
