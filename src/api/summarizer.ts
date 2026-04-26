import { DiarizedSegment, SessionType, SummaryResult, TimestampedNote, ActionItem, MeetingChapter } from '../types';
import { getSystemPrompt, getChapterExtractionPrompt, getReducePrompt } from './prompts';

interface OpenAIMessage {
	role: 'system' | 'user' | 'assistant';
	content: string;
}

interface OpenAIResponse {
	choices: Array<{
		message: {
			content: string;
		};
	}>;
}

interface ChapterExtract {
	chapterTitle: string;
	summary: string;
	actionItems: ActionItem[];
	decisions: string[];
}

export class Summarizer {
	private apiKey: string;
	private model: string;
	private temperature: number;
	private baseUrl = 'https://api.openai.com/v1';

	constructor(apiKey: string, model: string, temperature: number) {
		this.apiKey = apiKey;
		this.model = model;
		this.temperature = temperature;
	}

	async summarize(
		segments: DiarizedSegment[],
		notes: TimestampedNote[],
		sessionType: SessionType,
		verbosity: 'brief' | 'detailed',
		chapters: MeetingChapter[] = []
	): Promise<SummaryResult> {
		const transcript = this.formatTranscript(segments);
		const transcriptTokens = this.estimateTokens(transcript);

		// Use chunked summarization if transcript is very long (> 60K tokens)
		if (transcriptTokens > 60000 && chapters.length > 0) {
			console.log(
				`Transcript is ${transcriptTokens} tokens (long meeting); using chapter-based map-reduce`
			);
			return this.summarizeChunked(segments, chapters, notes, sessionType, verbosity);
		}

		// Otherwise, use single-pass summarization
		console.log(
			`Transcript is ${transcriptTokens} tokens; using single-pass summarization`
		);
		const notesText = this.formatNotes(notes);
		const systemPrompt = getSystemPrompt(sessionType, verbosity);
		const userPrompt = `${transcript}\n\nUser notes during recording:\n${notesText}`;

		const messages: OpenAIMessage[] = [
			{ role: 'system', content: systemPrompt },
			{ role: 'user', content: userPrompt },
		];

		const response = await fetch(`${this.baseUrl}/chat/completions`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${this.apiKey}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				model: this.model,
				messages,
				temperature: this.temperature,
				response_format: { type: 'json_object' },
			}),
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`OpenAI API error: ${response.statusText} - ${error}`);
		}

		const data: OpenAIResponse = await response.json();

		if (!data.choices || !data.choices[0] || !data.choices[0].message) {
			throw new Error('Invalid response from OpenAI API');
		}

		const content = data.choices[0].message.content;

		try {
			const parsed = JSON.parse(content);
			return parsed as SummaryResult;
		} catch (error) {
			throw new Error(`Failed to parse summary JSON: ${content}`);
		}
	}

	estimateCost(inputTokens: number, outputTokens: number): number {
		// Rough estimates for various OpenAI models:
		// gpt-4o: $0.0025 per 1K input tokens, $0.010 per 1K output tokens
		// gpt-4-turbo: $0.01 per 1K input, $0.03 per 1K output
		// gpt-3.5-turbo: $0.0005 per 1K input, $0.0015 per 1K output

		let inputCost = 0;
		let outputCost = 0;

		if (this.model.includes('gpt-4o')) {
			inputCost = (inputTokens / 1000) * 0.0025;
			outputCost = (outputTokens / 1000) * 0.01;
		} else if (this.model.includes('gpt-4-turbo')) {
			inputCost = (inputTokens / 1000) * 0.01;
			outputCost = (outputTokens / 1000) * 0.03;
		} else {
			// Default to gpt-3.5-turbo rates
			inputCost = (inputTokens / 1000) * 0.0005;
			outputCost = (outputTokens / 1000) * 0.0015;
		}

		return Math.round((inputCost + outputCost) * 100) / 100;
	}

	private estimateTokens(text: string): number {
		// Rough estimate: 1 token ≈ 4 characters
		return Math.ceil(text.length / 4);
	}

	private async summarizeChunked(
		segments: DiarizedSegment[],
		chapters: MeetingChapter[],
		notes: TimestampedNote[],
		sessionType: SessionType,
		verbosity: 'brief' | 'detailed'
	): Promise<SummaryResult> {
		// Step 1: Distribute notes to chapters by timestamp
		const notesPerChapter = new Map<number, TimestampedNote[]>();
		chapters.forEach((ch, idx) => {
			notesPerChapter.set(
				idx,
				notes.filter((n) => n.time * 1000 >= ch.start && n.time * 1000 <= ch.end)
			);
		});

		// Step 2: Map pass - extract from each chapter in parallel
		const extractPromises = chapters.map((chapter, idx) => {
			// Slice segments for this chapter with 2-minute overlap at boundaries
			const overlapMs = 2 * 60 * 1000;
			const chapterStart = idx === 0 ? chapter.start : Math.max(0, chapter.start - overlapMs);
			const chapterEnd = idx === chapters.length - 1 ? chapter.end : chapter.end + overlapMs;

			const chapterSegments = segments.filter(
				(s) => s.start >= chapterStart && s.end <= chapterEnd
			);
			const chapterNotes = notesPerChapter.get(idx) || [];

			return this.summarizeChapter(chapterSegments, chapterNotes, sessionType, chapter.gist);
		});

		const extracts = await Promise.all(extractPromises);
		console.log(`Extracted summaries from ${extracts.length} chapters`);

		// Step 3: Reduce pass - combine all extracts into final summary
		return this.reduceExtracts(extracts, sessionType, verbosity);
	}

	private async summarizeChapter(
		segments: DiarizedSegment[],
		notes: TimestampedNote[],
		sessionType: SessionType,
		chapterGist: string
	): Promise<ChapterExtract> {
		const transcript = this.formatTranscript(segments);
		const notesText = this.formatNotes(notes);
		const systemPrompt = getChapterExtractionPrompt(sessionType);
		const userPrompt = `Context: ${chapterGist}\n\n${transcript}\n\nUser notes during this section:\n${notesText}`;

		const messages: OpenAIMessage[] = [
			{ role: 'system', content: systemPrompt },
			{ role: 'user', content: userPrompt },
		];

		const response = await fetch(`${this.baseUrl}/chat/completions`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${this.apiKey}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				model: this.model,
				messages,
				temperature: this.temperature,
				response_format: { type: 'json_object' },
			}),
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`OpenAI API error in chapter extraction: ${response.statusText} - ${error}`);
		}

		const data: OpenAIResponse = await response.json();

		if (!data.choices || !data.choices[0] || !data.choices[0].message) {
			throw new Error('Invalid response from OpenAI API in chapter extraction');
		}

		const content = data.choices[0].message.content;

		try {
			const parsed = JSON.parse(content);
			return {
				chapterTitle: parsed.chapterTitle || 'Untitled section',
				summary: parsed.summary || '',
				actionItems: parsed.actionItems || [],
				decisions: parsed.decisions || [],
			};
		} catch (error) {
			throw new Error(`Failed to parse chapter extraction JSON: ${content}`);
		}
	}

	private async reduceExtracts(
		extracts: ChapterExtract[],
		sessionType: SessionType,
		verbosity: 'brief' | 'detailed'
	): Promise<SummaryResult> {
		// Build the input for the reduce pass
		const extractSummary = extracts
			.map(
				(ex) =>
					`Section: ${ex.chapterTitle}\nSummary: ${ex.summary}\nAction Items: ${
						ex.actionItems.length > 0
							? ex.actionItems
									.map((ai) => `- ${ai.owner}: ${ai.task} (${ai.deadline})`)
									.join('\n')
							: 'None'
					}\nDecisions: ${
						ex.decisions.length > 0 ? ex.decisions.map((d) => `- ${d}`).join('\n') : 'None'
					}`
			)
			.join('\n\n');

		const systemPrompt = getReducePrompt(sessionType, verbosity);
		const userPrompt = `Here are the summaries and extracts from all sections of this ${sessionType}:\n\n${extractSummary}`;

		const messages: OpenAIMessage[] = [
			{ role: 'system', content: systemPrompt },
			{ role: 'user', content: userPrompt },
		];

		const response = await fetch(`${this.baseUrl}/chat/completions`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${this.apiKey}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				model: this.model,
				messages,
				temperature: this.temperature,
				response_format: { type: 'json_object' },
			}),
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`OpenAI API error in reduce pass: ${response.statusText} - ${error}`);
		}

		const data: OpenAIResponse = await response.json();

		if (!data.choices || !data.choices[0] || !data.choices[0].message) {
			throw new Error('Invalid response from OpenAI API in reduce pass');
		}

		const content = data.choices[0].message.content;

		try {
			const parsed = JSON.parse(content);
			return parsed as SummaryResult;
		} catch (error) {
			throw new Error(`Failed to parse reduce pass JSON: ${content}`);
		}
	}

private formatTranscript(segments: DiarizedSegment[]): string {
		const lines = segments.map((seg) => {
			const timeStr = this.formatTime(seg.start);
			return `[${timeStr}] ${seg.speaker}: ${seg.text}`;
		});
		return lines.join('\n');
	}

	private formatNotes(notes: TimestampedNote[]): string {
		if (notes.length === 0) {
			return '(No notes)';
		}
		const lines = notes.map((note) => {
			const timeStr = this.formatTime(note.time * 1000);
			return `[${timeStr}] ${note.text}`;
		});
		return lines.join('\n');
	}

	private formatTime(ms: number): string {
		const totalSeconds = Math.floor(ms / 1000);
		const hours = Math.floor(totalSeconds / 3600);
		const minutes = Math.floor((totalSeconds % 3600) / 60);
		const seconds = totalSeconds % 60;

		if (hours > 0) {
			return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds
				.toString()
				.padStart(2, '0')}`;
		}
		return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
	}
}
