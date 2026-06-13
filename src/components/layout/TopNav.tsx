"use client";

import { Moon, Sun, Menu } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import { useMobileMenu } from "@/src/contexts/MobileMenuContext";

interface TopNavProps {
  title: React.ReactNode;
  userProfile?: any;
}

export default function TopNav({ title, userProfile }: TopNavProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { toggleMobileMenu } = useMobileMenu();

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <header className="flex items-center justify-between px-4 md:px-8 py-4 md:py-6 shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={toggleMobileMenu}
          className="md:hidden p-2 -ml-2 rounded-lg text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="w-1 h-6 bg-black dark:bg-white rounded-full hidden md:block"></div>
        <h2 className="text-base sm:text-lg md:text-xl font-semibold text-black dark:text-white tracking-wide flex-1 min-w-0">{title}</h2>
      </div>

      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleTheme}
          className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-center text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
        >
          {mounted ? (theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />) : <div className="w-4 h-4" />}
        </motion.button>

        <div className="w-px h-5 sm:h-6 bg-black/10 dark:bg-white/10 mx-1 sm:mx-2"></div>

        <div className="ml-1 flex items-center gap-2 sm:gap-3 bg-black/5 dark:bg-white/5 py-1 pl-1 pr-1 sm:pr-4 rounded-full border border-black/10 dark:border-white/10">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-cyan-500 flex items-center justify-center overflow-hidden border border-black/10 dark:border-white/10">
            {userProfile?.avatar ? (
              <Image src={userProfile.avatar} alt="Avatar" width={32} height={32} className="object-cover w-full h-full" />
            ) : (
              <div
                className="w-full h-full opacity-90 bg-cover bg-white"
                style={{ backgroundImage: `url('https://api.dicebear.com/7.x/avataaars/svg?seed=${userProfile?.username || userProfile?.email || 'organizer'}')` }}
              ></div>
            )}
          </div>
          <span className="hidden sm:block text-sm font-medium text-black dark:text-white max-w-[80px] sm:max-w-[120px] truncate">
            {userProfile?.username || userProfile?.first_name || "Organizer"}
          </span>
        </div>
      </div>
    </header>
  );
}
