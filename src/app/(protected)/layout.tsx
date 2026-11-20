import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { TooltipProvider } from "@/components/ui/tooltip";

export default async function ProtectedLayout({ children }: LayoutProps<"/">) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <TooltipProvider>
      <div className="flex h-screen overflow-hidden print:block print:h-auto print:overflow-visible">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden print:block print:overflow-visible">
          <Header user={{ name: session.user.name, email: session.user.email }} />
          <main className="flex-1 overflow-y-auto px-6 py-5 print:overflow-visible print:p-0">
            {children}
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
