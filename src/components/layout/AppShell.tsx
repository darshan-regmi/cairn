"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { CreateProjectForm } from "@/components/projects/CreateProjectForm";
import {
  ChevronIcon,
  DashboardIcon,
  DocsIcon,
  FolderIcon,
  PlusIcon,
  SignOutIcon,
  SupervisorIcon,
} from "./icons";

type NavItem = {
  href: string;
  label: string;
  Icon: (props: React.SVGProps<SVGSVGElement>) => React.ReactElement;
  isActive: (path: string) => boolean;
};

const NAV: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    Icon: DashboardIcon,
    isActive: (path) => path === "/dashboard",
  },
  {
    href: "/projects",
    label: "Projects",
    Icon: FolderIcon,
    isActive: (path) => path.startsWith("/projects"),
  },
  {
    href: "/supervisor",
    label: "Supervised",
    Icon: SupervisorIcon,
    isActive: (path) => path.startsWith("/supervisor"),
  },
  {
    href: "/docs",
    label: "Docs",
    Icon: DocsIcon,
    isActive: (path) => path.startsWith("/docs"),
  },
];

const STORAGE_KEY = "cairn:sidebar-collapsed";
const CHANGE_EVENT = "cairn:sidebar-change";

let mobileQuery: MediaQueryList | null = null;

/** Whether the sidebar should start folded: the saved choice, else mobile. */
function readCollapsed() {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored !== null) return stored === "true";
  if (!mobileQuery) mobileQuery = window.matchMedia("(max-width: 767px)");
  return mobileQuery.matches;
}

function subscribe(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function setCollapsedPreference(value: boolean) {
  window.localStorage.setItem(STORAGE_KEY, String(value));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/**
 * A width that animates open and shut without measuring text: the label is
 * clipped and faded as the sidebar narrows, so the two states read as one
 * continuous movement rather than a jump.
 */
function labelClass(collapsed: boolean) {
  return `overflow-hidden whitespace-nowrap transition-[max-width,opacity,transform] duration-300 ease-out ${
    collapsed
      ? "max-w-0 -translate-x-1 opacity-0"
      : "max-w-[11rem] translate-x-0 opacity-100"
  }`;
}

const rowClass =
  "flex items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

export function AppShell({
  userEmail,
  projects,
  signOut,
  children,
}: {
  userEmail: string;
  projects: { id: string; title: string }[];
  signOut: () => Promise<void>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const collapsed = useSyncExternalStore(
    subscribe,
    readCollapsed,
    () => false,
  );
  const [newOpen, setNewOpen] = useState(false);

  return (
    <div className="min-h-dvh">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-accent-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-ink"
      >
        Skip to main content
      </a>

      <div className="flex min-h-dvh">
        <aside
          aria-label="Sidebar"
          className={`sticky top-0 z-20 flex h-dvh shrink-0 flex-col border-r border-edge bg-canvas/85 backdrop-blur transition-[width] duration-300 ease-out ${
            collapsed ? "w-16" : "w-64"
          }`}
        >
          <div className="flex h-14 items-center px-3">
            <Link
              href="/dashboard"
              className="flex items-center gap-2.5 rounded-md px-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              aria-label="Cairn dashboard"
            >
              <span
                aria-hidden="true"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent font-display text-sm text-accent-ink"
              >
                F
              </span>
              <span
                className={`font-display text-base tracking-tight text-fg ${labelClass(collapsed)}`}
              >
                Cairn
              </span>
            </Link>
          </div>

          <nav aria-label="Primary" className="flex flex-col gap-0.5 px-2">
            {NAV.map((item) => {
              const active = item.isActive(pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  title={item.label}
                  className={`${rowClass} ${
                    active
                      ? "bg-accent/15 text-fg"
                      : "text-muted hover:bg-accent/10 hover:text-fg"
                  }`}
                >
                  <item.Icon className="shrink-0" />
                  <span className={labelClass(collapsed)}>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-5 flex-1 overflow-y-auto px-2 pb-3">
            <p
              className={`px-2.5 text-[11px] font-medium uppercase tracking-wide text-muted ${
                collapsed ? "h-0 opacity-0" : "opacity-100"
              }`}
              aria-hidden={collapsed}
            >
              Your projects
            </p>
            <ul className="mt-1 space-y-0.5">
              {projects.map((project) => (
                <li key={project.id}>
                  <Link
                    href={`/dashboard?project=${project.id}`}
                    title={project.title}
                    className={`${rowClass} group text-muted hover:bg-accent/10 hover:text-fg`}
                  >
                    <span
                      aria-hidden="true"
                      className="h-2 w-2 shrink-0 rounded-full bg-accent/50 transition-colors group-hover:bg-accent"
                    />
                    <span className={`truncate ${labelClass(collapsed)}`}>
                      {project.title}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setNewOpen(true)}
              title="New project"
              className={`${rowClass} mt-1 w-full text-muted hover:bg-accent/10 hover:text-fg`}
            >
              <PlusIcon className="shrink-0" />
              <span className={labelClass(collapsed)}>New project</span>
            </button>
          </div>

          <div className="border-t border-edge p-2">
            <button
              type="button"
              onClick={() => setCollapsedPreference(!collapsed)}
              aria-expanded={!collapsed}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className={`${rowClass} w-full text-muted hover:bg-accent/10 hover:text-fg`}
            >
              <ChevronIcon
                className={`shrink-0 transition-transform duration-300 ease-out ${
                  collapsed ? "rotate-180" : ""
                }`}
              />
              <span className={labelClass(collapsed)}>
                {collapsed ? "Expand" : "Collapse"}
              </span>
            </button>

            <form action={signOut}>
              <button
                type="submit"
                title="Sign out"
                className={`${rowClass} w-full text-muted hover:bg-accent/10 hover:text-fg`}
              >
                <SignOutIcon className="shrink-0" />
                <span className={labelClass(collapsed)}>Sign out</span>
              </button>
            </form>

            <p
              className={`mt-1 px-2.5 text-xs text-muted ${
                collapsed ? "hidden" : "truncate"
              }`}
              title={userEmail}
            >
              {userEmail}
            </p>
          </div>
        </aside>

        <div className="min-w-0 flex-1">{children}</div>
      </div>

      <Dialog
        open={newOpen}
        onClose={() => setNewOpen(false)}
        title="New project"
        description="Give it a name and a rough span; you can add milestones and tasks next."
      >
        <CreateProjectForm onSuccess={() => setNewOpen(false)} />
      </Dialog>
    </div>
  );
}
