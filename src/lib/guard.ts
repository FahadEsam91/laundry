import "server-only";
import { redirect } from "next/navigation";
import { currentUser, type Role } from "./auth";

export async function guard(role: Role, path: string, strict = false) {
  const u = await currentUser();
  if (!u || (u.role !== role && (strict || u.role !== "admin"))) redirect(`/login?next=${encodeURIComponent(path)}`);
  return u;
}
