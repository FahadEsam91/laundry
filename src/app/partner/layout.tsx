import { guard } from "@/lib/guard";
import { PartnerShell } from "./shell";

export const metadata = { title: "Laundry panel" };

export default async function Layout({ children }: { children: React.ReactNode }) {
  await guard("partner", "/partner", true);
  return <PartnerShell>{children}</PartnerShell>;
}
