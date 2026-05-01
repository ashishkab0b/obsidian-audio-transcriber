# Audio Transcriber

An Obsidian plugin that records audio, transcribes it with speaker diarization via AssemblyAI, and generates structured summaries using OpenAI.

This was made to emulate the meeting recording functionality in Notion.

## Features

- **Audio recording** directly in the Obsidian sidebar
- **Speaker diarization** — identifies who said what
- **Three recording modes:**
  - **Meeting** — produces an outline, action items, decisions, and executive summary
  - **Talk/Lecture** — produces an outline, key takeaways, and executive summary
  - **Transcription** — produces only a diarized transcript and linked audio
- **Timestamped notes** — jot down notes during a recording, attached to the timeline
- **Per-component cost tracking** — see exactly what each API call cost
- **Markdown output** — saves diarized transcript and structured summary as notes in your vault

## Setup

### Install

Obsidian cannot load this plugin from TypeScript source files alone. It must have the built plugin files at the top level of the plugin folder:

- `manifest.json`
- `main.js`
- `styles.css`

#### Option 1: Install from a GitHub release

Use this option when the repo has a published release.

1. Open the repo's **Releases** page on GitHub.
2. Download these release assets:
   - `manifest.json`
   - `main.js`
   - `styles.css`
3. Create this folder in your Obsidian vault:

```text
<Vault>/.obsidian/plugins/obsidian-audio-transcriber/
```

4. Put the downloaded files directly in that folder:

```text
<Vault>/.obsidian/plugins/obsidian-audio-transcriber/
  manifest.json
  main.js
  styles.css
```

5. Restart Obsidian or reload the app.
6. Enable **Audio Transcriber** in **Settings -> Community plugins**.

Do not use GitHub's green **Code -> Download ZIP** button for this option. That downloads the source repo, not the built plugin release.

#### Option 2: Install from source

Use this option if there is no GitHub release yet, or if you cloned/downloaded the source repo directly into your vault.

1. Put the repo in your vault plugin folder:

```text
<Vault>/.obsidian/plugins/obsidian-audio-transcriber/
```

2. Open a terminal in that folder and run:

```bash
npm install
npm run build
```

3. Restart Obsidian or reload the app.
4. Enable **Audio Transcriber** in **Settings -> Community plugins**.

The build step creates `main.js`, which is the file Obsidian loads.

### API Keys

This plugin requires an AssemblyAI key for transcription. Meeting and talk analysis also require an OpenAI key. Keys are stored securely in Obsidian's Keychain (Settings → Keychain):

| Secret name | Service | Purpose |
|---|---|---|
| `assemblyai-api-key` | [AssemblyAI](https://www.assemblyai.com/) | Speech-to-text transcription and speaker diarization |
| `openai-api-key` | [OpenAI](https://platform.openai.com/) | Meeting/talk analysis and summarization |

Keys are stored in your OS keychain (macOS Keychain, Windows Credential Manager, Linux libsecret) and are never written to plugin settings files.

### Plugin Settings

| Setting | Description | Default |
|---|---|---|
| AssemblyAI model | Transcription model. Universal-2 is cheaper; Universal-3 Pro can improve accuracy for harder audio. | Universal-2 |
| Temperature | Controls randomness in analysis (0.0–1.0) | 0.3 |
| Summary Length | Brief (2–3 sentences) or Detailed (4–6 sentences) | Detailed |
| Audio Folder | Where to save recordings | `recordings/audio` |
| Transcript Folder | Where to save diarized transcripts | `recordings/transcripts` |
| Summary Folder | Where to save summary notes | `recordings` |
| Auto-open summary | Open the summary note after processing | On |

## Usage

1. Open the command palette (`Cmd/Ctrl + P`)
2. Run **"Start meeting recording in this note"**, **"Start talk recording in this note"**, or **"Start transcription in this note"**
3. The sidebar panel opens showing the recording type and elapsed time
4. Add timestamped notes during the recording as needed
5. Stop the recording — the plugin uploads audio to AssemblyAI for transcription, then runs the selected pipeline
6. When processing completes, the plugin saves the transcript and audio, then inserts the result into your note

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

### Transcription

```
Audio
  └── Diarized transcript (AssemblyAI)
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
