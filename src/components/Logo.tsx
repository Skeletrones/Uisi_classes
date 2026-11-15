export function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="logo-mark"
    >
      <rect width="64" height="64" rx="18" fill="url(#logo-bg)" />
      <rect x="13" y="16" width="38" height="35" rx="9" fill="#0f1115" fillOpacity="0.22" />
      <rect x="13" y="16" width="38" height="35" rx="9" stroke="white" strokeOpacity="0.9" strokeWidth="2.4" />
      <path d="M13 27H51" stroke="white" strokeOpacity="0.9" strokeWidth="2.4" />
      <path d="M22 12V20M42 12V20" stroke="white" strokeOpacity="0.9" strokeWidth="2.8" strokeLinecap="round" />
      <rect x="20" y="33" width="7" height="7" rx="2" fill="white" fillOpacity="0.95" />
      <rect x="30" y="33" width="7" height="7" rx="2" fill="white" fillOpacity="0.55" />
      <rect x="40" y="33" width="4" height="7" rx="2" fill="white" fillOpacity="0.35" />
      <defs>
        <linearGradient id="logo-bg" x1="6" y1="2" x2="58" y2="62" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6D8CFF" />
          <stop offset="0.55" stopColor="#8B6CFF" />
          <stop offset="1" stopColor="#38C9A0" />
        </linearGradient>
      </defs>
    </svg>
  );
}
