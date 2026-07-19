export type TeamRole = 'coach' | 'parent';

export interface Team {
  id: string;
  name: string;
  coach_code: string;
  parent_code: string;
  created_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: TeamRole;
  full_name: string | null;
  phone: string | null;
  created_at: string;
  teams: Team;
}

export interface Athlete {
  id: string;
  team_id: string;
  parent_user_id: string;
  name: string;
  created_at: string;
}

export type PaymentStatus = 'paid' | 'unpaid';

export interface Payment {
  id: string;
  team_id: string;
  athlete_id: string;
  description: string;
  amount_cents: number;
  status: PaymentStatus;
  due_date: string | null;
  created_by: string;
  created_at: string;
  athletes?: Athlete;
}

export interface CoachProfile {
  id: string;
  team_id: string;
  user_id: string | null;
  name: string;
  bio: string | null;
  photo_url: string | null;
  created_at: string;
}

export type EventType =
  | 'practice'
  | 'tournament'
  | 'open_gym'
  | 'scrimmage'
  | 'private_lesson';

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  practice: 'Practice',
  tournament: 'Tournament',
  open_gym: 'Open Gym',
  scrimmage: 'Scrimmage',
  private_lesson: 'Private Lesson',
};

export interface TeamEvent {
  id: string;
  team_id: string;
  type: EventType;
  title: string;
  location: string | null;
  start_time: string;
  end_time: string | null;
  capacity: number | null;
  created_by: string;
  created_at: string;
}

export interface EventSignup {
  id: string;
  event_id: string;
  athlete_id: string;
  created_at: string;
  athletes?: Athlete;
}

export interface SwagItem {
  id: string;
  team_id: string;
  name: string;
  image_url: string | null;
  created_at: string;
}

export type VoteType = 'up' | 'down';

export interface SwagVote {
  id: string;
  item_id: string;
  user_id: string;
  vote: VoteType;
  created_at: string;
}

export interface Contact {
  user_id: string;
  role: TeamRole;
  name: string;
}
