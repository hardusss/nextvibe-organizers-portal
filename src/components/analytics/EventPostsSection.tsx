"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import {
  Loader2, Image as ImageIcon, Heart, Star, Award,
  User, MessageCircle, Play, ChevronDown,
  Sparkles, Shield, X, RotateCw
} from "lucide-react";
import { getEventPosts, type EventPost, type EventPostsResponse } from "@/src/api/events";

interface EventPostsSectionProps {
  postId: number | null;
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
};

export default function EventPostsSection({ postId }: EventPostsSectionProps) {
  const [posts, setPosts] = useState<EventPost[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [likedPosts, setLikedPosts] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedPost, setSelectedPost] = useState<EventPost | null>(null);

  const fetchPosts = useCallback(async (index: number = 0, append: boolean = false) => {
    if (!postId) return;

    if (append) {
      setLoadingMore(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const data: EventPostsResponse = await getEventPosts(postId, index, 20);
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
      setError(err instanceof Error ? err.message : "Failed to load posts.");
    } finally {
      setIsLoading(false);
      setLoadingMore(false);
    }
  }, [postId]);

  useEffect(() => {
    if (postId) {
      setPosts([]);
      setSelectedPost(null);
      fetchPosts(0);
    }
  }, [postId, fetchPosts]);

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

  return (
    <>
      <motion.div
        variants={item}
        className="premium-card p-5 md:p-6 shadow-sm backdrop-blur-md"
      >
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h2 className="text-lg font-display font-extrabold uppercase text-foreground tracking-tight flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-[#8b5cf6]" />
              Event Posts
              {total > 0 && (
                <span className="text-xs font-mono font-bold text-foreground/30 normal-case ml-1">
                  ({total})
                </span>
              )}
            </h2>
            <p className="text-foreground/45 text-xs">
              User-generated content shared during this event
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => fetchPosts(0)}
              disabled={isLoading}
              className="px-3.5 py-1.5 rounded-xl border border-foreground/10 hover:border-[#8b5cf6]/30 hover:bg-[#8b5cf6]/5 text-foreground/75 hover:text-[#8b5cf6] transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2 text-xs font-display font-bold uppercase tracking-wider"
              title="Reload posts"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              Reload
            </button>
            {posts.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-foreground/5 border border-foreground/10">
                <Heart className="w-3 h-3 text-red-400" />
                <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-foreground/50">
                  {posts.reduce((sum, p) => sum + (p.count_likes || 0), 0)} total likes
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <Loader2 className="w-7 h-7 animate-spin text-[#8b5cf6]" />
            <span className="text-xs font-mono uppercase tracking-wider text-foreground/30">
              Loading posts…
            </span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <X className="w-5 h-5 text-red-500" />
            </div>
            <p className="text-xs text-red-400 font-mono">{error}</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-4">
            <div className="w-14 h-14 rounded-full bg-foreground/5 border border-foreground/10 flex items-center justify-center">
              <ImageIcon className="w-6 h-6 text-foreground/15" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-display font-extrabold uppercase text-foreground/35">
                No posts yet
              </p>
              <p className="text-xs text-foreground/20 font-mono">
                Attendees haven&apos;t shared any posts for this event
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Posts Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
                    className="bg-foreground/[0.02] border border-foreground/[0.06] rounded-xl overflow-hidden flex flex-col transition-all duration-200 hover:bg-foreground/[0.04] hover:border-foreground/10 group cursor-pointer"
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
                            <div className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-foreground/20 flex items-center justify-center">
                              <Play className="w-4 h-4 text-foreground ml-0.5" fill="white" />
                            </div>
                          </div>
                        )}
                        {post.media.length > 1 && (
                          <div className="absolute top-2.5 right-2.5 bg-black/70 backdrop-blur-md text-[9px] font-mono font-bold px-2 py-0.5 rounded-md text-foreground/80 border border-foreground/10">
                            +{post.media.length - 1}
                          </div>
                        )}
                        {post.is_nft && (
                          <div className="absolute top-2.5 left-2.5 bg-[#8b5cf6]/80 backdrop-blur-md text-[9px] font-mono font-bold px-2 py-0.5 rounded-md text-foreground border border-[#8b5cf6]/30 flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5" />
                            cNFT
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="aspect-square bg-gradient-to-br from-white/[0.04] to-transparent flex items-center justify-center">
                        <MessageCircle className="w-8 h-8 text-foreground/10" />
                      </div>
                    )}

                    {/* Post Info */}
                    <div className="p-3 flex-1 flex flex-col">
                      {/* Author */}
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full overflow-hidden border border-foreground/10 bg-foreground/5 flex items-center justify-center shrink-0">
                          {post.owner__avatar ? (
                            <Image
                              src={post.owner__avatar}
                              alt={post.owner__username}
                              width={24}
                              height={24}
                              className="object-cover w-full h-full"
                              unoptimized
                            />
                          ) : (
                            <User className="w-3 h-3 text-foreground/30" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] font-display font-extrabold uppercase tracking-tight text-foreground truncate">
                              {post.owner__username}
                            </span>
                            {post.owner__official && (
                              <Shield className="w-2.5 h-2.5 text-[var(--accent-primary)] shrink-0" />
                            )}
                            {post.owner__is_og && (
                              <span className="text-[7px] font-mono font-bold text-[#8b5cf6] bg-[#8b5cf6]/10 px-1 py-0.5 rounded shrink-0">
                                OG
                              </span>
                            )}
                          </div>
                          <span className="text-[9px] text-foreground/30 font-mono">
                            {formatDate(post.create_at)}
                          </span>
                        </div>
                      </div>

                      {/* Caption */}
                      {post.about && (
                        <p className="text-[10px] text-foreground/50 leading-relaxed line-clamp-2 mb-2">
                          {post.about}
                        </p>
                      )}

                      {/* Stats Bar */}
                      <div className="mt-auto pt-2 border-t border-foreground/[0.04] flex items-center gap-3 text-[9px] font-mono font-bold text-foreground/30">
                        <span className={`flex items-center gap-1 ${isLiked ? "text-red-400" : ""}`}>
                          <Heart className="w-2.5 h-2.5" fill={isLiked ? "currentColor" : "none"} />
                          {post.count_likes}
                        </span>
                        {post.reputation_earned > 0 && (
                          <span className="flex items-center gap-1 text-[var(--accent-primary)]/60">
                            <Star className="w-2.5 h-2.5" />
                            +{post.reputation_earned}
                          </span>
                        )}
                        {post.is_nft && (
                          <span className="flex items-center gap-1 text-[#8b5cf6]/60 ml-auto">
                            <Award className="w-2.5 h-2.5" />
                            {post.total_supply - post.minted_count} left
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
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-foreground/10 hover:border-[#8b5cf6]/30 hover:bg-[#8b5cf6]/5 text-foreground/50 hover:text-[#8b5cf6] text-xs font-display font-extrabold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Loading…
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3.5 h-3.5" />
                      Load more ({total - posts.length} more)
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </motion.div>

      {/* Post Detail Overlay */}
      {selectedPost && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
          onClick={() => setSelectedPost(null)}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0c0c0f] border border-foreground/10 rounded-2xl shadow-2xl max-w-2xl w-[95%] max-h-[90vh] overflow-y-auto custom-scrollbar"
          >
            {/* Detail Header */}
            <div className="p-4 border-b border-foreground/5 flex items-center justify-between bg-foreground/[0.02]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden border border-foreground/10 bg-foreground/5 flex items-center justify-center">
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
                    <User className="w-5 h-5 text-foreground/30" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-display font-extrabold uppercase tracking-tight text-foreground">
                      {selectedPost.owner__username}
                    </span>
                    {selectedPost.owner__official && (
                      <Shield className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                    )}
                    {selectedPost.owner__is_og && (
                      <span className="text-[8px] font-mono font-bold text-[#8b5cf6] bg-[#8b5cf6]/10 px-1.5 py-0.5 rounded">
                        OG #{selectedPost.owner__edition}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-foreground/35 font-mono">
                    {formatDate(selectedPost.create_at)}
                    {selectedPost.location && ` · ${selectedPost.location}`}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedPost(null)}
                className="p-2 rounded-xl hover:bg-foreground/10 text-foreground/50 hover:text-foreground transition-all cursor-pointer"
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
              {selectedPost.about && (
                <p className="text-sm text-foreground/70 leading-relaxed">
                  {selectedPost.about}
                </p>
              )}

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-foreground/[0.03] border border-foreground/[0.06] rounded-xl p-3 text-center">
                  <div className="text-lg font-mono font-bold text-foreground">
                    {selectedPost.count_likes}
                  </div>
                  <div className="text-[9px] font-mono uppercase tracking-wider text-foreground/30 mt-0.5">
                    Likes
                  </div>
                </div>
                <div className="bg-foreground/[0.03] border border-foreground/[0.06] rounded-xl p-3 text-center">
                  <div className="text-lg font-mono font-bold text-[var(--accent-primary)]">
                    +{selectedPost.reputation_earned}
                  </div>
                  <div className="text-[9px] font-mono uppercase tracking-wider text-foreground/30 mt-0.5">
                    REP
                  </div>
                </div>
                {selectedPost.is_nft && (
                  <>
                    <div className="bg-foreground/[0.03] border border-foreground/[0.06] rounded-xl p-3 text-center">
                      <div className="text-lg font-mono font-bold text-[#8b5cf6]">
                        {selectedPost.total_supply - selectedPost.minted_count} left
                      </div>
                      <div className="text-[9px] font-mono uppercase tracking-wider text-foreground/30 mt-0.5">
                        Editions
                      </div>
                    </div>
                    <div className="bg-foreground/[0.03] border border-foreground/[0.06] rounded-xl p-3 text-center">
                      <div className="text-lg font-mono font-bold text-foreground">
                        {selectedPost.nft_price ? `${selectedPost.nft_price} SOL` : "Free"}
                      </div>
                      <div className="text-[9px] font-mono uppercase tracking-wider text-foreground/30 mt-0.5">
                        Price
                      </div>
                    </div>
                  </>
                )}
                {!selectedPost.is_nft && (
                  <div className="bg-foreground/[0.03] border border-foreground/[0.06] rounded-xl p-3 text-center">
                    <div className="text-lg font-mono font-bold text-foreground/50">
                      {selectedPost.media?.length || 0}
                    </div>
                    <div className="text-[9px] font-mono uppercase tracking-wider text-foreground/30 mt-0.5">
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
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-foreground/5 border border-foreground/10 text-[9px] font-mono text-foreground/40 uppercase tracking-wider">
                    {selectedPost.owner_wallet.slice(0, 4)}…{selectedPost.owner_wallet.slice(-4)}
                  </span>
                )}
                {selectedPost.owner__invited_count > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 text-[9px] font-mono font-bold text-[var(--accent-primary)] uppercase tracking-wider">
                    {selectedPost.owner__invited_count} invited
                  </span>
                )}
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-mono font-bold uppercase tracking-wider ${
                  selectedPost.moderation_status === "approved"
                    ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-500"
                    : selectedPost.moderation_status === "pending"
                    ? "bg-amber-500/10 border border-amber-500/20 text-amber-500"
                    : "bg-foreground/5 border border-foreground/10 text-foreground/40"
                }`}>
                  {selectedPost.moderation_status}
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
