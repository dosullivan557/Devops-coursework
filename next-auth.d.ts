import { DefaultSession } from "next-auth";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user?: DefaultSession["user"] & {
      id?: string;
      teamId?: number;
    };
  }

  interface User {
    teamId?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    teamId?: number;
  }
}
