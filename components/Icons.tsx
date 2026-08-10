import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;

const base = (props: P) => ({
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  width: 18,
  height: 18,
  ...props,
});

export const PlusIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const SendIcon = (p: P) => (
  <svg {...base(p)} width={17} height={17}>
    <path d="M21 3 10.5 13.5M21 3l-7-2M21 3l-2 7" transform="translate(0 0)" />
    <path d="M10.5 13.5 13 21l-4-4-4-4 3.5-9.5" transform="translate(0 0)" />
  </svg>
);

export const MicIcon = (p: P) => (
  <svg {...base(p)}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
  </svg>
);

export const SquareIcon = (p: P) => (
  <svg {...base(p)} width={13} height={13}>
    <rect x="5" y="5" width="14" height="14" rx="2.5" />
  </svg>
);

export const TrashIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
  </svg>
);

export const SunIcon = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="4.5" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);

export const MoonIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
  </svg>
);

export const MenuIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 6h18M3 12h18M3 18h12" />
  </svg>
);

export const ArrowLeftIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </svg>
);

export const CopyIcon = (p: P) => (
  <svg {...base(p)}>
    <rect x="9" y="9" width="12" height="12" rx="2.5" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

export const CheckIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 12.5 9.5 18 20 6.5" />
  </svg>
);

export const SparkleIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z" />
    <path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z" />
  </svg>
);

export const BoltIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M13 2 4.5 13.5H11L9.5 22 19 10h-6.5L13 2Z" />
  </svg>
);

export const BookIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2V5Z" />
    <path d="M18 3v16M6 19H4" transform="translate(0 0)" />
  </svg>
);

export const BoltStrokeIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M13 2 4.5 13.5H11L9.5 22 19 10h-6.5L13 2Z" />
  </svg>
);

export const WaveIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M2.5 12h2M7 8v8M12 5v14M17 8v8M21.5 12h-2" transform="translate(0 0)" />
    <path d="M2 12h2 3.5M4.5 12h2.5M12 12h10" opacity={0} />
  </svg>
);

export const ExpandIcon = (p: P) => (
  <svg {...base(p)} width={15} height={15}>
    <path d="M15 8V3h-5M15 3l-6.5 6.5M8 15H3V9" transform="translate(0 0)" />
  </svg>
);

export const SpeakerIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M11 5 6.5 9H3v6h3.5L11 19V5Z" />
    <path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12" />
  </svg>
);

export const SpeakerOffIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M11 5 6.5 9H3v6h3.5L11 19V5Z" />
    <path d="M22 9l-6 6M16 9l6 6" />
  </svg>
);

export const LogoMark = (p: P) => (
  <svg {...base(p)} width={19} height={19} strokeWidth={2.4}>
    <path d="M12 3v18M5.2 6.8l13.6 10.4M18.8 6.8 5.2 17.2" />
  </svg>
);

export const MessageIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8l-4 4v-4H6a2 2 0 0 1-2-2V6Z" />
  </svg>
);