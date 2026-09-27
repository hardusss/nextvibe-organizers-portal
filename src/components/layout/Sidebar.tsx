"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/src/components/providers/AuthProvider";
import { useMobileMenu } from "@/src/contexts/MobileMenuContext";
import { useDemoMode } from "@/src/contexts/DemoModeContext";
import { useRole } from "@/src/contexts/RoleContext";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Settings,
  HelpCircle,
  LogOut,
  Plus,
  X,
  FlaskConical,
} from "lucide-react";
import CreateEventModal from "@/src/components/modals/CreateEventModal";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Events", href: "/events", icon: Calendar },
  { name: "Attendees", href: "/attendees", icon: Users },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();
  const router = useRouter();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const { isMobileMenuOpen, closeMobileMenu } = useMobileMenu();
  const { isDemoMode, canAccessDemo, toggleDemoMode } = useDemoMode();
  const { role, setRole } = useRole();

  const visibleNavigation = navigation.filter((item) => {
    if (role === "sponsor") {
      return item.name !== "Attendees" && item.name !== "Settings";
    }
    return true;
  });

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

      <div className={`fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-[#050409]/95 dark:bg-[#030206]/98 border-r border-white/5 h-[100dvh] transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-6 pb-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                <Image src="/logo.png" alt="NextVibe" width={32} height={32} className="object-cover" />
              </div>
              <div>
                <h1 className="text-white font-cursive text-2xl tracking-normal leading-tight capitalize">NextVibe</h1>
                <p className="text-white/50 font-display italic text-[11px] tracking-wide">
                  Organizer portal
                </p>
              </div>
            </div>
            <button
              onClick={closeMobileMenu}
              className="md:hidden p-2 rounded-lg text-white/50 hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="px-4 py-2">
          <button
            onClick={() => setShowCreateEvent(true)}
            className="w-full flex items-center justify-center gap-2 bg-white/[0.03] hover:bg-white/[0.06] text-white/90 transition-all py-3 rounded-xl border border-white/10 hover:border-[var(--accent-primary)] hover:shadow-[0_0_15px_var(--accent-glow)] font-display text-xs uppercase tracking-wider font-extrabold cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Create Event
          </button>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {visibleNavigation.map((item) => {
            const isOtherActive = visibleNavigation
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
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative ${isActive
                      ? "text-white bg-white/[0.04] border border-white/5 font-semibold"
                      : "text-white/50 hover:text-white hover:bg-white/[0.02]"
                    }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active-bar"
                      className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r bg-[var(--accent-primary,#a855f7)]"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <item.icon
                    className={`w-5 h-5 transition-colors ${isActive ? "text-[var(--accent-primary,#a855f7)]" : "text-white/40 group-hover:text-white/70"
                      }`}
                  />
                  <span className="text-sm font-medium tracking-tight">{item.name}</span>
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
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-white/50 hover:bg-white/[0.02] hover:text-white transition-colors group relative"
          >
            {pathname === "/help" && (
              <motion.div
                layoutId="sidebar-active-bar"
                className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r bg-[var(--accent-primary,#a855f7)]"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <HelpCircle className={`w-5 h-5 transition-colors ${pathname === "/help" ? "text-[var(--accent-primary,#a855f7)]" : "text-white/40 group-hover:text-white/70"}`} />
            <span className="text-sm font-medium tracking-tight">Help</span>
          </Link>
          <button onClick={() => setShowLogoutModal(true)} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[#ff6b6b]/70 hover:bg-[#ff6b6b]/5 hover:text-[#ff6b6b] transition-colors group cursor-pointer">
            <LogOut className="w-5 h-5 text-[#ff6b6b]/60 group-hover:text-[#ff6b6b]" />
            <span className="text-sm font-medium tracking-tight">Logout</span>
          </button>

          {canAccessDemo && (
            <div className="mt-3 pt-3 border-t border-white/5">
              <button
                onClick={toggleDemoMode}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors group cursor-pointer hover:bg-white/[0.02]"
              >
                <div className="flex items-center gap-3">
                  <FlaskConical className={`w-5 h-5 transition-colors ${isDemoMode ? "text-[var(--accent-primary,#a855f7)]" : "text-white/40"
                    }`} />
                  <span className={`text-sm font-medium tracking-tight transition-colors ${isDemoMode ? "text-white" : "text-white/50"
                    }`}>Demo mode</span>
                </div>
                <div className={`relative w-10 h-[22px] rounded-full transition-colors duration-300 ${isDemoMode
                    ? "bg-[var(--accent-primary,#a855f7)]"
                    : "bg-white/10"
                  }`}>
                  <motion.div
                    className="absolute top-[3px] w-4 h-4 rounded-full bg-white shadow-sm"
                    animate={{ left: isDemoMode ? 21 : 3 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                </div>
              </button>
            </div>
          )}
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
              <h3 className="text-xl font-bold text-black dark:text-white mb-2">Confirm logout</h3>
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

      <CreateEventModal
        isOpen={showCreateEvent}
        onClose={() => setShowCreateEvent(false)}
        onEventCreated={() => router.refresh()}
      />
    </>
  );
}
