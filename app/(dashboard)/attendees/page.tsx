"use client";

import { useEffect, useState } from "react";
import TopNav from "@/src/components/layout/TopNav";
import { getUserDetail } from "@/src/api/user.detail";
import { getEventRequests, actOnEventRequest } from "@/src/api/events";
import { Calendar, Users, CheckCircle, XCircle, Loader2, User } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";

interface EventRequest {
  id: number;
  post_id: number;
  post_about: string;
  user_id: number;
  username: string;
  avatar: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
};

export default function AttendeesPage() {
  const [userProfile, setUserProfile] = useState<any>(null);
  const [requests, setRequests] = useState<EventRequest[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);
  const [processingAction, setProcessingAction] = useState<number | null>(null);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("nextvibe_access") : null;
    if (!token) return;

    const fetchUser = async () => {
      try {
        const data = await getUserDetail(undefined, true);
        setUserProfile(data);
      } catch (error) {
        console.error("Failed to fetch user profile:", error);
      }
    };
    fetchUser();
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setIsLoadingRequests(true);
    try {
      const data = await getEventRequests();
      setRequests(data);
    } catch (error) {
      console.error("Failed to fetch event requests:", error);
    } finally {
      setIsLoadingRequests(false);
    }
  };

  const handleAction = async (requestId: number, action: "approve" | "reject") => {
    setProcessingAction(requestId);
    try {
      await actOnEventRequest(requestId, action);
      // Optimistic update
      setRequests((prev) => 
        prev.map((req) => 
          req.id === requestId ? { ...req, status: action === "approve" ? "approved" : "rejected" } : req
        )
      );
    } catch (error) {
      console.error(`Failed to ${action} request:`, error);
    } finally {
      setProcessingAction(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "numeric", minute: "2-digit"
    });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden transition-colors duration-200">
      <TopNav title="Registration Requests" userProfile={userProfile} />

      <main className="flex-1 overflow-hidden flex flex-col mt-2 px-4 md:px-8">
        
        {/* Title Block */}
        <div className="mb-6 flex flex-col gap-1">
          <span className="text-[10px] tracking-widest text-[#00e0c2] font-mono font-bold uppercase">incoming requests</span>
          <h2 className="text-2xl font-display font-extrabold uppercase text-black dark:text-white tracking-tight">
            Registration Queue
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pb-10">
          {isLoadingRequests ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-8 h-8 animate-spin text-[#00e0c2]" />
            </div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-white/30">
              <Users className="w-12 h-12 mb-3 opacity-35" />
              <p className="text-xs font-mono uppercase tracking-wider">No pending registration requests</p>
            </div>
          ) : (
            <motion.div variants={container} initial="hidden" animate="show" className="grid gap-4">
              {requests.map((request) => (
                <motion.div 
                  key={request.id} 
                  variants={item}
                  className="bg-white/70 dark:bg-[#05070a]/90 border border-black/5 dark:border-white/5 rounded-xl p-4 md:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm backdrop-blur-md transition-all duration-200"
                >
                  <div className="flex items-center gap-3.5 w-full sm:w-auto">
                    
                    {/* Styled Avatar Placeholder */}
                    <div className="w-11 h-11 rounded-full overflow-hidden border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 flex items-center justify-center font-display font-extrabold text-sm text-[#00e0c2] uppercase tracking-wide">
                      {request.avatar ? (
                        <Image src={request.avatar} alt={request.username} width={44} height={44} className="object-cover w-full h-full" />
                      ) : (
                        request.username ? request.username.charAt(0) : <User className="w-4 h-4 text-white/30" />
                      )}
                    </div>
                    
                    <div>
                      <div className="font-display font-bold uppercase text-sm text-black dark:text-white tracking-tight">{request.username}</div>
                      <div className="text-black/50 dark:text-white/50 text-xs flex items-center gap-1.5 mt-1">
                        <Calendar className="w-3.5 h-3.5 text-white/20" />
                        <span className="font-mono text-[10px] text-white/40">Campaign:</span>
                        <span className="text-black dark:text-white/80 font-medium">"{request.post_about}"</span>
                      </div>
                      <div className="text-black/40 dark:text-white/35 text-[9px] font-mono mt-1 uppercase tracking-wide">
                        {formatDate(request.created_at)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto mt-2 sm:mt-0">
                    {request.status === "pending" ? (
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button 
                          onClick={() => handleAction(request.id, "reject")}
                          disabled={processingAction === request.id}
                          className="flex-1 sm:flex-none justify-center px-4 py-2.5 rounded-xl border border-red-500/20 hover:bg-red-500/10 text-red-500 text-xs font-display font-extrabold uppercase tracking-wider transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                        >
                          {processingAction === request.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                          Reject
                        </button>
                        
                        <button 
                          onClick={() => handleAction(request.id, "approve")}
                          disabled={processingAction === request.id}
                          className="flex-1 sm:flex-none justify-center px-4 py-2.5 rounded-xl border border-[#00e0c2]/20 hover:bg-[#00e0c2]/10 text-[#00e0c2] text-xs font-display font-extrabold uppercase tracking-wider transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                        >
                          {processingAction === request.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                          Accept
                        </button>
                      </div>
                    ) : (
                      <div className={`px-3 py-1.5 rounded-lg border text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                        request.status === "approved" 
                          ? "border-[#00e0c2]/20 bg-[#00e0c2]/5 text-[#00e0c2]"
                          : "border-red-500/20 bg-red-500/5 text-red-400"
                      }`}>
                        {request.status === "approved" ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {request.status}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}
