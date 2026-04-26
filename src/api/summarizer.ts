import { DiarizedSegment, SessionType, SummaryResult, TimestampedNote } from '../types';
import { getSystemPrompt } from './prompts';

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
		verbosity: 'brief' | 'detailed'
	): Promise<SummaryResult> {
		const transcript = this.formatTranscript(segments);
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
