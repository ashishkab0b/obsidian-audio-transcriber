import { DiarizedSegment, SessionType, SummaryResult, TimestampedNote, ActionItem } from '../types';
import {
	getMeetingOutlinePrompt,
	getMeetingActionItemsPrompt,
	getMeetingExecutiveSummaryPrompt,
	getTalkOutlinePrompt,
	getTalkExecutiveSummaryPrompt,
} from './prompts';
import { MEETING_MODELS, TALK_MODELS, computeCost } from '../config/models';

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
	usage: {
		prompt_tokens: number;
		completion_tokens: number;
		total_tokens: number;
	};
}

interface ComponentResult<T> {
	data: T;
	promptTokens: number;
	completionTokens: number;
}

export class Summarizer {
	private apiKey: string;
	private temperature: number;
	private baseUrl = 'https://api.openai.com/v1';

	constructor(apiKey: string, temperature: number) {
		this.apiKey = apiKey;
		this.temperature = temperature;
	}

	async generateOutline(
		segments: DiarizedSegment[],
		notes: TimestampedNote[],
		verbosity: 'brief' | 'detailed'
	): Promise<ComponentResult<{ outline: string[] }>> {
		const transcript = this.formatTranscript(segments);
		const notesText = this.formatNotes(notes);
		const systemPrompt = getMeetingOutlinePrompt(verbosity);
		const userPrompt = `${transcript}\n\nUser notes during recording:\n${notesText}`;

		const messages: OpenAIMessage[] = [
			{ role: 'system', content: systemPrompt },
			{ role: 'user', content: userPrompt },
		];

		const response = await this.callOpenAI(MEETING_MODELS.outline, messages);
		const outline = response.data.outline;

		return {
			data: { outline },
			promptTokens: response.promptTokens,
			completionTokens: response.completionTokens,
		};
	}

	async extractActionItems(
		segments: DiarizedSegment[],
		notes: TimestampedNote[]
	): Promise<ComponentResult<{ actionItems: ActionItem[]; decisions: string[] }>> {
		const transcript = this.formatTranscript(segments);
		const notesText = this.formatNotes(notes);
		const systemPrompt = getMeetingActionItemsPrompt();
		const userPrompt = `${transcript}\n\nUser notes during recording:\n${notesText}`;

		const messages: OpenAIMessage[] = [
			{ role: 'system', content: systemPrompt },
			{ role: 'user', content: userPrompt },
		];

		const response = await this.callOpenAI(MEETING_MODELS.actionItems, messages);
		const actionItems = response.data.actionItems || [];
		const decisions = response.data.decisions || [];

		return {
			data: { actionItems, decisions },
			promptTokens: response.promptTokens,
			completionTokens: response.completionTokens,
		};
	}

	async generateExecutiveSummary(
		outline: string[],
		verbosity: 'brief' | 'detailed'
	): Promise<ComponentResult<{ summary: string }>> {
		const systemPrompt = getMeetingExecutiveSummaryPrompt(verbosity);
		const outlineText = outline.join('\n');
		const userPrompt = `Here is the meeting outline:\n\n${outlineText}`;

		const messages: OpenAIMessage[] = [
			{ role: 'system', content: systemPrompt },
			{ role: 'user', content: userPrompt },
		];

		const response = await this.callOpenAI(MEETING_MODELS.executiveSummary, messages);
		const summary = response.data.summary;

		return {
			data: { summary },
			promptTokens: response.promptTokens,
			completionTokens: response.completionTokens,
		};
	}

	async generateTalkOutline(
		segments: DiarizedSegment[],
		notes: TimestampedNote[],
		verbosity: 'brief' | 'detailed'
	): Promise<ComponentResult<{ outline: string[] }>> {
		const transcript = this.formatTranscript(segments);
		const notesText = this.formatNotes(notes);
		const systemPrompt = getTalkOutlinePrompt(verbosity);
		const userPrompt = `${transcript}\n\nUser notes during recording:\n${notesText}`;

		const messages: OpenAIMessage[] = [
			{ role: 'system', content: systemPrompt },
			{ role: 'user', content: userPrompt },
		];

		const response = await this.callOpenAI(TALK_MODELS.outline, messages);
		const outline = response.data.outline;

		return {
			data: { outline },
			promptTokens: response.promptTokens,
			completionTokens: response.completionTokens,
		};
	}

	async generateTalkExecutiveSummary(
		outline: string[],
		verbosity: 'brief' | 'detailed'
	): Promise<ComponentResult<{ summary: string; takeaways: string[] }>> {
		const systemPrompt = getTalkExecutiveSummaryPrompt(verbosity);
		const outlineText = outline.join('\n');
		const userPrompt = `Here is the talk outline:\n\n${outlineText}`;

		const messages: OpenAIMessage[] = [
			{ role: 'system', content: systemPrompt },
			{ role: 'user', content: userPrompt },
		];

		const response = await this.callOpenAI(TALK_MODELS.executiveSummary, messages);
		const summary = response.data.summary;
		const takeaways = response.data.takeaways || [];

		return {
			data: { summary, takeaways },
			promptTokens: response.promptTokens,
			completionTokens: response.completionTokens,
		};
	}

	private async callOpenAI(model: string, messages: OpenAIMessage[]): Promise<any> {
		const response = await fetch(`${this.baseUrl}/chat/completions`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${this.apiKey}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				model,
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
			return {
				data: parsed,
				promptTokens: data.usage.prompt_tokens,
				completionTokens: data.usage.completion_tokens,
			};
		} catch (error) {
			throw new Error(`Failed to parse API response JSON: ${content}`);
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
