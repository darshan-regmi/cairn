import type { SVGProps } from "react";

/**
 * A small, dependency-free icon set for the sidebar and its controls. Every
 * icon is decorative: it carries no label of its own, so callers pair it with
 * visible text or an aria-label on the surrounding control.
 */
function Glyph({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export function DashboardIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Glyph {...props}>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </Glyph>
  );
}

export function FolderIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Glyph {...props}>
      <path d="M3 7a2 2 0 0 1 2-2h3.6l1.9 2H19a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
    </Glyph>
  );
}

export function SupervisorIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Glyph {...props}>
      <path d="M12 3 2 8l10 5 10-5-10-5Z" />
      <path d="M6 11v5.5c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5V11" />
    </Glyph>
  );
}

export function DocsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Glyph {...props}>
      <path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H12v18H6.5A1.5 1.5 0 0 1 5 19.5Z" />
      <path d="M12 3h5.5A1.5 1.5 0 0 1 19 4.5v15a1.5 1.5 0 0 1-1.5 1.5H12" />
    </Glyph>
  );
}

export function PlusIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Glyph {...props}>
      <path d="M12 5v14M5 12h14" />
    </Glyph>
  );
}

export function ChevronIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Glyph {...props}>
      <path d="M15 6l-6 6 6 6" />
    </Glyph>
  );
}

export function SignOutIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Glyph {...props}>
      <path d="M15 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3" />
      <path d="M10 17l-5-5 5-5M5 12h11" />
    </Glyph>
  );
}
