/* ================================================================== */
/*  AtlasLogo — circular Zeus mark used as the app logo                */
/* ================================================================== */

export function AtlasLogo({
  size = 44,
  className = "",
  ring = false,
}: {
  size?: number;
  className?: string;
  ring?: boolean;
}) {
  return (
    <img
      src="/icons/icon-192.png?v=5"
      alt="Atlas logo"
      width={size}
      height={size}
      className={`shrink-0 rounded-full object-cover ${
        ring ? "ring-2 ring-wine/35" : ""
      } ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

export default AtlasLogo;
