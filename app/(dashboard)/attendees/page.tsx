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

      <main className="flex-1 overflow-hidden flex flex-col mt-2 px-8">
        <div className="mb-6 flex flex-col gap-1">
          <h2 className="text-lg font-bold text-black dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            Manage Attendees
          </h2>
          <p className="text-black/50 dark:text-white/50 text-sm">Review and approve or reject user requests to attend your events.</p>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pb-10">
          {isLoadingRequests ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-8 h-8 animate-spin text-purple-600 dark:text-purple-400" />
            </div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-black/40 dark:text-white/40">
              <Users className="w-16 h-16 mb-4 opacity-50" />
              <p>No registration requests found.</p>
            </div>
          ) : (
            <motion.div variants={container} initial="hidden" animate="show" className="grid gap-4">
              {requests.map((request) => (
                <motion.div 
                  key={request.id} 
                  variants={item}
                  className="bg-white dark:bg-[#0d0d12] border border-black/5 dark:border-white/5 rounded-2xl p-5 flex items-center justify-between shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full overflow-hidden border border-black/10 dark:border-white/10 flex items-center justify-center bg-black/5 dark:bg-white/5">
                      {request.avatar ? (
                        <Image src={request.avatar} alt={request.username} width={48} height={48} className="object-cover w-full h-full" />
                      ) : (
                        <User className="w-6 h-6 text-black/40 dark:text-white/40" />
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-black dark:text-white text-base">{request.username}</div>
                      <div className="text-black/50 dark:text-white/50 text-xs flex items-center gap-1.5 mt-0.5">
                        <Calendar className="w-3 h-3" />
                        Requested for <span className="text-black/80 dark:text-white/80 font-medium">"{request.post_about}"</span>
                      </div>
                      <div className="text-black/40 dark:text-white/40 text-[10px] mt-1">
                        {formatDate(request.created_at)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {request.status === "pending" ? (
                      <>
                        <button 
                          onClick={() => handleAction(request.id, "reject")}
                          disabled={processingAction === request.id}
                          className="px-4 py-2 rounded-lg font-medium text-[#ff6b6b] bg-[#ff6b6b]/10 hover:bg-[#ff6b6b]/20 transition-colors text-sm flex items-center gap-2 disabled:opacity-50"
                        >
                          {processingAction === request.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                          Reject
                        </button>
                        <button 
                          onClick={() => handleAction(request.id, "approve")}
                          disabled={processingAction === request.id}
                          className="px-4 py-2 rounded-lg font-medium text-white bg-[#00e0c2] hover:bg-[#00c5aa] shadow-[0_0_15px_rgba(0,224,194,0.3)] transition-colors text-sm flex items-center gap-2 disabled:opacity-50"
                        >
                          {processingAction === request.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                          Accept
                        </button>
                      </>
                    ) : (
                      <div className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
                        request.status === "approved" 
                          ? "bg-[#00e0c2]/20 text-[#00bda3] dark:bg-[#00e0c2]/10 dark:text-[#00e0c2]"
                          : "bg-[#ff6b6b]/20 text-[#e04545] dark:bg-[#ff6b6b]/10 dark:text-[#ff6b6b]"
                      }`}>
                        {request.status === "approved" ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
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
