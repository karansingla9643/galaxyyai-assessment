"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { GitBranch, Cpu, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/dashboard", label: "Flow", icon: GitBranch },
  { href: "/nodes", label: "Nodes", icon: Cpu },
];

export default function DashboardSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  // Persist collapse state
  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved !== null) setCollapsed(saved === "true");
  }, []);

  const toggle = () => {
    setCollapsed((prev) => {
      localStorage.setItem("sidebar-collapsed", String(!prev));
      return !prev;
    });
  };

  return (
    <aside
      className={cn(
        "h-full bg-white border-r border-gray-200 flex flex-col shrink-0 relative transition-all duration-200 ease-in-out",
        collapsed ? "w-[52px]" : "w-60"
      )}
    >
      {/* Logo */}
      <div className="h-12 flex items-center border-b border-gray-100 shrink-0 overflow-hidden px-3">
        <Link href="/dashboard" className="flex items-center gap-2 min-w-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Logo" width={24} height={24} className="shrink-0" />
          <span
            className={cn(
              "font-bold text-gray-900 text-[15px] whitespace-nowrap transition-all duration-200",
              collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
            )}
          >
            Magica
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-1.5 py-2 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isFlow = item.href === "/dashboard";
          const isNodes = item.href === "/nodes";
          const isActive = isFlow
            ? pathname === "/dashboard" || pathname.startsWith("/workflow")
            : isNodes
              ? pathname.startsWith("/nodes")
              : false;

          return (
            <Link
              key={item.label}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all group relative",
                collapsed ? "justify-center" : "",
                isActive
                  ? "bg-gray-100 text-gray-900 font-medium"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <Icon
                size={15}
                className={cn("shrink-0", isActive ? "text-gray-700" : "text-gray-400")}
              />
              <span
                className={cn(
                  "whitespace-nowrap transition-all duration-200 overflow-hidden",
                  collapsed ? "opacity-0 w-0" : "opacity-100"
                )}
              >
                {item.label}
              </span>

              {/* Tooltip when collapsed */}
              {collapsed && (
                <span className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div
        className={cn(
          "px-2 py-3 border-t border-gray-100 shrink-0 overflow-hidden",
          collapsed ? "flex justify-center" : ""
        )}
      >
        <div className={cn("flex items-center gap-2.5", collapsed && "justify-center")}>
          <UserButton
            appearance={{
              elements: {
                avatarBox: "w-7 h-7 shrink-0",
                userButtonPopoverCard: "shadow-xl border border-gray-200",
              },
            }}
          />
          <span
            className={cn(
              "text-sm text-gray-700 truncate font-medium transition-all duration-200",
              collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
            )}
          >
            Account
          </span>
        </div>
      </div>

      {/* Collapse toggle button */}
      <Button
        onClick={toggle}
        className="absolute -right-3 top-[50%] -translate-y-1/2 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:shadow-md hover:border-gray-300 transition-all z-20 text-gray-400 hover:text-gray-700 cursor-pointer"
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </Button>
    </aside>
  );
}
