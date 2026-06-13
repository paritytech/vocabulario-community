/** Brand mark — two concentric accent rings around a bg-colored dot (pure SVG). */
export default function LogoMark({ size = 30 }) {
  return (
    <svg className="brand-mark" width={size} height={size} viewBox="0 0 64 64" style={{ flex: 'none' }} aria-hidden>
      <circle cx="32" cy="32" r="28" fill="none" stroke="var(--v-accent)" strokeWidth="4" />
      <circle cx="32" cy="32" r="14" fill="var(--v-accent)" />
      <circle cx="32" cy="32" r="5" fill="var(--v-bg)" />
    </svg>
  );
}
