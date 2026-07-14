"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  X, Loader2, Image as ImageIcon, Heart, Star, Award,
  User, MessageCircle, Play, ExternalLink, ChevronDown,
  Sparkles, Shield
} from "lucide-react";
import { getEventPosts, type EventPost, type EventPostsResponse } from "@/src/api/events";

interface EventPostsModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: number | null;
  eventTitle?: string;
}

export default function EventPostsModal({
  isOpen,
  onClose,
  eventId,
  eventTitle,
}: EventPostsModalProps) {
  const [posts, setPosts] = useState<EventPost[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [likedPosts, setLikedPosts] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedPost, setSelectedPost] = useState<EventPost | null>(null);

  const fetchPosts = useCallback(async (index: number = 0, append: boolean = false) => {
    if (!eventId) return;

    if (append) {
      setLoadingMore(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const data: EventPostsResponse = await getEventPosts(eventId, index, 20);
      if (append) {
        setPosts((prev) => [...prev, ...data.results]);
      } else {
        setPosts(data.results);
      }
      setTotal(data.total);
      setHasMore(data.more_posts);
      setLikedPosts(data.liked_posts || []);
    } catch (err) {
      console.error("Failed to fetch event posts:", err);
      setError(err instanceof Error ? err.message : "Failed to load posts");
    } finally {
      setIsLoading(false);
      setLoadingMore(false);
    }
  }, [eventId]);

  useEffect(() => {
    if (isOpen && eventId) {
      setPosts([]);
      fetchPosts(0);
    }
  }, [isOpen, eventId, fetchPosts]);

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      fetchPosts(posts.length, true);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getMediaSrc = (post: EventPost): string | null => {
    if (!post.media || post.media.length === 0) return null;
    return post.media[0].media_url || post.media[0].media_preview || null;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0a0a0f] border border-white/10 rounded-2xl shadow-2xl w-[95%] md:w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-5 md:p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02] shrink-0">
              <div className="space-y-1">
                <span className="text-[10px] tracking-widest text-[#00e0c2] font-mono font-bold uppercase">
                  attendee content
                </span>
                <h3 className="text-lg font-display font-extrabold uppercase tracking-tight text-white flex items-center gap-2.5">
                  <ImageIcon className="w-5 h-5 text-[#00e0c2]" />
                  Event Posts
                  {total > 0 && (
                    <span className="text-xs font-mono font-bold text-white/30 normal-case">
                      ({total})
                    </span>
                  )}
                </h3>
                {eventTitle && (
                  <p className="text-xs text-white/40 font-mono truncate max-w-md">
                    {eventTitle}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-white/10 text-white/50 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-64 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-[#00e0c2]" />
                  <span className="text-xs font-mono uppercase tracking-wider text-white/30">
                    Loading posts...
                  </span>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center h-64 gap-3">
                  <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                    <X className="w-6 h-6 text-red-500" />
                  </div>
                  <p className="text-xs text-red-400 font-mono">{error}</p>
                </div>
              ) : posts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                  <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                    <ImageIcon className="w-7 h-7 text-white/20" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-sm font-display font-extrabold uppercase text-white/40">
                      No posts yet
                    </p>
                    <p className="text-xs text-white/25 font-mono">
                      Attendees haven&apos;t shared any posts for this event
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Posts Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {posts.map((post, idx) => {
                      const mediaSrc = getMediaSrc(post);
                      const isVideo = post.media?.[0]?.type === "video";
                      const isLiked = likedPosts.includes(post.id);

                      return (
                        <motion.div
                          key={post.id}
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(idx * 0.04, 0.5) }}
                          whileHover={{ y: -3 }}
                          className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden flex flex-col transition-all duration-200 hover:border-white/10 group cursor-pointer"
                          onClick={() => setSelectedPost(post)}
                        >
                          {/* Media */}
                          {mediaSrc ? (
                            <div className="aspect-square relative overflow-hidden bg-black/40">
                              <Image
                                src={mediaSrc}
                                alt={post.about || "Post"}
                                fill
                                className="object-cover transition-transform duration-500 group-hover:scale-105"
                                unoptimized
                              />
                              {isVideo && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                  <div className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center">
                                    <Play className="w-4 h-4 text-white ml-0.5" fill="white" />
                                  </div>
                                </div>
                              )}
                              {post.media.length > 1 && (
                                <div className="absolute top-2.5 right-2.5 bg-black/70 backdrop-blur-md text-[9px] font-mono font-bold px-2 py-0.5 rounded-md text-white/80 border border-white/10">
                                  +{post.media.length - 1}
                                </div>
                              )}
                              {/* NFT Badge */}
                              {post.is_nft && (
                                <div className="absolute top-2.5 left-2.5 bg-[#8b5cf6]/80 backdrop-blur-md text-[9px] font-mono font-bold px-2 py-0.5 rounded-md text-white border border-[#8b5cf6]/30 flex items-center gap-1">
                                  <Sparkles className="w-2.5 h-2.5" />
                                  cNFT
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="aspect-square bg-gradient-to-br from-white/[0.04] to-white/[0.01] flex items-center justify-center">
                              <MessageCircle className="w-8 h-8 text-white/10" />
                            </div>
                          )}

                          {/* Post Info */}
                          <div className="p-3.5 flex-1 flex flex-col">
                            {/* Author */}
                            <div className="flex items-center gap-2.5 mb-2.5">
                              <div className="w-7 h-7 rounded-full overflow-hidden border border-white/10 bg-white/5 flex items-center justify-center shrink-0">
                                {post.owner__avatar ? (
                                  <Image
                                    src={post.owner__avatar}
                                    alt={post.owner__username}
                                    width={28}
                                    height={28}
                                    className="object-cover w-full h-full"
                                    unoptimized
                                  />
                                ) : (
                                  <User className="w-3.5 h-3.5 text-white/30" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-display font-extrabold uppercase tracking-tight text-white truncate">
                                    {post.owner__username}
                                  </span>
                                  {post.owner__official && (
                                    <Shield className="w-3 h-3 text-[#00e0c2] shrink-0" />
                                  )}
                                  {post.owner__is_og && (
                                    <span className="text-[8px] font-mono font-bold text-[#8b5cf6] bg-[#8b5cf6]/10 px-1 py-0.5 rounded shrink-0">
                                      OG
                                    </span>
                                  )}
                                </div>
                                <span className="text-[9px] text-white/30 font-mono">
                                  {formatDate(post.create_at)}
                                </span>
                              </div>
                            </div>

                            {/* Caption */}
                            {post.about && (
                              <p className="text-[11px] text-white/60 leading-relaxed line-clamp-2 mb-3">
                                {post.about}
                              </p>
                            )}

                            {/* Stats Bar */}
                            <div className="mt-auto pt-2.5 border-t border-white/[0.04] flex items-center gap-3 text-[10px] font-mono font-bold text-white/35">
                              <span className={`flex items-center gap-1 ${isLiked ? "text-red-400" : ""}`}>
                                <Heart className="w-3 h-3" fill={isLiked ? "currentColor" : "none"} />
                                {post.count_likes}
                              </span>
                              {post.reputation_earned > 0 && (
                                <span className="flex items-center gap-1 text-[#00e0c2]/70">
                                  <Star className="w-3 h-3" />
                                  +{post.reputation_earned}
                                </span>
                              )}
                              {post.is_nft && (
                                <span className="flex items-center gap-1 text-[#8b5cf6]/70 ml-auto">
                                  <Award className="w-3 h-3" />
                                  {post.minted_count}/{post.total_supply}
                                </span>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Load More */}
                  {hasMore && (
                    <div className="flex justify-center mt-6">
                      <button
                        onClick={loadMore}
                        disabled={loadingMore}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 hover:border-[#00e0c2]/30 hover:bg-[#00e0c2]/5 text-white/60 hover:text-[#00e0c2] text-xs font-display font-extrabold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
                      >
                        {loadingMore ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3.5 h-3.5" />
                            Load More ({total - posts.length} remaining)
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer Stats */}
            {posts.length > 0 && (
              <div className="px-5 py-3 border-t border-white/5 flex items-center justify-between text-[9px] font-mono font-bold uppercase tracking-widest text-white/25 shrink-0 bg-white/[0.01]">
                <span>{posts.length} of {total} posts loaded</span>
                <span className="flex items-center gap-1.5">
                  <Heart className="w-2.5 h-2.5" />
                  {posts.reduce((sum, p) => sum + (p.count_likes || 0), 0)} total likes
                </span>
              </div>
            )}
          </motion.div>

          {/* Post Detail Overlay */}
          <AnimatePresence>
            {selectedPost && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
                onClick={() => setSelectedPost(null)}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-[#0c0c0f] border border-white/10 rounded-2xl shadow-2xl max-w-2xl w-[95%] max-h-[90vh] overflow-y-auto custom-scrollbar"
                >
                  {/* Detail Header */}
                  <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10 bg-white/5 flex items-center justify-center">
                        {selectedPost.owner__avatar ? (
                          <Image
                            src={selectedPost.owner__avatar}
                            alt={selectedPost.owner__username}
                            width={40}
                            height={40}
                            className="object-cover w-full h-full"
                            unoptimized
                          />
                        ) : (
                          <User className="w-5 h-5 text-white/30" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-display font-extrabold uppercase tracking-tight text-white">
                            {selectedPost.owner__username}
                          </span>
                          {selectedPost.owner__official && (
                            <Shield className="w-3.5 h-3.5 text-[#00e0c2]" />
                          )}
                          {selectedPost.owner__is_og && (
                            <span className="text-[8px] font-mono font-bold text-[#8b5cf6] bg-[#8b5cf6]/10 px-1.5 py-0.5 rounded">
                              OG #{selectedPost.owner__edition}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-white/35 font-mono">
                          {formatDate(selectedPost.create_at)}
                          {selectedPost.location && ` · ${selectedPost.location}`}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedPost(null)}
                      className="p-2 rounded-xl hover:bg-white/10 text-white/50 hover:text-white transition-all cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Detail Media */}
                  {selectedPost.media && selectedPost.media.length > 0 && (
                    <div className="relative">
                      {selectedPost.media.map((m, i) => {
                        const src = m.media_url || m.media_preview;
                        if (!src) return null;
                        if (m.type === "video") {
                          return (
                            <div key={m.id} className="relative aspect-square bg-black">
                              <video
                                src={src}
                                controls
                                className="w-full h-full object-contain"
                                preload="metadata"
                              />
                            </div>
                          );
                        }
                        return (
                          <div key={m.id} className={`relative ${i === 0 ? "aspect-square" : "aspect-video"} bg-black`}>
                            <Image
                              src={src}
                              alt={`Post media ${i + 1}`}
                              fill
                              className="object-contain"
                              unoptimized
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Detail Info */}
                  <div className="p-5 space-y-4">
                    {/* Caption */}
                    {selectedPost.about && (
                      <p className="text-sm text-white/70 leading-relaxed">
                        {selectedPost.about}
                      </p>
                    )}

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 text-center">
                        <div className="text-lg font-mono font-bold text-white">
                          {selectedPost.count_likes}
                        </div>
                        <div className="text-[9px] font-mono uppercase tracking-wider text-white/30 mt-0.5">
                          Likes
                        </div>
                      </div>
                      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 text-center">
                        <div className="text-lg font-mono font-bold text-[#00e0c2]">
                          +{selectedPost.reputation_earned}
                        </div>
                        <div className="text-[9px] font-mono uppercase tracking-wider text-white/30 mt-0.5">
                          Rep Earned
                        </div>
                      </div>
                      {selectedPost.is_nft && (
                        <>
                          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 text-center">
                            <div className="text-lg font-mono font-bold text-[#8b5cf6]">
                              {selectedPost.minted_count}/{selectedPost.total_supply}
                            </div>
                            <div className="text-[9px] font-mono uppercase tracking-wider text-white/30 mt-0.5">
                              Minted
                            </div>
                          </div>
                          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 text-center">
                            <div className="text-lg font-mono font-bold text-white">
                              {selectedPost.nft_price ? `${selectedPost.nft_price} SOL` : "Free"}
                            </div>
                            <div className="text-[9px] font-mono uppercase tracking-wider text-white/30 mt-0.5">
                              Price
                            </div>
                          </div>
                        </>
                      )}
                      {!selectedPost.is_nft && (
                        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 text-center">
                          <div className="text-lg font-mono font-bold text-white/50">
                            {selectedPost.media?.length || 0}
                          </div>
                          <div className="text-[9px] font-mono uppercase tracking-wider text-white/30 mt-0.5">
                            Media
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2">
                      {selectedPost.is_nft && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 text-[9px] font-mono font-bold text-[#8b5cf6] uppercase tracking-wider">
                          <Sparkles className="w-2.5 h-2.5" />
                          cNFT
                          {selectedPost.sold_out && " · Sold Out"}
                        </span>
                      )}
                      {selectedPost.owner_wallet && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[9px] font-mono text-white/40 uppercase tracking-wider">
                          {selectedPost.owner_wallet.slice(0, 4)}...{selectedPost.owner_wallet.slice(-4)}
                        </span>
                      )}
                      {selectedPost.owner__invited_count > 0 && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#00e0c2]/10 border border-[#00e0c2]/20 text-[9px] font-mono font-bold text-[#00e0c2] uppercase tracking-wider">
                          {selectedPost.owner__invited_count} invited
                        </span>
                      )}
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-mono font-bold uppercase tracking-wider ${
                        selectedPost.moderation_status === "approved"
                          ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-500"
                          : selectedPost.moderation_status === "pending"
                          ? "bg-amber-500/10 border border-amber-500/20 text-amber-500"
                          : "bg-white/5 border border-white/10 text-white/40"
                      }`}>
                        {selectedPost.moderation_status}
                      </span>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
