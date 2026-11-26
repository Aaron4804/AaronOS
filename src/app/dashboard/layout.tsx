import Shell from "./shell";
import { localMode } from "@/lib/server-auth";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <Shell local={localMode()}>{children}</Shell>;
}
