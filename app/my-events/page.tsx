import Link from "next/link";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { EventCard } from "@/components/events/event-card";
import { EventListEmpty } from "@/components/events/event-list-empty";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { getEventsByCreator } from "@/lib/dummy/events";
import { getEventsOfParticipant } from "@/lib/dummy/participants";
import { CURRENT_DUMMY_USER } from "@/lib/dummy/users";

export default function MyEventsPage() {
  const hosted = getEventsByCreator(CURRENT_DUMMY_USER.id);
  const joined = getEventsOfParticipant(CURRENT_DUMMY_USER.id);

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 px-4 py-6 pb-20">
        <h1 className="text-2xl font-bold">내 이벤트</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          내가 만든 이벤트와 참여한 이벤트를 한눈에 보세요.
        </p>

        <Tabs defaultValue="hosted" className="mt-6 space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="hosted">주최한 ({hosted.length})</TabsTrigger>
            <TabsTrigger value="joined">참여한 ({joined.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="hosted">
            {hosted.length === 0 ? (
              <EventListEmpty
                title="아직 만든 이벤트가 없습니다"
                action={
                  <Button asChild size="sm">
                    <Link href="/events/new">첫 이벤트 만들기</Link>
                  </Button>
                }
              />
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {hosted.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="joined">
            {joined.length === 0 ? (
              <EventListEmpty
                title="아직 참여한 이벤트가 없습니다"
                description="초대 링크를 받으면 자동으로 표시됩니다."
              />
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {joined.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
      <MobileBottomNav />
    </div>
  );
}
