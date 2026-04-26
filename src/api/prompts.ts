import { SessionType } from '../types';

export function getSystemPrompt(sessionType: SessionType, verbosity: 'brief' | 'detailed'): string {
	const verbosityLevel = verbosity === 'brief' ? '2-3' : '4-6';

	if (sessionType === 'meeting') {
		return MEETING_SYSTEM_PROMPT(verbosityLevel);
	} else {
		return LECTURE_SYSTEM_PROMPT(verbosityLevel);
	}
}

function MEETING_SYSTEM_PROMPT(verbosityLevel: string): string {
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
}

function LECTURE_SYSTEM_PROMPT(verbosityLevel: string): string {
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
