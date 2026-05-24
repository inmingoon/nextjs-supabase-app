export type EventStatus = "upcoming" | "ongoing" | "completed";

export type Event = {
  id: string;
  title: string;
  description: string | null;
  coverImageUrl: string | null;
  eventDate: string;
  location: string;
  inviteCode: string;
  createdBy: string;
  status: EventStatus;
  createdAt: string;
  updatedAt: string;
};
