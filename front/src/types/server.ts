export interface ServerType {
  serverId: string;
  serverName: string;
  image: string;
  members: string[];
}

export interface ServerCardProps {
  server: ServerType;
}

export interface ServerCardListProps {
  servers: ServerType[];
}

// 서버 멤버 조회
export interface ServerMember {
  id : number;
  name : string;
  profileImage : string;
}
