export type Role = "guest" | "user" | "admin";

export type ProjectStatus = "idea" | "building" | "launched" | "paused";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface CreatorProfile {
  id: string;
  slug: string;
  userId: string;
  headline: string;
  bio: string;
  skills: string[];
  collaborationPreference: "open" | "invite_only" | "closed";
}

export interface Project {
  id: string;
  slug: string;
  creatorId: string;
  title: string;
  oneLiner: string;
  description: string;
  techStack: string[];
  tags: string[];
  status: ProjectStatus;
  demoUrl?: string;
  updatedAt: string;
}

export interface Post {
  id: string;
  slug: string;
  authorId: string;
  title: string;
  body: string;
  tags: string[];
  createdAt: string;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export interface SessionUser {
  userId: string;
  role: Role;
  name: string;
}
