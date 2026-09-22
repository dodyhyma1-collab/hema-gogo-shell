# Collapsible app sidebar

## What will change
- Add a responsive sidebar beside the existing Hema Gogo workspace overview.
- Include all nine requested destinations with distinct Lucide SVG icons and bilingual English/Arabic labels.
- Keep the overview as the active destination while making every sidebar item selectable without adding unfinished pages.
- Add a persistent desktop mini-collapse mode with icon tooltips and a slide-out mobile menu.
- Place the sidebar control in the top bar so it remains available in expanded, collapsed, mobile, LTR, and RTL states.
- Mirror the sidebar side, icon direction, spacing, and mobile drawer automatically when Arabic is selected.

## Technical details
- Use the existing shadcn sidebar primitives and semantic theme colors.
- Patch the shared sidebar width utilities to Tailwind 4-compatible `var(...)` syntax where needed.
- Preserve the current tenant switcher, search, notifications, profile menu, translations, and overview content.
- Verify desktop/mobile collapse behavior and English/Arabic mirroring in the running preview.
