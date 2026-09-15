// Shown by Next.js while a route segment is loading (loading.tsx files) and by
// any client component doing its own fetch. `fullScreen` covers the viewport
// for top-level route loads; nested loads (admin/dashboard content areas)
// leave that off since the surrounding layout already has its own background.
export default function PageLoading({ fullScreen = false }: { fullScreen?: boolean }) {
  return (
    <div
      className={
        fullScreen
          ? "min-h-screen flex items-center justify-center bg-[#0a0f1a]"
          : "flex items-center justify-center py-24"
      }
    >
      <svg
        className="animate-spin h-8 w-8 text-[#F59E0B]"
        fill="none"
        viewBox="0 0 24 24"
        role="status"
        aria-label="Loading"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
    </div>
  );
}
