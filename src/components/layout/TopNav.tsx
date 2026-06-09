"use client";

import { Moon, Sun } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";

interface TopNavProps {
  title: string;
  userProfile?: any;
}

export default function TopNav({ title, userProfile }: TopNavProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <header className="flex items-center justify-between px-8 py-6">
      <div className="flex items-center gap-3">
        <div className="w-1 h-6 bg-black dark:bg-white rounded-full"></div>
        <h2 className="text-xl font-semibold text-black dark:text-white tracking-wide">{title}</h2>
      </div>

      <div className="flex items-center gap-4">
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleTheme}
          className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-center text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
        >
          {mounted ? (theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />) : <div className="w-4 h-4" />}
        </motion.button>

        <div className="w-px h-6 bg-black/10 dark:bg-white/10 mx-2"></div>

        <div className="ml-2 flex items-center gap-3 bg-black/5 dark:bg-white/5 py-1 pl-1 pr-4 rounded-full border border-black/10 dark:border-white/10">
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
          <span className="text-sm font-medium text-black dark:text-white max-w-[120px] truncate">
            {userProfile?.username || userProfile?.first_name || "Organizer"}
          </span>
        </div>
      </div>
    </header>
  );
}
