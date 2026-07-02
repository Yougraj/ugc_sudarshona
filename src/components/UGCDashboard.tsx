"use client";

import React, { useState, useEffect, useMemo } from "react";
import { UGCItem } from "@/app/page";

interface UGCDashboardProps {
  initialItems: UGCItem[];
}

const CUTE_GREETINGS = [
  "Hello cutie! Hope you have a wonderful day! Sudarshona sends you virtual sparkles! 🌸✨",
  "Hi sweetie! Welcome to ugc_sudarshona! Let's find your dream lip glow! 🎀💕",
  "Yay, you're here! Let's explore some beautiful glossy reviews together! 🌸💖",
  "Hello gorgeous! May your day be as shiny as Petal Glow Lip Oil! ✨🌸",
  "Sending you warm fluffy vibes and lots of cosmetic love! 💌💖",
  "Hey princess! Have a super sparkling, happy day! 🎀✨",
  "Welcome darling! You look absolutely beautiful today, never forget it! 💕🌸",
];

export default function UGCDashboard({ initialItems }: UGCDashboardProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [selectedItem, setSelectedItem] = useState<UGCItem | null>(null);

  // Cute Greeting States - Stable defaults for server rendering
  const [stickerNum, setStickerNum] = useState(1);
  const [greetingText, setGreetingText] = useState(CUTE_GREETINGS[0]);

  const rollGreeting = () => {
    const randomSticker = Math.floor(Math.random() * 7) + 1; // 1 to 7
    const randomMsg =
      CUTE_GREETINGS[Math.floor(Math.random() * CUTE_GREETINGS.length)];
    setStickerNum(randomSticker);
    setGreetingText(randomMsg);
  };

  // Roll randomly on the client after hydration
  useEffect(() => {
    rollGreeting();
  }, []);

  // Computations for Stats Dashboard (Likes count is removed)
  const stats = useMemo(() => {
    const total = initialItems.length;
    if (total === 0) {
      return { total: 0, avgRating: "0.0" };
    }

    const ratingSum = initialItems.reduce(
      (sum, item) => sum + (item.rating || 0),
      0,
    );
    const avgRating = (ratingSum / total).toFixed(1);

    return { total, avgRating };
  }, [initialItems]);

  // Filtered and Sorted Items (Restricted to Instagram and YouTube)
  const filteredAndSortedItems = useMemo(() => {
    return initialItems
      .filter((item) => {
        // Only keep instagram and youtube
        if (item.platform !== "instagram" && item.platform !== "youtube") {
          return false;
        }

        // Search Filter
        const matchesSearch =
          item.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.userHandle.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (item.tags &&
            item.tags.some((tag) =>
              tag.toLowerCase().includes(searchTerm.toLowerCase()),
            ));

        // Platform Filter
        const matchesPlatform =
          platformFilter === "all" || item.platform === platformFilter;

        return matchesSearch && matchesPlatform;
      })
      .sort((a, b) => {
        if (sortBy === "newest") {
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        }
        if (sortBy === "rating") {
          return (b.rating || 0) - (a.rating || 0);
        }
        return 0;
      });
  }, [initialItems, searchTerm, platformFilter, sortBy]);

  // Render SVG Stars
  const renderStars = (rating: number = 5) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <svg
          key={i}
          className="girly-star-icon"
          fill={i <= rating ? "#ffb703" : "none"}
          stroke="#ffb703"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.907c.961 0 1.36 1.252.586 1.813l-3.974 2.856a1 1 0 00-.364 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.856a1 1 0 00-1.176 0l-3.976 2.856c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.364-1.118L2.05 9.404c-.775-.56-.375-1.813.586-1.813h4.907a1 1 0 00.95-.69l1.519-4.674z"
          />
        </svg>,
      );
    }
    return stars;
  };

  // Get Platform Icon SVG
  const getPlatformIcon = (platform: string) => {
    if (platform === "instagram") {
      return (
        <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
        </svg>
      );
    } else if (platform === "youtube") {
      return (
        <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
          <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.525 3.545 12 3.545 12 3.545s-7.525 0-9.388.508a3.003 3.003 0 0 0-2.11 2.11C0 8.022 0 12 0 12s0 3.978.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.862.508 9.388.508 9.388.508s7.525 0 9.388-.508a3.003 3.003 0 0 0 2.11-2.11C24 15.978 24 12 24 12s0-3.978-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      );
    }
    return null;
  };

  return (
    <div className="phone-frame">
      {/* Decorative Floating Hearts & Sparkles */}
      <span
        className="girly-decor"
        style={{ top: "12%", left: "4%", animationDelay: "0s" }}
      >
        🌸
      </span>
      <span
        className="girly-decor"
        style={{ top: "24%", right: "7%", animationDelay: "1.2s" }}
      >
        💖
      </span>
      <span
        className="girly-decor"
        style={{ top: "55%", left: "5%", animationDelay: "0.6s" }}
      >
        ✨
      </span>
      <span
        className="girly-decor"
        style={{ top: "78%", right: "5%", animationDelay: "2s" }}
      >
        🎀
      </span>

      {/* Header */}
      <header className="girly-header">
        <div className="girly-logo" style={{ textTransform: "lowercase" }}>
          <span>🌸</span> ugc_sudarshona
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span style={{ fontSize: "18px", animation: "float 2s infinite" }}>
            🧸
          </span>
        </div>
      </header>

      {/* Cute Sticker Greeting Section */}
      <section
        style={{
          margin: "16px 16px 8px",
          padding: "16px",
          background: "linear-gradient(135deg, #fff5f6 0%, #ffe9ec 100%)",
          border: "2px dashed #ffb3c6",
          borderRadius: "24px",
          display: "flex",
          alignItems: "center",
          gap: "16px",
          boxShadow: "var(--shadow-sm)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Cute Animated Sticker */}
        <div
          style={{
            width: "74px",
            height: "74px",
            flexShrink: 0,
            background: "#ffffff",
            borderRadius: "20px",
            padding: "4px",
            border: "1.5px solid #ffe5ec",
            boxShadow: "0 4px 10px rgba(255, 117, 143, 0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation: "float 3s ease-in-out infinite",
          }}
        >
          <img
            src={`/sticker/${stickerNum}.webp`}
            alt="cute sticker"
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        </div>

        {/* Bubble Speech Area */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <p
            style={{
              fontSize: "12.5px",
              color: "#7a4f5a",
              fontWeight: 600,
              lineHeight: "1.4",
              position: "relative",
            }}
          >
            {greetingText}
          </p>
          <button
            onClick={rollGreeting}
            style={{
              alignSelf: "flex-start",
              background: "#ffffff",
              border: "1.5px solid #ff758f",
              color: "#ff758f",
              padding: "3px 10px",
              borderRadius: "99px",
              fontSize: "10px",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 2px 4px rgba(255,117,143,0.05)",
              transition: "transform 0.1s",
            }}
            onMouseDown={(e) =>
              (e.currentTarget.style.transform = "scale(0.95)")
            }
            onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            Poke me! 🌸✨
          </button>
        </div>
      </section>

      {/* Hero Section */}
      <section className="girly-hero" style={{ padding: "16px 20px 14px" }}>
        <h1
          className="girly-title"
          style={{ fontSize: "24px", textTransform: "lowercase" }}
        >
          ugc_sudarshona
        </h1>
        <p className="girly-subtitle">
          Explore magical lip oil vibes shared by cosmetics lovers! 💕 Select
          your favorite channel to view.
        </p>
      </section>

      {/* Stats Ribbon (Likes count removed, only 2 metrics: Reviews and Avg Rating) */}
      <section
        className="girly-stats-ribbon"
        style={{
          gridTemplateColumns: "repeat(2, 1fr)",
          margin: "0 16px 16px",
          borderRadius: "18px",
          border: "1.5px solid var(--border-color)",
        }}
      >
        <div
          className="girly-stat-item"
          style={{ borderRight: "1.5px solid var(--border-color)" }}
        >
          <span className="girly-stat-value">🧸 {stats.total}</span>
          <span className="girly-stat-label">UGC Reviews</span>
        </div>
        <div className="girly-stat-item">
          <span className="girly-stat-value">⭐ {stats.avgRating}</span>
          <span className="girly-stat-label">Rating Vibe</span>
        </div>
      </section>

      {/* Filters and Search Section */}
      <section className="girly-controls" style={{ marginTop: "4px" }}>
        {/* Search */}
        <div className="girly-search">
          <span className="girly-search-icon">🌸</span>
          <input
            type="text"
            placeholder="Search matching shades or tags..."
            className="girly-search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Platform Filters - Restricted to Instagram and YouTube */}
        <div className="girly-filters">
          {["all", "instagram", "youtube"].map((plat) => (
            <button
              key={plat}
              className={`girly-filter-btn ${platformFilter === plat ? "active" : ""}`}
              onClick={() => setPlatformFilter(plat)}
            >
              {plat.charAt(0).toUpperCase() + plat.slice(1)}
            </button>
          ))}
        </div>

        {/* Sorting Dropdown (Likes removed) */}
        <div>
          <select
            className="girly-sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="newest">⏰ Date Added</option>
            <option value="rating">✨ High Rating Vibe</option>
          </select>
        </div>
      </section>

      {/* UGC Cards Feed */}
      {filteredAndSortedItems.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: "32px", marginBottom: "8px" }}>🧸</div>
          <h3
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--accent-pink)",
              marginBottom: "4px",
            }}
          >
            No posts found
          </h3>
          <p style={{ fontSize: "12px" }}>
            Add some reviews with the python script cutely! 🌸
          </p>
        </div>
      ) : (
        <div className="girly-feed">
          {filteredAndSortedItems.map((item) => (
            <div
              key={item._id}
              className="girly-card"
              onClick={() => setSelectedItem(item)}
              style={{ cursor: "pointer" }}
            >
              {item.mediaUrl ? (
                <div className="girly-card-media" style={{ borderBottom: "none", borderRadius: "22px" }}>
                  <img
                    src={item.mediaUrl}
                    alt={item.username}
                    className="girly-card-img"
                  />
                  <div className="girly-card-hover-overlay">
                    <span className="girly-card-hover-icon">💖</span>
                  </div>
                  <span className={`girly-platform-badge ${item.platform}`}>
                    {getPlatformIcon(item.platform)} {item.platform}
                  </span>
                </div>
              ) : (
                <div
                  className="girly-card-media"
                  style={{
                    borderBottom: "none",
                    borderRadius: "22px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    padding: "16px",
                    background: "var(--bg-surface)",
                    color: "var(--accent-pink)",
                    textAlign: "center",
                    aspectRatio: "1/1",
                    position: "relative"
                  }}
                >
                  <span className={`girly-platform-badge ${item.platform}`}>
                    {getPlatformIcon(item.platform)} {item.platform}
                  </span>
                  <div style={{ fontSize: "36px", marginBottom: "8px" }}>🧸</div>
                  <strong style={{ fontSize: "13px" }}>{item.productName}</strong>
                  <div className="girly-card-hover-overlay">
                    <span className="girly-card-hover-icon">💖</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Footer (Credit to sudarshona gogoi) */}
      <footer className="girly-footer">
        <p
          style={{
            fontFamily: "var(--font-display)",
            color: "var(--accent-pink)",
            marginBottom: "4px",
            textTransform: "lowercase",
          }}
        >
          🌸 ugc_sudarshona 🌸
        </p>
      </footer>

      {/* UGC Item Detail Modal */}
      {selectedItem && (
        <div
          className="girly-modal-overlay"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="girly-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="girly-modal-close"
              onClick={() => setSelectedItem(null)}
            >
              ✕
            </button>

            {/* Modal Media */}
            <div
              className="girly-modal-media"
              style={{
                background: selectedItem.mediaUrl
                  ? "#fff"
                  : "var(--bg-surface)",
              }}
            >
              {selectedItem.mediaUrl ? (
                <img src={selectedItem.mediaUrl} alt={selectedItem.username} />
              ) : (
                <div
                  style={{ textAlign: "center", color: "var(--accent-pink)" }}
                >
                  <div style={{ fontSize: "44px", marginBottom: "8px" }}>
                    🧸
                  </div>
                  <p>Text-only review post</p>
                </div>
              )}
            </div>

            {/* Modal Details */}
            <div className="girly-modal-details">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  className={`girly-platform-badge ${selectedItem.platform}`}
                  style={{ position: "static" }}
                >
                  {getPlatformIcon(selectedItem.platform)}{" "}
                  {selectedItem.platform}
                </span>
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  Product: <strong>{selectedItem.productName}</strong>
                </span>
              </div>

              <a
                href="https://www.instagram.com/ugc_sudarshona"
                target="_blank"
                rel="noopener noreferrer"
                className="girly-card-header"
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <div
                  className="girly-avatar"
                  style={{ width: "40px", height: "40px", fontSize: "15px" }}
                >
                  {selectedItem.username.charAt(0)}
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span className="girly-username" style={{ fontSize: "14px" }}>
                    {selectedItem.username}
                  </span>
                  <span
                    className="girly-handle"
                    style={{
                      fontSize: "11px",
                      color: "var(--accent-pink)",
                      textDecoration: "underline",
                    }}
                  >
                    {selectedItem.userHandle}
                  </span>
                </div>
              </a>

              <div className="girly-stars">
                {renderStars(selectedItem.rating)}
              </div>

              <p
                style={{
                  fontSize: "13.5px",
                  color: "var(--text-primary)",
                  lineHeight: "1.5",
                  whiteSpace: "pre-wrap",
                }}
              >
                {selectedItem.content}
              </p>

              {selectedItem.tags && selectedItem.tags.length > 0 && (
                <div className="girly-tags">
                  {selectedItem.tags.map((tag) => (
                    <span
                      key={tag}
                      className="girly-tag"
                      style={{ fontSize: "10px", padding: "3px 8px" }}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Modal footer (Likes completely removed) */}
              <div className="girly-card-footer" style={{ marginTop: "8px" }}>
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  Posted on{" "}
                  {new Date(selectedItem.createdAt).toLocaleDateString(
                    undefined,
                    {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    },
                  )}
                </span>

                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {selectedItem.postUrl && (
                    <a
                      href={selectedItem.postUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="girly-shop-btn"
                      style={{
                        background: "none",
                        border: "1.5px solid var(--accent-pink)",
                        color: "var(--accent-pink)",
                        boxShadow: "none",
                        padding: "8px 16px",
                        fontSize: "12px",
                      }}
                    >
                      {selectedItem.platform === "instagram"
                        ? "Review on Instagram 📸💕"
                        : "Review on YouTube 🎥✨"}
                    </a>
                  )}
                  {selectedItem.buyUrls && selectedItem.buyUrls.length > 0 ? (
                    selectedItem.buyUrls.map((link, idx) => (
                      <a
                        key={idx}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="girly-shop-btn"
                        style={{ padding: "9px 18px", fontSize: "12px" }}
                      >
                        Buy on {link.name} 🛒
                      </a>
                    ))
                  ) : (
                    selectedItem.buyUrl && (
                      <a
                        href={selectedItem.buyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="girly-shop-btn"
                        style={{ padding: "9px 18px", fontSize: "12px" }}
                      >
                        Buy Product 🛒
                      </a>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
