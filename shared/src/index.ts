// Domain types derived from spec v1
export type Role = 'DM' | 'Player' | 'Admin';
export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  roles: Role[];
  createdAt: string;
}

export type BoardVisibility = 'invite' | 'link';
export interface Board {
  id: string;
  dmId: string;
  title: string;
  description?: string;
  background?: string; // color or image ref
  theme?: string; // paper|parchment|stone|wood
  visibility: BoardVisibility;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
  questOrder?: string[]; // ordering of quest ids for board layout
}
export interface BoardReorderPayload { questIds: string[]; }

export interface Party {
  id: string;
  boardId: string;
  name: string;
  memberIds: string[];
  createdAt: string;
}

export type Difficulty = 'Trivial' | 'Easy' | 'Medium' | 'Hard' | 'Deadly';
export type QuestStatus = 'Draft' | 'Posted' | 'Accepted' | 'Completed' | 'Archived';
export interface QuestRewards {
  gp?: number;
  items?: string[];
  xp?: number;
}
export type QuestVisibility = 'party' | 'publicOnBoard';
export interface Quest {
  id: string;
  boardId: string;
  title: string;
  summary: string;
  bodyMarkdown: string;
  images: string[];
  tags: string[];
  difficulty: Difficulty;
  rewards: QuestRewards;
  status: QuestStatus;
  visibility: QuestVisibility;
  allowMultipleAccepts: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type AssignmentStatus = 'Accepted' | 'Completed' | 'Abandoned';
export type AssignedToType = 'Player' | 'Party';
export interface QuestAssignment {
  id: string;
  questId: string;
  boardId: string;
  assignedToType: AssignedToType;
  assignedToId: string;
  status: AssignmentStatus;
  acceptedAt: string;
  completedAt?: string;
  notes?: string;
}

export interface Membership {
  id: string;
  boardId: string;
  userId: string;
  role: 'DM' | 'Player';
  invitedAt: string;
  joinedAt?: string;
}

export interface Comment {
  id: string;
  questId: string;
  authorId: string;
  bodyMarkdown: string;
  createdAt: string;
  parentId?: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  at: string;
}

// API payload helper generics
export interface Paginated<T> { data: T[]; total: number; nextCursor?: string; }

// Events (socket)
export const SocketEvents = {
  BoardUpdate: 'board:update',
  QuestUpdate: 'quest:update',
  CommentNew: 'comment:new',
  PresenceUpdate: 'presence:update'
} as const;
export type SocketEventKeys = typeof SocketEvents[keyof typeof SocketEvents];
