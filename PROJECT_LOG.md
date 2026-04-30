# Audio Transcriber Plugin — Project Log

## Session Overview
Building an Obsidian plugin for recording meetings/talks, transcribing them with AssemblyAI, and summarizing them with OpenAI. Plugin now supports two recording types with distinct summarization pipelines.

---

## Key Architectural Decisions

### Recording Types
- **Meetings**: Outline + Action Items + Decisions + Executive Summary
- **Talks/Lectures**: Outline + Key Takeaways + Executive Summary

### Summarization Architecture (3-Component Pipeline)
Rather than a single API call that produces all outputs, split into specialized components:

**Meetings:**
1. **Outline** (gpt-5.4) — comprehensive thematic outline from full transcript
2. **Action Items** (gpt-5.4-mini) — actionItems[] + decisions[] from full transcript [PARALLEL with Outline]
3. **Executive Summary** (gpt-5.4-mini) — summary derived from outline (not raw transcript) [SEQUENTIAL]

**Talks:**
1. **Outline** (gpt-5.4) — comprehensive thematic outline from full transcript
2. **Executive Summary with Takeaways** (gpt-5.4-mini) — summary + key takeaways from outline [SEQUENTIAL]

**Why this approach:**
- Each component uses the right model for the job
- Parallel execution of outline + action items speeds up meeting processing
- Executive summary from outline prevents transcript token bloat and improves quality
- Per-component cost tracking shows exactly what each step costs
- Easy to extend later (e.g., add separate "Key Decisions" pass)

---

## Session Timeline

### Phase 5: GitHub install/load failure diagnosis ✅
- Diagnosed the likely real-vault load failure after installing from GitHub source: Obsidian requires `main.js` at the plugin root, but `main.js` is intentionally ignored and is not present when cloning/downloading source.
- Added README install guidance explaining that source installs must run `npm install` and `npm run build`, while normal installs should use release assets (`manifest.json`, `main.js`, `styles.css`).
- Expanded README install guidance into two explicit paths: GitHub release asset install and source install when no release exists yet.
- Added `.github/workflows/release.yml` to build production `main.js`, validate `manifest.json`/`versions.json`, and attach Obsidian release assets to GitHub releases.
- Aligned metadata:
  - `package.json` / `package-lock.json`: `obsidian-audio-transcriber@0.1.0`
  - `manifest.json`: `minAppVersion` set to `1.11.0` for Keychain/SecretStorage support
  - `versions.json`: maps `0.1.0` to `1.11.0`
- Validation:
  - `npm run build` passes.
  - `npm run lint` still fails on existing policy/style issues unrelated to the load failure, including `fetch` usage, `alert`, unsafe `any`, default hotkeys, and direct DOM styling.

### Phase 1: Long-Meeting Robustness (Explored, Then Reverted)
- **Explored**: Chapter-based map-reduce to handle 4+ hour meetings gracefully
- **Decision**: Reverted to single-pass for real-world testing. User indicated they never have 4-hour meetings, so complexity wasn't justified yet.
- **Learning**: Robustness work is documented in ROBUSTNESS_NOTES.md if user needs it later.

### Phase 2: 3-Component Meeting Pipeline ✅
- Created `src/config/models.ts` — centralized model IDs and pricing
- Refactored `Summarizer` to have three independent methods: `generateOutline()`, `extractActionItems()`, `generateExecutiveSummary()`
- Updated `RecordingView.processRecording()` to run outline + action items in parallel
- Cost tracking now uses **actual token counts from API responses** (not pre-call estimates)
- Cost display shows component + model + individual costs + total

### Phase 3: Settings UI Clarity ✅
- Removed `openAiModel` from user settings (models now hardcoded in config)
- Reorganized settings into logical sections: API Keys, Summarization, Output
- Updated ribbon icon tooltip: "Open audio recorder" → "Open audio transcriber"
- Improved setting descriptions to reflect pipeline architecture

### Phase 4: Talk/Lecture Support ✅
- Split single command into two: "Start meeting recording" vs "Start talk recording"
- Added `TALK_MODELS` configuration
- Implemented `getTalkOutlinePrompt()` and `getTalkExecutiveSummaryPrompt()`
- Added `generateTalkOutline()` and `generateTalkExecutiveSummary()` to Summarizer
- `processRecording()` now branches on `sessionType`:
  - **Meeting**: outline + action items (parallel), then summary
  - **Talk**: outline (sequential), then summary with takeaways
- Markdown output already supports both types (MarkdownBuilder conditional on sessionType)

---

## File Structure

```
src/
  config/
    models.ts              # Model IDs and pricing per component
  api/
    assemblyai.ts          # Speech-to-text + diarization
    prompts.ts             # Focused prompts per component per session type
    summarizer.ts          # Three component methods per session type
  ui/
    RecordingView.ts       # Main UI; branches on sessionType in processRecording()
  output/
    MarkdownBuilder.ts     # Handles both meeting and talk output formats
    NoteWriter.ts          # Saves files to vault
  recording/
    AudioRecorder.ts       # MediaRecorder wrapper
  commands/
    index.ts               # Two commands: start-meeting, start-talk
  settings.ts              # Plugin settings (API keys, temperature, folders)
  main.ts                  # Plugin lifecycle
  types.ts                 # Shared interfaces
```

---

## Cost Reporting

Per-component breakdown now shown in Done panel:

**Meeting:**
- Transcription (AssemblyAI)
- Outline (gpt-5.4)
- Action Items (gpt-5.4-mini)
- Executive Summary (gpt-5.4-mini)

**Talk:**
- Transcription (AssemblyAI)
- Outline (gpt-5.4)
- Executive Summary (gpt-5.4-mini)

Costs computed from actual token usage in API responses via `computeCost()` function.

---

## Known Limitations & Future Improvements

### Limitations
1. **Talk outline extracts from full transcript** — If talks become very long (3+ hours), should consider chunking strategy (see ROBUSTNESS_NOTES.md)
2. **No custom model overrides** — Models are hardcoded in config. Could make user-configurable if needed.
3. **Takeaways extraction** — Currently done as part of executive summary call. Could be split into separate component if quality issues arise.
4. **Deduplication** — Not implemented for talks yet (meetings have action item dedup via LLM in earlier attempts, but not in current pipeline).

### Future Extensions
1. **Settings UI for model selection** — Re-add UI if user wants to choose models
2. **Long talk robustness** — If talks exceed 60K tokens, implement chapter-based chunking (documented in ROBUSTNESS_NOTES.md)
3. **Custom prompts** — Allow power users to override system prompts via settings
4. **Real-time transcription** — Stream audio to AssemblyAI instead of waiting for stop
5. **Multi-language support** — Add language selection to settings
6. **Notes modal refinement** — Current inline textarea could be enhanced (larger, dockable, etc.)

---

## Testing Checklist

- [x] Meeting recording produces outline + action items + decisions + summary
- [x] Talk recording produces outline + takeaways + summary
- [x] Commands appear in command palette (two separate commands)
- [x] Cost breakdown shows per-component costs
- [x] Settings UI is logically organized
- [x] Ribbon icon says "Open audio transcriber"
- [ ] Manual testing with real meeting audio
- [ ] Manual testing with real talk audio
- [ ] Verify takeaways quality
- [ ] Verify outline quality for bouncy talks (revisiting topics)

---

## Recent Commits

```
46a3c20 Implement talk/lecture recording and summarization pipeline
cac6aeb Update plugin settings UI and ribbon icon for clarity
8492458 Implement 3-component meeting summarization pipeline
79a810c Revert to single-pass summarization for real-world testing
59afa1e Implement chapter-based map-reduce summarizer for long meetings
```

---

## Status: Feature Complete (MVP)

Plugin now has:
- ✅ Audio recording in Obsidian sidebar
- ✅ Speech-to-text transcription with speaker diarization
- ✅ Meeting summarization (outline, action items, decisions, summary)
- ✅ Talk summarization (outline, key takeaways, summary)
- ✅ Per-component cost tracking with actual token counts
- ✅ Timestamped user notes during recording
- ✅ Diarized transcript output
- ✅ Markdown output with cost breakdown

Ready for real-world testing and iteration.
