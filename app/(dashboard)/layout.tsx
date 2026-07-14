import Sidebar from "@/src/components/layout/Sidebar";
import { MobileMenuProvider } from "@/src/contexts/MobileMenuContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MobileMenuProvider>
      <div className="flex h-[100dvh] bg-background text-foreground overflow-hidden font-sans transition-colors duration-200">
        <Sidebar />
        <div className="flex-1 flex flex-col h-[100dvh] overflow-hidden">
          {children}
        </div>
      </div>
    </MobileMenuProvider>
  );
}
