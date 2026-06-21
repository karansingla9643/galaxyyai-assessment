"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import {
  GitBranch,
  Cpu,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Flow", icon: GitBranch },
  { href: "/nodes", label: "Nodes", icon: Cpu },
];

export default function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 h-full bg-white border-r border-gray-200 flex flex-col shrink-0">
      {/* Logo */}
      <div className="h-12 flex items-center px-4 border-b border-gray-100">
        <Link href="/dashboard" className="flex items-center gap-2">
          <img src="/logo.png" alt="Logo" width={24} height={24} />
          <span className="font-bold text-gray-900 text-lg">Magica</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isFlow = item.href === "/dashboard";
          const isNodes = item.href === "/nodes";
          const isActive = isFlow
            ? pathname === "/dashboard"
            : isNodes
              ? pathname.startsWith("/nodes")
              : false;

          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all",
                isActive
                  ? "bg-gray-100 text-gray-900 font-medium"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <Icon
                size={15}
                className={cn(
                  isActive ? "text-gray-700" : "text-gray-400"
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-3 py-3 border-t border-gray-100">
        <div className="flex items-center gap-2.5">
          <UserButton
            appearance={{
              elements: {
                avatarBox: "w-7 h-7",
                userButtonPopoverCard: "shadow-xl border border-gray-200",
              },
            }}
          />
          <span className="text-sm text-gray-700 truncate font-medium">Account</span>
        </div>
      </div>
    </aside>
  );
}
