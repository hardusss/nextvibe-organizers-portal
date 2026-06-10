"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/src/components/providers/AuthProvider";
import { useMobileMenu } from "@/src/contexts/MobileMenuContext";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Settings,
  HelpCircle,
  LogOut,
  Plus,
  X,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Events", href: "/events", icon: Calendar },
  { name: "Attendees", href: "/attendees", icon: Users },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const { isMobileMenuOpen, closeMobileMenu } = useMobileMenu();

  return (
    <>
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeMobileMenu}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      <div className={`fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-white dark:bg-[#0d0d12] border-r border-black/5 dark:border-white/5 h-[100dvh] transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
              <Image src="/logo.png" alt="NextVibe" width={32} height={32} className="object-cover" />
            </div>
            <div>
              <h1 className="text-black dark:text-white font-semibold text-lg tracking-wide leading-tight">NextVibe</h1>
              <p className="text-black/40 dark:text-white/40 text-xs">Organizer Portal</p>
            </div>
          </div>
          <button 
            onClick={closeMobileMenu}
            className="md:hidden p-2 rounded-lg text-black/50 dark:text-white/50 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 py-2">
          <button className="w-full flex items-center justify-center gap-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-black/80 dark:text-white/80 transition-colors py-2.5 rounded-xl border border-black/10 dark:border-white/10 text-sm font-medium">
            <Plus className="w-4 h-4" /> Create Event
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isOtherActive = navigation
              .filter((nav) => nav.href !== "/dashboard")
              .some((nav) => pathname === nav.href || pathname.startsWith(nav.href + "/"));
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard" || pathname === "/" || !isOtherActive
                : pathname === item.href || pathname.startsWith(item.href + "/");
            return (
                <motion.div key={item.name} whileHover={{ x: 4 }} whileTap={{ scale: 0.98 }}>
                  <Link
                    href={item.href}
                    onClick={() => {
                      if (window.innerWidth < 768) closeMobileMenu();
                    }}
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

        <div className="p-4 space-y-1 mb-safe">
          <Link
            href="/help"
            onClick={() => {
              if (window.innerWidth < 768) closeMobileMenu();
            }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-black/50 dark:text-white/50 hover:bg-black/5 dark:hover:bg-white/5 hover:text-black/80 dark:hover:text-white/80 transition-colors group"
          >
            <HelpCircle className="w-5 h-5 text-black/40 dark:text-white/40 group-hover:text-black/70 dark:group-hover:text-white/70" />
            <span className="text-sm font-medium">Help</span>
          </Link>
          <button onClick={() => setShowLogoutModal(true)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#ff6b6b]/70 hover:bg-[#ff6b6b]/10 hover:text-[#ff6b6b] transition-colors group cursor-pointer">
            <LogOut className="w-5 h-5 text-[#ff6b6b]/60 group-hover:text-[#ff6b6b]" />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showLogoutModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="bg-white dark:bg-[#0d0d12] border border-black/10 dark:border-white/10 rounded-2xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)] max-w-sm w-full mx-4"
            >
              <h3 className="text-xl font-bold text-black dark:text-white mb-2">Confirm Logout</h3>
              <p className="text-black/60 dark:text-white/60 mb-6">Are you sure you want to log out?</p>
              
              <div className="flex gap-3 justify-end">
                <button 
                  onClick={() => setShowLogoutModal(false)}
                  className="px-4 py-2 rounded-lg font-medium text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    setShowLogoutModal(false);
                    logout();
                  }}
                  className="px-4 py-2 rounded-lg font-medium bg-[#ff6b6b] text-white hover:bg-[#ff5252] transition-colors shadow-sm shadow-[#ff6b6b]/20"
                >
                  Yes, log out
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
