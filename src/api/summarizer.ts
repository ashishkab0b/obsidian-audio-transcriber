import { DiarizedSegment, SessionType, SummaryResult, TimestampedNote } from '../types';

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

		const systemPrompt = this.getSystemPrompt(sessionType, verbosity);
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

	private getSystemPrompt(sessionType: SessionType, verbosity: 'brief' | 'detailed'): string {
		const verbosityLevel = verbosity === 'brief' ? '2-3' : '4-6';

		if (sessionType === 'meeting') {
			return `You are an expert meeting summarizer. Your task is to analyze the meeting transcript and extract key information.

Return a JSON object with the following structure:
{
	"summary": "A concise overview of the meeting (${verbosityLevel} sentences)",
	"outline": ["key point 1", "key point 2", ...],
	"decisions": ["decision 1", "decision 2", ...],
	"actionItems": [
		{"owner": "Name", "task": "Description", "deadline": "timeframe"},
		...
	],
	"takeaways": []
}

Focus on:
- Key decisions made
- Action items with clear owners
- Important discussion points
- Next steps`;
		} else {
			return `You are an expert lecture/talk summarizer. Your task is to extract the main ideas and structure from the talk.

Return a JSON object with the following structure:
{
	"summary": "A concise overview of the talk (${verbosityLevel} sentences)",
	"outline": ["main idea 1", "main idea 2", ...],
	"decisions": [],
	"actionItems": [],
	"takeaways": ["key takeaway 1", "key takeaway 2", ...]
}

Focus on:
- Main themes and ideas
- Key arguments and evidence
- Learning outcomes
- Practical applications`;
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
