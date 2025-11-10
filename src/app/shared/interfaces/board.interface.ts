export type InvitationStatus = 'pending' | 'accepted' | 'rejected';

export interface BoardInvitation {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
  };
  status: InvitationStatus;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface BoardMember {
  _id: string;
  name: string;
  email: string;
}

export interface BoardOwner {
  _id: string;
  name: string;
  email: string;
}

export interface Board {
  _id: string;
  title: string;
  description?: string;
  owner: BoardOwner;
  members: BoardMember[];
  invitations: BoardInvitation[];
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateBoardRequest {
  title: string;
  description?: string;
}

export interface UpdateBoardRequest {
  title?: string;
  description?: string;
}

export interface InviteUserRequest {
  userId: string;
}

export interface UpdateInvitationRequest {
  status: 'accepted' | 'rejected';
}

