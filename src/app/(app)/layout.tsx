import { CustomerShell } from "@/components/customer";
import { Intro } from "@/components/intro";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Intro />
      <CustomerShell>{children}</CustomerShell>
    </>
  );
}
