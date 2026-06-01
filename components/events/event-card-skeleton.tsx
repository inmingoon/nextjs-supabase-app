import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** EventCard 로딩 자리 — 카드 높이/형태를 맞춰 layout shift 를 줄인다. */
export function EventCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="h-32 w-full rounded-none" />
      <CardContent className="space-y-2 p-4">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-3.5 w-1/2" />
        <Skeleton className="h-3.5 w-2/3" />
      </CardContent>
    </Card>
  );
}

/** 카드 그리드 스켈레톤 (기본 6개). 그리드 클래스는 EventCard 그리드와 동일. */
export function EventListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <EventCardSkeleton key={i} />
      ))}
    </div>
  );
}
