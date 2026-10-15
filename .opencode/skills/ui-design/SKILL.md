---
name: ui-design
description: UI rules for Cairn pages and components (Next.js App Router, Tailwind v4). Load before building or restyling any page or component.
---
- Reuse existing components first (ProgressBar, StatusBadge, CommentSection, and the feature folders in src/components). No near-duplicates.
- Tailwind v4 design tokens and dark: classes only. No inline hex, no new CSS files.
- Spacing on the 4px Tailwind scale. One font family, 4 to 5 type sizes.
- Text contrast 4.5:1 minimum in light and dark mode.
- Every interactive element needs hover, focus-visible, active and disabled states. Touch targets 44px minimum.
- Mobile first. Check 375px before 1280px.
- Semantic HTML first (button, nav, main). Every input has an associated label.
- Loading skeletons instead of spinners, an empty state for every list, an error state for every async view.
- Set image width and height to avoid layout shift. Respect prefers-reduced-motion. No animation over 300ms.
