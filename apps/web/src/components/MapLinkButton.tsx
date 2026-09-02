type MapLinkButtonProps = {
  href: string;
  label?: string;
};

function NavigationIcon() {
  return (
    <svg className="uz-btn__icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 11L22 2L13 21L11 13L3 11Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MapLinkButton({ href, label = "Nawigacja" }: MapLinkButtonProps) {
  return (
    <a
      className="map-link-button uz-btn uz-btn--sm uz-btn--tonal"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
    >
      <span className="map-link-button__label">{label}</span>
      <NavigationIcon />
    </a>
  );
}
