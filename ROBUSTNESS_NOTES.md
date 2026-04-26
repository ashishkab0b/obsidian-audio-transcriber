# Long-Meeting Robustness Implementation

## What Changed

The plugin now uses a **chapter-based map-reduce summarizer** to handle long meetings (> 60 minutes) robustly. This fixes four failure modes:

### Failure Modes Fixed

1. **Context Overflow** — gpt-4o's 128K token limit used to cause silent failures on 4+ hour meetings
   - Now: Token pre-check routes long meetings to chunked summarization
   - Short meetings (< 60K tokens) still use fast single-pass

2. **Missing Action Items** (Lost-in-the-Middle Problem)
   - LLMs underweight content in the middle 40-70% of context
   - Now: Each chapter extracted independently, no content skipped
   - Chapters have 2-minute overlap at boundaries to catch cross-boundary items

3. **Poor Outline Organization** — Flat dump of a 2-hour meeting produced outline without structure
   - Now: Reduce prompt explicitly merges topics across chapters
   - Outline organized by subject matter, not chronological order
   - Supports meetings that bounce between topics or revisit concepts

4. **No Graceful Degradation** — No guard before API failures
   - Now: Token count estimated before sending; strategy chosen accordingly
   - Console logging shows which path was taken (useful for debugging)

## How It Works

### For Short Meetings (< 60K tokens ≈ 4 hours)

**Single-pass path (unchanged):**
```
Segments → formatTranscript() → one OpenAI call → SummaryResult
```

### For Long Meetings (> 60K tokens)

**Chapter-based map-reduce:**

```
Step 1 — AssemblyAI auto_chapters (automatic topic detection)
  Audio → AssemblyAI → DiarizedSegment[] + MeetingChapter[]
  Chapters are semantic boundaries (agenda shifts, topic changes)

Step 2 — Map pass (parallel extraction)
  For each chapter:
    - Slice segments with 2-min overlap at boundaries
    - One OpenAI call extracts { chapterSummary, actionItems[], decisions[] }
    - JSON schema enforced via response_format
    - All chapters run simultaneously with Promise.all
    
Step 3 — Reduce pass (single call)
  Input: All chapter extracts (now compact, typically < 5K tokens)
  - Merges topics that appear across multiple chapters
  - LLM deduplicates action items by owner + task similarity
  - Produces final SummaryResult with coherent outline
```

## Code Changes

### New Files / Interfaces

**src/types.ts:**
- `MeetingChapter` interface (gist, headline, summary, start, end in ms)
- `RecordingSession.chapters[]` field

**src/api/prompts.ts:**
- `getChapterExtractionPrompt(sessionType)` — Extraction-focused prompt
- `getReducePrompt(sessionType, verbosity)` — Synthesis prompt with topic merging

**src/api/summarizer.ts (new private methods):**
- `estimateTokens(text)` — Token pre-check
- `summarizeChunked()` — Coordinates map-reduce pipeline
- `summarizeChapter()` — Single chapter extraction
- `reduceExtracts()` — Combines chapter outputs

### Modified Files

**src/api/assemblyai.ts:**
- `submitTranscript()`: Added `auto_chapters: true` to request
- `pollTranscript()`: Now returns `{ segments, chapters }` instead of just segments
- `transcribeAudio()`: Return type updated

**src/ui/RecordingView.ts:**
- Updated `processRecording()` to destructure `{ segments, chapters }` from AssemblyAI
- Pass `chapters` to `summarizer.summarize()`
- Initialize `session.chapters = []` in `startRecording()`

## Testing Strategy

### 1. Short Meeting (Normal Path — No Change)
- Record a < 30 min meeting
- Verify console shows "using single-pass summarization"
- Verify output is identical to before (single-pass still the default)

### 2. Long Meeting (Verify Chunking Path)
- Create a fake long transcript by copy-pasting segments to exceed 60K tokens
- Verify console shows "using chapter-based map-reduce"
- Verify multiple OpenAI API calls appear (one per chapter + one reduce)

### 3. Verify auto_chapters Integration
- Check AssemblyAI API response includes `chapters` array
- Log raw response to confirm chapter detection
- Verify chapter boundaries make semantic sense (topic transitions detected)

### 4. Action Item Extraction from Middle
- Record a meeting where a key action item is mentioned 40+ minutes in
- Verify it appears in final output (not lost in the middle)

### 5. Duplicate Detection at Chapter Boundaries
- Create a test where the same action item is mentioned at a chapter boundary
- Verify only one instance appears in final output
- Verify the LLM's deduplication logic preserves the more specific version

### 6. Outline Merging
- Record a meeting that revisits a topic (e.g., "Roadmap" discussed in chapters 1, 3, 5)
- Verify final outline has one "Roadmap" entry, not three
- Verify outline is organized by topic, not by chapter order

### 7. Error Handling
- Test with a very short audio (no chapters returned)
- Verify fallback to single-pass works gracefully
- Test with AssemblyAI auto_chapters API error (simulate API returning no chapters)

## Performance Notes

- **Token pre-check:** ~0ms (just string length / 4)
- **Map pass:** Parallelized. 8 chapters = ~3 OpenAI calls in parallel (typical meeting)
- **Reduce pass:** 1 OpenAI call with compact input (5K tokens typical)
- **Wall-clock time:** Slightly faster than single-pass due to parallelization (if on a slow network, all chapter calls fire in parallel while single-pass would be one long sequential call)

## Limitations & Future Improvements

1. **Chapter overlap (2 min):** Hard-coded. Could be configurable for different use cases
2. **Token threshold (60K):** Hard-coded at "safe buffer before model limit". Could be user setting
3. **Deduplication strategy:** LLM-based (no extra code, but relies on prompt clarity). Could add code-based similarity if needed
4. **Notes distribution:** Notes matched to chapters by timestamp. If a note spans a chapter boundary, it only goes to one chapter. Could use overlap window here too.

## Debugging

Enable logging by checking browser console during summarization:

```
Transcript is 8234 tokens; using single-pass summarization
```

OR

```
Transcript is 72341 tokens (long meeting); using chapter-based map-reduce
Extracted summaries from 8 chapters
```

This helps verify the routing decision without needing to access the codebase.
