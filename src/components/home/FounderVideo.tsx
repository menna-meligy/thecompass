"use client";

import { useState } from "react";
import { Play } from "lucide-react";

/**
 * The founder's message, presented as a proper poster rather than an empty box.
 *
 * A bare Google Drive `/preview` iframe renders nothing until it is clicked —
 * no frame, no cover, just a dark rectangle where the video should be. This
 * shows a real frame from the video (self-hosted, so it doesn't depend on Drive
 * being reachable) under a titled scrim, and only mounts the iframe once the
 * viewer asks for it. That also means the page isn't loading a third-party
 * player for everyone who never presses play.
 */

interface Props {
  /** Google Drive file id of the video. */
  fileId: string;
  isRtl: boolean;
  name: string;
  role: string;
  /** Small label above the name, e.g. "كلمة من المؤسِّسة". */
  eyebrow: string;
}

const ACCENT = "#F59E0B";

export default function FounderVideo({ fileId, isRtl, name, role, eyebrow }: Props) {
  const [playing, setPlaying] = useState(false);
  const [posterFailed, setPosterFailed] = useState(false);

  const frame = {
    aspectRatio: "9 / 16",
    borderRadius: "16px",
    overflow: "hidden",
    position: "relative" as const,
    background: "linear-gradient(160deg, #101b2f 0%, #0b1220 100%)",
    border: "1px solid rgba(245,158,11,0.18)",
    boxShadow: "0 18px 48px rgba(0,0,0,0.45)",
  };

  if (playing) {
    return (
      <div style={frame}>
        {/* The poster stays underneath. If Drive is slow, blocked by an
            extension, or refuses to embed, the viewer sees the cover instead
            of a black rectangle. */}
        {!posterFailed && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src="/founder-video-cover.jpg"
            alt=""
            aria-hidden
            onError={() => setPosterFailed(true)}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
        )}
        <iframe
          src={`https://drive.google.com/file/d/${fileId}/preview`}
          title={name}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
        />
        {/* Last resort if the embed never paints. */}
        <a
          href={`https://drive.google.com/file/d/${fileId}/view`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            position: "absolute",
            insetInlineEnd: "10px",
            bottom: "10px",
            fontSize: "0.7rem",
            fontWeight: 700,
            color: "#0f172a",
            background: "rgba(245,158,11,0.92)",
            borderRadius: "999px",
            padding: "5px 12px",
            textDecoration: "none",
          }}
        >
          {isRtl ? "افتح الفيديو" : "Open video"}
        </a>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      aria-label={isRtl ? `شغّل فيديو ${name}` : `Play video from ${name}`}
      className="group"
      style={{ ...frame, width: "100%", padding: 0, cursor: "pointer", display: "block", textAlign: isRtl ? "right" : "left" }}
    >
      {!posterFailed ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src="/founder-video-cover.jpg"
          alt=""
          onError={() => setPosterFailed(true)}
          className="transition-transform duration-500 group-hover:scale-[1.03]"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        /* If even the local poster is missing, show something branded rather
           than a blank rectangle. */
        <span
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 50% 38%, rgba(245,158,11,0.18) 0%, rgba(245,158,11,0) 62%)",
          }}
        />
      )}

      {/* Scrim: keeps the label legible over any frame */}
      <span
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to top, rgba(6,11,20,0.94) 0%, rgba(6,11,20,0.45) 34%, rgba(6,11,20,0.10) 62%, rgba(6,11,20,0.35) 100%)",
        }}
      />

      {/* Play control */}
      <span
        aria-hidden
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "78px",
          height: "78px",
          borderRadius: "50%",
          background: "rgba(245,158,11,0.94)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 10px 34px rgba(245,158,11,0.45)",
        }}
        className="transition-transform duration-300 group-hover:scale-110"
      >
        <Play className="h-8 w-8" style={{ color: "#0f172a", marginInlineStart: "4px" }} fill="#0f172a" />
      </span>

      {/* Caption */}
      <span
        style={{
          position: "absolute",
          insetInline: 0,
          bottom: 0,
          padding: "22px 24px",
          display: "block",
        }}
      >
        <span
          style={{
            display: "inline-block",
            fontSize: "0.62rem",
            fontWeight: 900,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: ACCENT,
            background: "rgba(245,158,11,0.12)",
            border: "1px solid rgba(245,158,11,0.32)",
            borderRadius: "999px",
            padding: "4px 12px",
            marginBottom: "10px",
          }}
        >
          {eyebrow}
        </span>
        <span style={{ display: "block", color: "#fff", fontWeight: 900, fontSize: "1.05rem", lineHeight: 1.3 }}>
          {name}
        </span>
        <span style={{ display: "block", color: "rgba(255,255,255,0.58)", fontSize: "0.82rem", marginTop: "2px" }}>
          {role}
        </span>
      </span>
    </button>
  );
}
