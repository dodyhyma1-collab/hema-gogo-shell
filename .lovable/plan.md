# Hema Gogo Runtime Evolution Workspace

## What will change
- Rename remaining default or legacy page metadata to “Hema Gogo”.
- Add a dedicated AI Hema workspace at stable conversation URLs, with browser-saved conversations and navigation from the sidebar.
- Let users enter natural-language UI requests such as changing the theme, hiding dashboard areas, or choosing a compact layout; preview the parsed configuration and require confirmation before applying it.
- Add a Code & Config Generation Hub that previews simulated React component code and JSON configuration side by side.
- Add a Self-Evolution Audit Log for pending, applied, and rejected modifications, with review, Apply Changes, and Reject controls.

## Safety and behavior
- Generated structural code is preview-only; runtime changes are limited to a validated set of reversible visual configuration options.
- Every modification is staged first and only changes the visible experience after explicit approval.
- Threads, generated previews, runtime configuration, and audit records stay in this browser; no account or database changes.
- Preserve English/Arabic switching, full RTL mirroring, and responsive desktop/mobile layouts.

## Technical details
- Compose the chat surface from the installed AI Elements conversation, message, prompt input, reasoning, and shimmer primitives.
- Use route-derived thread IDs and localStorage-backed records so conversations remain isolated after reload.
- Represent UI modifications with a typed allowlist rather than evaluating generated JavaScript or modifying source files at runtime.
- Add unique page metadata for the new AI Hema route and verify navigation, staging, apply/reject behavior, persistence, mobile layout, and RTL.
