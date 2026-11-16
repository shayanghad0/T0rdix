import type { User } from "../types";
import { userByApiToken } from "./user.service";

/** Small helper so controllers can import one thing instead of two. */
export async function userByApiTokenSafe(token: string): Promise<User | undefined> {
  if (!token.startsWith("t0rdix_")) return undefined;
  return userByApiToken(token);
}
