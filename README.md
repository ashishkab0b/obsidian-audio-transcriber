# Audio Transcriber

An Obsidian plugin that records audio, transcribes it with speaker diarization via AssemblyAI, and generates structured summaries using OpenAI.

This was made to emulate the meeting recording functionality in Notion.

## Features

- **Audio recording** directly in the Obsidian sidebar
- **Speaker diarization** — identifies who said what
- **Two recording modes:**
  - **Meeting** — produces an outline, action items, decisions, and executive summary
  - **Talk/Lecture** — produces an outline, key takeaways, and executive summary
- **Timestamped notes** — jot down notes during a recording, attached to the timeline
- **Per-component cost tracking** — see exactly what each API call cost
- **Markdown output** — saves diarized transcript and structured summary as notes in your vault

## Setup

### API Keys

This plugin requires two API keys, stored securely in Obsidian's Keychain (Settings → Keychain):

| Secret name | Service | Purpose |
|---|---|---|
| `assemblyai-api-key` | [AssemblyAI](https://www.assemblyai.com/) | Speech-to-text transcription and speaker diarization |
| `openai-api-key` | [OpenAI](https://platform.openai.com/) | Meeting/talk analysis and summarization |

Keys are stored in your OS keychain (macOS Keychain, Windows Credential Manager, Linux libsecret) and are never written to plugin settings files.

### Plugin Settings

| Setting | Description | Default |
|---|---|---|
| Temperature | Controls randomness in analysis (0.0–1.0) | 0.3 |
| Summary Length | Brief (2–3 sentences) or Detailed (4–6 sentences) | Detailed |
| Audio Folder | Where to save recordings | `recordings/audio` |
| Transcript Folder | Where to save diarized transcripts | `recordings/transcripts` |
| Summary Folder | Where to save summary notes | `recordings` |
| Auto-open summary | Open the summary note after processing | On |

## Usage

1. Open the command palette (`Cmd/Ctrl + P`)
2. Run **"Start meeting recording in this note"** or **"Start talk recording in this note"**
3. The sidebar panel opens showing the recording type and elapsed time
4. Add timestamped notes during the recording as needed
5. Stop the recording — the plugin uploads audio to AssemblyAI for transcription, then runs the summarization pipeline
6. When processing completes, a summary note is created in your vault with the full results and cost breakdown

## Summarization Pipeline

### Meetings

```
Transcript
  ├── Outline (gpt-5.4)           ──┐
  │                                  ├── parallel
  └── Action Items (gpt-5.4-mini) ──┘
        │
        ▼
  Executive Summary (gpt-5.4-mini)  ── from outline
```

### Talks

```
Transcript
  └── Outline (gpt-5.4)
        │
        ▼
  Executive Summary + Takeaways (gpt-5.4-mini)  ── from outline
```

## Development

```bash
npm install
npm run dev    # watch mode
npm run build  # production build
```

## Requirements

- Obsidian 1.11.0+ (for Keychain / SecretStorage support)
- Desktop only (microphone access required)
