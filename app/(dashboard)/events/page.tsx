"use client";

import { useEffect, useState } from "react";
import TopNav from "@/src/components/layout/TopNav";
import { getUserDetail } from "@/src/api/user.detail";
import { getHostedEvents, getEventAttendees } from "@/src/api/events";
import { 
  Calendar, Users, CheckCircle, XCircle, Clock, 
  MapPin, Loader2, User, ShieldCheck 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

interface HostedEvent {
  user_id: number;
  post_id: number;
  about: string;
  count_likes: number;
  media: any[];
  create_at: string;
  is_luma_event: boolean;
  luma_event_start_time: string;
  location?: string;
}

interface Attendee {
  user_id: number;
  username: string;
  avatar: string;
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

export default function EventsPage() {
  const [userProfile, setUserProfile] = useState<any>(null);
  
  // Data states
  const [events, setEvents] = useState<HostedEvent[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);

  // Modal state
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [isLoadingAttendees, setIsLoadingAttendees] = useState(false);

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
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setIsLoadingEvents(true);
    try {
      const data = await getHostedEvents();
      console.log("Hosted Events Server Response:", data);
      setEvents(data.data || []);
    } catch (error) {
      console.error("Failed to fetch events:", error);
    } finally {
      setIsLoadingEvents(false);
    }
  };

  const openAttendeesModal = async (postId: number) => {
    setSelectedEventId(postId);
    setIsLoadingAttendees(true);
    try {
      const data = await getEventAttendees(postId);
      setAttendees(data.attendees || []);
    } catch (error) {
      console.error("Failed to fetch attendees:", error);
    } finally {
      setIsLoadingAttendees(false);
    }
  };

  const closeAttendeesModal = () => {
    setSelectedEventId(null);
    setAttendees([]);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "numeric", minute: "2-digit"
    });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden transition-colors duration-200">
      <TopNav title="Event Management" userProfile={userProfile} />

      <main className="flex-1 overflow-hidden flex flex-col mt-2 px-4 md:px-8">
        <div className="mb-6 flex flex-col gap-1">
          <h2 className="text-lg font-bold text-black dark:text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            My Hosted Events
          </h2>
          <p className="text-black/50 dark:text-white/50 text-sm">View and manage all the events you have created.</p>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pb-10">
          <AnimatePresence mode="wait">
            <motion.div
              key="events"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {isLoadingEvents ? (
                <div className="flex items-center justify-center h-40">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-600 dark:text-purple-400" />
                </div>
              ) : events.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-black/40 dark:text-white/40">
                  <Calendar className="w-16 h-16 mb-4 opacity-50" />
                  <p>You haven't hosted any events yet.</p>
                </div>
              ) : (
                <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {events.map((evt) => (
                    <motion.div 
                      key={evt.post_id} 
                      variants={item}
                      whileHover={{ y: -5 }}
                      className="bg-white dark:bg-[#0d0d12] border border-black/5 dark:border-white/5 rounded-2xl overflow-hidden flex flex-col shadow-[0_4px_24px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.2)] transition-colors duration-200"
                    >
                      <div className="h-48 bg-gradient-to-br from-purple-500/10 to-cyan-500/10 dark:from-purple-900/20 dark:to-cyan-900/20 relative flex items-center justify-center overflow-hidden">
                        {(() => {
                          const imgSrc = evt.media && evt.media.length > 0 
                            ? (typeof evt.media[0] === 'string' ? evt.media[0] : (evt.media[0]?.media_url || evt.media[0]?.file_url || evt.media[0]?.url))
                            : null;
                          
                          if (imgSrc) {
                            return (
                              <>
                                <Image 
                                  src={imgSrc} 
                                  alt="Background blur" 
                                  fill
                                  className="object-cover blur-xl opacity-40 scale-110" 
                                />
                                <Image 
                                  src={imgSrc} 
                                  alt={evt.about || "Event"} 
                                  fill
                                  className="object-contain z-10 p-2" 
                                />
                              </>
                            );
                          }
                          return <Calendar className="w-12 h-12 text-black/20 dark:text-white/20 relative z-10" />;
                        })()}
                        <div className="absolute top-3 right-3 bg-white/90 dark:bg-black/80 backdrop-blur text-xs font-semibold px-2 py-1 rounded-md text-black dark:text-white flex items-center gap-1 shadow-sm z-20">
                          <ShieldCheck className="w-3 h-3 text-purple-600 dark:text-purple-400" /> Host
                        </div>
                      </div>
                      <div className="p-5 flex-1 flex flex-col">
                        <h3 className="font-bold text-lg text-black dark:text-white mb-2 line-clamp-1">{evt.about}</h3>
                        
                        <div className="space-y-2 mb-6">
                          <div className="flex items-center gap-2 text-black/60 dark:text-white/60 text-xs">
                            <Clock className="w-3.5 h-3.5" />
                            {evt.is_luma_event && evt.luma_event_start_time ? formatDate(evt.luma_event_start_time) : formatDate(evt.create_at)}
                          </div>
                          <div className="flex items-center gap-2 text-black/60 dark:text-white/60 text-xs">
                            <MapPin className="w-3.5 h-3.5" />
                            {evt.location ? evt.location : (evt.is_luma_event ? "Online Luma Event" : "Location TBA")}
                          </div>
                        </div>

                        <div className="mt-auto pt-4 border-t border-black/5 dark:border-white/5">
                          <button 
                            onClick={() => openAttendeesModal(evt.post_id)}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-purple-600/10 hover:bg-purple-600/20 dark:bg-purple-400/10 dark:hover:bg-purple-400/20 text-purple-700 dark:text-purple-300 text-sm font-semibold transition-colors"
                          >
                            <Users className="w-4 h-4" /> View Attendees
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Attendees Modal */}
      <AnimatePresence>
        {selectedEventId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={closeAttendeesModal}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#0d0d12] border border-black/10 dark:border-white/10 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)] max-w-md w-[95%] md:w-full max-h-[85vh] flex flex-col overflow-hidden"
            >
              <div className="p-4 md:p-5 border-b border-black/5 dark:border-white/5 flex items-center justify-between bg-black/5 dark:bg-white/5">
                <h3 className="text-base md:text-lg font-bold text-black dark:text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  Approved Attendees
                </h3>
                <button 
                  onClick={closeAttendeesModal}
                  className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-black/50 dark:text-white/50 transition-colors"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                {isLoadingAttendees ? (
                  <div className="flex items-center justify-center h-40">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-600 dark:text-purple-400" />
                  </div>
                ) : attendees.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-black/40 dark:text-white/40 text-sm">
                    No approved attendees yet.
                  </div>
                ) : (
                  <div className="space-y-1 p-2">
                    {attendees.map((attendee) => (
                      <div key={attendee.user_id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                        <div className="w-10 h-10 rounded-full overflow-hidden border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 flex items-center justify-center">
                          {attendee.avatar ? (
                            <Image src={attendee.avatar} alt={attendee.username} width={40} height={40} className="object-cover w-full h-full" />
                          ) : (
                            <User className="w-5 h-5 text-black/40 dark:text-white/40" />
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-sm text-black dark:text-white">{attendee.username}</div>
                          <div className="text-[10px] text-black/40 dark:text-white/40">Approved: {formatDate(attendee.created_at)}</div>
                        </div>
                        <div className="ml-auto">
                          <CheckCircle className="w-4 h-4 text-[#00e0c2]" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

