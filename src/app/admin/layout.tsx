import { AdminShell } from "@/components/admin";
import { guard } from "@/lib/guard";

export const metadata = { title: "Admin" };

export default async function Layout({ children }: { children: React.ReactNode }) {
  await guard("admin", "/admin");
  return <AdminShell>{children}</AdminShell>;
}
