export function Spinner({ className = "size-4" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`spinner inline-block shrink-0 rounded-full ${className}`}
    />
  );
}

export function CuteLoader({
  label = "Loading…",
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 ${className}`}
      role="status"
    >
      <svg
        aria-hidden
        className="cute-loader"
        height="72"
        viewBox="0 0 72 72"
        width="72"
      >
        <g className="cute-loader-sparkles">
          <circle cx="12" cy="18" r="2" fill="#f7cdd8" />
          <circle cx="60" cy="24" r="1.6" fill="#f2a8bb" />
          <circle cx="18" cy="56" r="1.4" fill="#ffd7e1" />
          <circle cx="56" cy="54" r="2.2" fill="#f7cdd8" />
        </g>
        <g className="cute-loader-blossom">
          <g transform="translate(36 36)">
            {[0, 72, 144, 216, 288].map((angle) => (
              <ellipse
                key={angle}
                cx="0"
                cy="-13"
                fill="#e4879f"
                rx="7.5"
                ry="10"
                transform={`rotate(${angle})`}
              />
            ))}
            <circle cx="0" cy="0" r="5" fill="#fff3f6" />
            <circle cx="0" cy="0" r="2.4" fill="#cf5f80" />
          </g>
        </g>
        <g className="cute-loader-face" transform="translate(36 36)">
          <circle cx="-2.2" cy="-0.6" r="0.9" fill="#cf5f80" />
          <circle cx="2.2" cy="-0.6" r="0.9" fill="#cf5f80" />
        </g>
      </svg>
      <p className="text-sm text-[var(--muted)]">{label}</p>
    </div>
  );
}
