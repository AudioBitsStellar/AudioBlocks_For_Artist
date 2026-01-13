export default function MusicLoader({ small = false }) {
  return (
    <div className={`flex items-end justify-center gap-1 ${small ? "h-4" : "h-8"}`}>
      {[...Array(4)].map((_, i) => (
        <span
          key={i}
          className="w-1 bg-white rounded-sm animate-music-fast"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}
