"use client";

interface VideoPlayerProps {
  videoUrl: string;
  title: string;
}

export function VideoPlayer({ videoUrl, title }: VideoPlayerProps) {
  // Handle YouTube URLs
  const isYoutube = videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be");
  const isEmbed = videoUrl.includes("/embed/");

  let embedUrl = videoUrl;
  if (isYoutube && !isEmbed) {
    const videoId = videoUrl.match(/(?:v=|youtu\.be\/)([^&\n?#]+)/)?.[1];
    if (videoId) {
      embedUrl = `https://www.youtube.com/embed/${videoId}`;
    }
  }

  if (isYoutube || isEmbed) {
    return (
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black">
        <iframe
          src={embedUrl}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
        />
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black">
      <video
        src={videoUrl}
        controls
        className="absolute inset-0 w-full h-full"
        title={title}
      />
    </div>
  );
}

export default VideoPlayer;
