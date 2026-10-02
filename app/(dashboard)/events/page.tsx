"use client";

import { useEffect, useState } from "react";
import TopNav from "@/src/components/layout/TopNav";
import { getUserDetail } from "@/src/api/user.detail";
import { getHostedEvents, getAllEvents, isOwnEvent, getEventAttendees, deleteEventPost, type EventOwner } from "@/src/api/events";
import {
  Calendar, Users, CheckCircle, XCircle, Clock,
  MapPin, Loader2, User, ShieldCheck, Plus, Edit3, Trash2, Image as ImageIcon
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import CreateEventModal from "@/src/components/modals/CreateEventModal";
import EditEventModal from "@/src/components/modals/EditEventModal";
import EventPostsModal from "@/src/components/modals/EventPostsModal";
import { useRole } from "@/src/contexts/RoleContext";

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
  /** Only on the admin list (every event) */
  owner?: EventOwner;
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
  const [isAdmin, setIsAdmin] = useState(false);

  // Data states
  const [events, setEvents] = useState<HostedEvent[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);

  // Modal state
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [isLoadingAttendees, setIsLoadingAttendees] = useState(false);

  // Create Event modal
  const [showCreateEvent, setShowCreateEvent] = useState(false);

  // Edit Event modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<HostedEvent | null>(null);

  // Delete event confirmation modal state
  const [eventToDeleteId, setEventToDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const { role, isSponsorEvent } = useRole();

  // Event Posts modal
  const [postsEventId, setPostsEventId] = useState<number | null>(null);
  const [postsEventTitle, setPostsEventTitle] = useState<string>("");

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("nextvibe_access") : null;
    if (!token) return;

    const fetchUser = async () => {
      try {
        const data = await getUserDetail(undefined, true);
        setUserProfile(data);
        return !!data?.is_admin;
      } catch (error) {
        console.error("Failed to fetch user profile:", error);
        return false;
      }
    };
    // An admin (User.is_admin) sees every event, so the list waits for the profile
    fetchUser().then((admin) => {
      setIsAdmin(admin);
      fetchEvents(admin);
    });
  }, [role]);

  const fetchEvents = async (admin = isAdmin) => {
    setIsLoadingEvents(true);
    try {
      const data = admin ? await getAllEvents() : await getHostedEvents();
      const allEvents = data.data || [];
      if (role === "sponsor") {
        setEvents(allEvents.filter((evt: any) => isSponsorEvent(evt.post_id)));
      } else {
        setEvents(allEvents);
      }
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

  const handleDeleteConfirm = async () => {
    if (eventToDeleteId === null) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteEventPost(eventToDeleteId);
      setEventToDeleteId(null);
      fetchEvents();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsDeleting(false);
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
      <TopNav title="Event Management" userProfile={userProfile} />

      <main className="flex-1 overflow-hidden flex flex-col mt-2 px-4 md:px-8">

        {/* Header Section */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] tracking-widest text-[var(--accent-primary)] font-mono font-bold uppercase">event directory</span>
            <h2 className="text-2xl font-display font-extrabold uppercase text-foreground tracking-tight">
              {isAdmin ? "All Events" : "Hosted Campaigns"}
            </h2>
          </div>

          <button
            onClick={() => setShowCreateEvent(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-black/10 dark:border-foreground/10 hover:border-[var(--accent-primary)] hover:bg-black/5 dark:hover:bg-foreground/5 text-foreground transition-all text-xs font-display font-extrabold uppercase tracking-wider cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create Event
          </button>
        </div>

        {/* Content Box */}
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
                  <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-primary)]" />
                </div>
              ) : events.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-foreground/30">
                  <Calendar className="w-12 h-12 mb-3 opacity-30 animate-pulse" />
                  <p className="text-xs font-mono uppercase tracking-wider">No active events found</p>
                </div>
              ) : (
                <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {events.map((evt) => (
                    <motion.div
                      key={evt.post_id}
                      variants={item}
                      whileHover={{ y: -4 }}
                      className="premium-card overflow-hidden flex flex-col shadow-sm backdrop-blur-md transition-all duration-250 group"
                    >
                      {/* Image section with 16:9 scale and hover zoom */}
                      <div className="aspect-video bg-black/40 relative flex items-center justify-center overflow-hidden border-b border-black/10 dark:border-foreground/5">
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
                                  className="object-cover blur-xl opacity-20 scale-110"
                                />
                                <Image
                                  src={imgSrc}
                                  alt={evt.about || "Event"}
                                  fill
                                  className="object-cover z-10 p-0 transition-transform duration-500 group-hover:scale-105"
                                />
                              </>
                            );
                          }
                          return <Calendar className="w-10 h-10 text-foreground/10 relative z-10" />;
                        })()}

                        {/* Host Tag: yours, or who hosts it (admin list) */}
                        <div className="absolute top-3 right-3 bg-black/80 backdrop-blur-md text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border border-foreground/10 text-foreground flex items-center gap-1.5 shadow-md z-20">
                          {isOwnEvent(evt) ? (
                            <><ShieldCheck className="w-3.5 h-3.5 text-[var(--accent-primary)]" /> Host</>
                          ) : (
                            <><User className="w-3.5 h-3.5 text-[var(--accent-primary)]" /> @{evt.owner?.username ?? "organizer"}</>
                          )}
                        </div>
                      </div>

                      <div className="p-5 flex-1 flex flex-col justify-between">
                        <div>
                          {/* Title in display font */}
                          <h3 className="font-display font-extrabold text-lg uppercase tracking-tight text-foreground mb-3 line-clamp-1">{evt.about}</h3>

                          <div className="space-y-2 mb-6">
                            <div className="flex items-center gap-2.5 text-foreground/50 text-xs font-mono">
                              <Clock className="w-3.5 h-3.5 text-foreground/30" />
                              <span>{evt.is_luma_event && evt.luma_event_start_time ? formatDate(evt.luma_event_start_time) : formatDate(evt.create_at)}</span>
                            </div>
                            <div className="flex items-center gap-2.5 text-foreground/50 text-xs font-mono">
                              <MapPin className="w-3.5 h-3.5 text-foreground/30" />
                              <span className="truncate">{evt.location ? evt.location : (evt.is_luma_event ? "Online Luma event" : "Location TBA")}</span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-black/10 dark:border-foreground/5 flex gap-2">
                          <button
                            onClick={() => openAttendeesModal(evt.post_id)}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-transparent border border-black/10 dark:border-foreground/10 hover:border-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/5 text-[var(--accent-primary)] text-xs font-display font-extrabold uppercase tracking-wider transition-colors cursor-pointer"
                          >
                            <Users className="w-3.5 h-3.5" /> Attendees
                          </button>

                          <button
                            onClick={() => { setPostsEventId(evt.post_id); setPostsEventTitle(evt.about); }}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-transparent border border-black/10 dark:border-foreground/10 hover:border-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/5 text-[var(--accent-primary)] text-xs font-display font-extrabold uppercase tracking-wider transition-colors cursor-pointer"
                            title="View posts"
                          >
                            <ImageIcon className="w-3.5 h-3.5" /> Posts
                          </button>

                          {/* Editing and deleting stay with the event's owner */}
                          {isOwnEvent(evt) && (
                            <>
                              <button
                                onClick={() => { setEditingEvent(evt); setShowEditModal(true); }}
                                className="flex items-center justify-center p-2.5 rounded-xl border border-black/10 dark:border-foreground/10 hover:bg-black/5 dark:hover:bg-foreground/5 text-foreground/60 hover:text-[var(--accent-primary)] transition-colors cursor-pointer"
                                title="Edit event"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => setEventToDeleteId(evt.post_id)}
                                className="flex items-center justify-center p-2.5 rounded-xl border border-red-500/20 hover:bg-red-500/10 text-red-500 transition-colors cursor-pointer"
                                title="Delete event"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
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
              className="bg-white dark:bg-[#0c0c0f] border border-black/10 dark:border-foreground/10 rounded-xl shadow-2xl max-w-md w-[95%] md:w-full max-h-[85vh] flex flex-col overflow-hidden"
            >
              <div className="p-4 md:p-5 border-b border-black/10 dark:border-foreground/5 flex items-center justify-between bg-black/5 dark:bg-foreground/[0.02]">
                <h3 className="text-base font-display font-extrabold uppercase tracking-tight text-foreground flex items-center gap-2.5">
                  <Users className="w-5 h-5 text-[var(--accent-primary)]" />
                  Approved Attendees
                </h3>
                <button
                  onClick={closeAttendeesModal}
                  className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-foreground/10 text-foreground/50 transition-colors"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                {isLoadingAttendees ? (
                  <div className="flex items-center justify-center h-40">
                    <Loader2 className="w-7 h-7 animate-spin text-[var(--accent-primary)]" />
                  </div>
                ) : attendees.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-foreground/30 text-xs font-mono uppercase tracking-wider">
                    No approved attendees yet
                  </div>
                ) : (
                  <div className="space-y-1 p-2">
                    {attendees.map((attendee) => (
                      <div key={attendee.user_id} className="flex items-center gap-3 p-3 rounded-xl border border-transparent hover:border-black/5 dark:hover:border-foreground/5 hover:bg-black/[0.01] dark:hover:bg-foreground/[0.01] transition-all">
                        <div className="w-10 h-10 rounded-full overflow-hidden border border-black/10 dark:border-foreground/10 bg-black/5 dark:bg-foreground/5 flex items-center justify-center">
                          {attendee.avatar ? (
                            <Image src={attendee.avatar} alt={attendee.username} width={40} height={40} className="object-cover w-full h-full" />
                          ) : (
                            <User className="w-5 h-5 text-foreground/30" />
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-sm text-foreground">{attendee.username}</div>
                          <div className="text-[10px] text-foreground/40 font-mono">Approved: {formatDate(attendee.created_at)}</div>
                        </div>
                        <div className="ml-auto">
                          <CheckCircle className="w-4 h-4 text-[var(--accent-primary)]" />
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

      <CreateEventModal
        isOpen={showCreateEvent}
        onClose={() => setShowCreateEvent(false)}
        onEventCreated={() => fetchEvents()}
      />

      <EditEventModal
        isOpen={showEditModal}
        onClose={() => { setShowEditModal(false); setEditingEvent(null); }}
        event={editingEvent}
        onEventUpdated={() => fetchEvents()}
      />

      <EventPostsModal
        isOpen={postsEventId !== null}
        onClose={() => { setPostsEventId(null); setPostsEventTitle(""); }}
        eventId={postsEventId}
        eventTitle={postsEventTitle}
      />

      {/* Custom Delete Confirmation Modal */}
      <AnimatePresence>
        {eventToDeleteId !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => setEventToDeleteId(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#0c0c0f] border border-black/10 dark:border-foreground/10 rounded-xl shadow-2xl max-w-sm w-full p-6 space-y-4"
            >
              <div className="space-y-2">
                <h3 className="text-lg font-display font-extrabold uppercase tracking-tight text-red-500 flex items-center gap-2">
                  <Trash2 className="w-5 h-5" />
                  Delete Event
                </h3>
                <p className="text-xs text-foreground/60 leading-relaxed">
                  Are you sure you want to delete this event? This action will permanently remove it from the NextVibe registry.
                </p>
              </div>

              {deleteError && (
                <div className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-xl">
                  {deleteError}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setEventToDeleteId(null)}
                  disabled={isDeleting}
                  className="px-4 py-2.5 rounded-xl border border-black/10 dark:border-foreground/10 text-foreground/70 text-xs font-semibold hover:bg-black/5 dark:hover:bg-foreground/5 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting}
                  className="px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-50 text-foreground text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Deleting…
                    </>
                  ) : (
                    "Delete"
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
