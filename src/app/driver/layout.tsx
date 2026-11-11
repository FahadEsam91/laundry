import { guard } from "@/lib/guard";
import { CustomerShell } from "@/components/customer";

export const metadata = { title: "Rider" };

export default async function Layout({ children }: { children: React.ReactNode }) {
  await guard("driver", "/driver", true);
  return <CustomerShell>{children}</CustomerShell>;
}
