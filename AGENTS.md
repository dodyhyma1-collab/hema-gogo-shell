<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- AI Hema model routing lives in src/lib/ai/router.server.ts (task classify → model chain, failover only on 429/5xx); chat route streams via createUIMessageStream. Why: one place to change routing rules.
- Every AI-applied app change goes through runTrackedAction in src/lib/ai-changes.ts so it can be rolled back; code is only proposed, never auto-applied. Why: human-in-the-loop safety.
- Signed-in users' app state and AI changes sync to workspace_state/ai_changes tables (src/lib/cloud-sync.ts); localStorage stays the live cache. Why: works signed-out too.
