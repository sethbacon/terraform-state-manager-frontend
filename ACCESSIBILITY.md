<!-- markdownlint-disable MD013 -->
# Accessibility Statement

## Commitment

The Terraform State Manager Frontend is committed to ensuring digital
accessibility for people with disabilities. We continually improve the user
experience for everyone and apply the relevant accessibility standards.

## Conformance Target

We target **WCAG 2.1 Level AA** conformance across all pages and interactive
components.

## Measures Taken

| Area                      | Approach                                                                                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Linting**               | `eslint-plugin-jsx-a11y` recommended rules are enforced at **error** level in CI (`eslint.config.js`); `npm run lint` runs with `--max-warnings 0` |
| **Keyboard navigation**   | All interactive elements are reachable via keyboard; the command palette (`Ctrl+K` / `⌘K`) provides keyboard-first navigation                       |
| **Skip link**             | A "Skip to main content" link is the first focusable element in the `Layout`, jumping to `#main-content`                                            |
| **Focus management**      | On every SPA route change, focus moves to the page's first `<h1>` (falling back to `<main>`); MUI traps focus inside dialogs and restores it on close |
| **Live-region announcements** | An `AnnouncerProvider` renders visually-hidden `aria-live` regions (`polite` and `assertive`); route changes announce the new page title       |
| **Landmarks & labels**    | The drawer is a labelled `role="navigation"`; icon-only controls carry `aria-label`s; the active nav item is marked `aria-current="page"`; the error fallback uses `role="alert"` / `aria-live="assertive"` |
| **Color contrast**        | MUI theming with audited brand tokens enforces WCAG AA contrast in both light and dark modes                                                        |
| **Reduced motion**        | When `prefers-reduced-motion: reduce` is active, all MUI transitions are disabled (`theme.ts` zeroes the transition durations)                      |
| **Self-hosted fonts**     | The Inter typeface is bundled via `@fontsource` (no CDN), so text renders reliably under a strict Content-Security-Policy                           |

> **Shared-package disclosure.** Some mechanisms above are implemented in the private
> [`@sethbacon/terraform-suite-ui`](https://github.com/sethbacon/terraform-suite-ui)
> package rather than in this repository — notably the **skip link** and app shell
> (`components/Layout.tsx` re-exports `SuiteLayout`) and the **reduced-motion** handling
> and theming (`theme.ts` re-exports `createAppTheme`). See the "Shared Suite Package"
> section of `ARCHITECTURE.md`; verifying those two behaviours against WCAG requires
> auditing that package, which is versioned and audited separately.

## Focus & Announcements

Route-change focus and announcements are implemented in `hooks/useRouteFocus.ts`,
mounted through `RouteFocusManager`. After each client-side navigation it:

1. Locates the page's first `<h1>` (or `<main>`), applies a temporary
   `tabindex="-1"` so the element is programmatically focusable, and moves focus
   to it — removing the temporary attribute on blur.
2. Announces the new page title via the `useAnnouncer()` live region so screen
   readers hear the context change.

The `AnnouncerContext` clears each message after a short delay so identical
consecutive announcements re-trigger a readout.

## Command Palette

The `⌘K` / `Ctrl+K` command palette (built on
[cmdk](https://github.com/pacocoursey/cmdk)) gives keyboard users fast,
scope-filtered navigation to any page they are permitted to see. It opens in an
MUI `Dialog` (focus-trapped) with an autofocused search input.

## Reduced Motion

`createAppTheme(mode, prefersReducedMotion)` — provided by the shared
`@sethbacon/terraform-suite-ui` package (this repo's `theme.ts` is a thin
re-export, per `ARCHITECTURE.md`) — reads
`prefers-reduced-motion: reduce` once at startup and, when set, replaces MUI's
`transitions.create` with a no-op and zeroes every transition duration. This
removes drawer slides, collapse animations, and dialog transitions for users who
request reduced motion.

## Known Limitations

- **Swagger UI** (API docs page) ships partial ARIA coverage and applies inline
  styles. We enforce WCAG-AA colours and fix nested-interactive markup at runtime
  in `pages/ApiDocumentation.tsx` (a `MutationObserver` re-applies the fixes as
  Swagger UI re-renders), but coverage is not exhaustive.
- The **cmdk** command palette has partial ARIA coverage upstream; we rely on its
  built-in keyboard model and the surrounding focus-trapped dialog.
- **Chart visualizations** on the home dashboard (recharts) do not yet include
  full text-based alternatives.

## Color Contrast Audit

The theme is built from a small set of brand tokens (`frontend/src/theme.ts`),
shared with the sibling registry frontend for visual parity. All tokens are
audited against WCAG 2.1 contrast requirements:

| Token                       | Light Mode            | Dark Mode              | Requirement       |
| --------------------------- | --------------------- | ---------------------- | ----------------- |
| Primary `#5C4EE5`           | on `#fff`             | on `#121212`           | 4.5:1 (AA)        |
| Secondary (light) `#00796B` | on `#fff`             | —                      | 4.5:1 (AA)        |
| Secondary (dark) `#00D9C0`  | —                     | on `#121212`           | 4.5:1 (AA)        |
| Dark surfaces               | —                     | `#121212` / `#1e1e1e`  | —                 |
| Focus ring                  | `#5C4EE5` outline     | same                   | 3:1 (AA non-text) |

MUI derives text and state colours from these tokens and enforces AA contrast
ratios for normal body text (4.5:1) and non-text UI (3:1) in both modes. Inline
code and code blocks use dedicated dark-mode-safe foreground/background pairs,
and dark-mode scrollbars are themed for legibility.

## Feedback

If you encounter an accessibility barrier, please open a GitHub issue with the
`accessibility` label or contact the maintainers directly. We aim to respond
within 5 business days.

## Testing Tools

- [eslint-plugin-jsx-a11y](https://github.com/jsx-ally/eslint-plugin-jsx-a11y) —
  static accessibility linting, enforced at error level in CI
- [axe DevTools](https://www.deque.com/axe/) — recommended browser extension for
  manual audits during development
