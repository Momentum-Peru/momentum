export type InvitationStatus = 'pending' | 'accepted' | 'rejected';

export interface BoardInvitation {
  _id: string;
  userId: {
    _id: string;
    name?: string | null;
    email?: string | null;
  } | null;
  status: InvitationStatus;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface BoardMember {
  _id: string;
  name?: string | null;
  email?: string | null;
  profilePicture?: string;
}

export interface BoardOwner {
  _id: string;
  name?: string | null;
  email?: string | null;
  profilePicture?: string;
}

export interface Board {
  _id: string;
  title: string;
  description?: string;
  color?: string;
  owner: BoardOwner | null;
  members?: BoardMember[] | null;
  invitations?: BoardInvitation[] | null;
  areaId?: string | { _id: string; nombre: string }; // Puede venir populado o como string
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateBoardRequest {
  title: string;
  description?: string;
  color?: string;
  areaId?: string;
}

export interface UpdateBoardRequest {
  title?: string;
  description?: string;
  color?: string;
}

export interface InviteUserRequest {
  userId: string;
}

export interface UpdateInvitationRequest {
  status: 'accepted' | 'rejected';
}

