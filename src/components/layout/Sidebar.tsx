"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Star,
  Settings,
  HelpCircle,
  LogOut,
  Plus,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Events", href: "/events", icon: Calendar },
  { name: "Attendees", href: "/attendees", icon: Users },
  { name: "Reputation", href: "/reputation", icon: Star },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex flex-col w-64 bg-white dark:bg-[#0d0d12] border-r border-black/5 dark:border-white/5 h-screen sticky top-0 transition-colors duration-200">
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full overflow-hidden">
          <Image src="/logo.png" alt="NextVibe" width={32} height={32} className="object-cover" />
        </div>
        <div>
          <h1 className="text-black dark:text-white font-semibold text-lg tracking-wide">NextVibe</h1>
          <p className="text-black/40 dark:text-white/40 text-xs">Organizer Portal</p>
        </div>
      </div>

      <div className="px-4 py-2">
        <button className="w-full flex items-center justify-center gap-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-black/80 dark:text-white/80 transition-colors py-2.5 rounded-xl border border-black/10 dark:border-white/10 text-sm font-medium">
          <Plus className="w-4 h-4" /> Create Event
        </button>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
              <motion.div key={item.name} whileHover={{ x: 4 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                    isActive
                      ? "bg-black/10 dark:bg-white/10 text-black dark:text-white shadow-[inset_2px_0_0_rgba(139,92,246,1)]"
                      : "text-black/50 dark:text-white/50 hover:bg-black/5 dark:hover:bg-white/5 hover:text-black/80 dark:hover:text-white/80"
                  }`}
                >
                  <item.icon
                    className={`w-5 h-5 ${
                      isActive ? "text-purple-600 dark:text-purple-400" : "text-black/40 dark:text-white/40 group-hover:text-black/70 dark:group-hover:text-white/70"
                    }`}
                  />
                  <span className="text-sm font-medium">{item.name}</span>
                </Link>
              </motion.div>
          );
        })}
      </nav>

      <div className="p-4 space-y-1">
        <Link
          href="/help"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-black/50 dark:text-white/50 hover:bg-black/5 dark:hover:bg-white/5 hover:text-black/80 dark:hover:text-white/80 transition-colors group"
        >
          <HelpCircle className="w-5 h-5 text-black/40 dark:text-white/40 group-hover:text-black/70 dark:group-hover:text-white/70" />
          <span className="text-sm font-medium">Help</span>
        </Link>
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#ff6b6b]/70 hover:bg-[#ff6b6b]/10 hover:text-[#ff6b6b] transition-colors group">
          <LogOut className="w-5 h-5 text-[#ff6b6b]/60 group-hover:text-[#ff6b6b]" />
          <span className="text-sm font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
}
