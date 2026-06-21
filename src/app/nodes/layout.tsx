import Sidebar from "@/components/dashboard/Sidebar";

export default function NodesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen flex bg-white overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-white">
        {children}
      </main>
    </div>
  );
}
