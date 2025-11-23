export type ErasmusEvent = {
  id: number;
  name: string;
  date: string;
  location: string;
  description: string;
  organizerId: string;
  registeredUsersIds: string[];
  interestedUsersIds: string[];
};
