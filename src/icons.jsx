export function Icon({ name, size = 20, ...props }) {
  const paths = {
    headset: (
      <>
        <path d="M4 13v-1a8 8 0 0 1 16 0v6a3 3 0 0 1-3 3h-4" />
        <path d="M4 12h4v7H4zm12 0h4v7h-4" />
      </>
    ),
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="2" />
        <rect x="14" y="3" width="7" height="7" rx="2" />
        <rect x="3" y="14" width="7" height="7" rx="2" />
        <rect x="14" y="14" width="7" height="7" rx="2" />
      </>
    ),
    ticket: (
      <>
        <path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4Z" />
        <path d="M15 5v3m0 3v2m0 3v3" />
      </>
    ),
    chart: (
      <>
        <path d="M4 3v17h17M8 16v-4m5 4V8m5 8V5" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 4 4" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    checkCircle: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12 3 3 5-6" />
      </>
    ),
    bolt: <path d="m13 2-9 12h7l-1 8 10-12h-7Z" />,
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    arrowUp: <path d="M7 17 17 7M7 7h10v10" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    download: (
      <>
        <path d="M12 3v12m-4-4 4 4 4-4M4 16v4h16v-4" />
      </>
    ),
    external: (
      <>
        <path d="M14 3h7v7m0-7L10 14M10 3H4v17h17v-6" />
      </>
    ),
    inbox: (
      <>
        <path d="m5 4-3 12v4h20v-4L19 4Z" />
        <path d="M2 16h6l2 3h4l2-3h6" />
      </>
    ),
    edit: (
      <>
        <path d="m15 4 5 5-11 11H4v-5Z" />
        <path d="m12 7 5 5" />
      </>
    ),
    trash: (
      <>
        <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7" />
      </>
    ),
    message: <path d="M21 11a9 9 0 0 1-9 9H3l2-5a9 9 0 1 1 16-4Z" />,
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name] || paths.ticket}
    </svg>
  );
}
