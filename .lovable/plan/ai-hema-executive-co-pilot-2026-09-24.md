# AI Hema Executive Co-Pilot

## What will change
- Add a dedicated AI Hema page with its own URL and make the existing AI Hema sidebar item open it.
- Build a responsive executive chat workspace with a conversation list, new-conversation control, and isolated browser-saved history for each conversation.
- Add streamed AI responses with markdown, visible thinking state, safe errors, and a focused text composer.
- Add microphone recording and speech-to-text so users can dictate prompts before sending.
- Add an action execution log beside the chat, showing completed, running, and failed business actions with timestamps.
- Add quick prompt suggestions for common lead, revenue, inbox, report, and task workflows.
- Preserve English/Arabic switching and mirror the entire page in RTL.

## Interaction details
- Each conversation gets a stable `/ai-hema/:threadId` page; reloading or switching conversations restores that thread from browser storage.
- The conversation list and action log become mobile drawers so the chat remains primary on small screens.
- AI Hema will identify as an executive operations co-pilot and can summarize or recommend actions; example execution records remain clearly presented as workspace activity.
- Voice input records one complete clip, transcribes it, places the text in the composer, and lets the user review it before sending.

## Technical details
- Use the official AI Elements conversation, message, prompt input, reasoning, and loading components.
- Stream through a server route using the default Lovable AI model and keep all keys server-side.
- Use the dedicated speech transcription endpoint for recorded audio.
- Store thread metadata, AI message parts, and per-thread action logs in localStorage; no account or database will be added.
- Verify two-thread isolation, reload restoration, text chat, microphone controls, desktop/mobile layouts, and English/Arabic views.
