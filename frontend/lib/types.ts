export type ErasmusEvent = {
  id: number;
  name: string;
  date: string;
  location: string;
  description: string;
  organizerId: string;
  registeredUsersIds: string[];
  interestedUsersIds: string[];
  category: string;
  participant_count?: number;
  interest_count?: number;
  is_participating?: boolean;
  is_interested?: boolean;
  is_full?: boolean;
};
