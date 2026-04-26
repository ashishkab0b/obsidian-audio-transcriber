import { SessionType } from '../types';

export function getSystemPrompt(sessionType: SessionType, verbosity: 'brief' | 'detailed'): string {
	const verbosityLevel = verbosity === 'brief' ? '2-3' : '4-6';

	if (sessionType === 'meeting') {
		return MEETING_SYSTEM_PROMPT(verbosityLevel);
	} else {
		return LECTURE_SYSTEM_PROMPT(verbosityLevel);
	}
}

export function getChapterExtractionPrompt(sessionType: SessionType): string {
	if (sessionType === 'meeting') {
		return `You are an expert meeting section analyzer. Extract key information from this section of a meeting.

Return a JSON object with the following structure:
{
	"chapterTitle": "A brief title for this section",
	"summary": "2-3 sentences summarizing the key points in this section",
	"actionItems": [
		{"owner": "Name", "task": "Description", "deadline": "timeframe"},
		...
	],
	"decisions": ["decision 1", "decision 2", ...]
}

Focus on:
- All action items with explicit owner attribution (use "Unassigned" if unclear)
- All decisions made in this section
- Main discussion points
Be precise and specific. Extract every action item mentioned.`;
	} else {
		return `You are an expert lecture/talk section analyzer. Extract key information from this section of a talk.

Return a JSON object with the following structure:
{
	"chapterTitle": "A brief title for this section",
	"summary": "2-3 sentences summarizing the key ideas in this section",
	"actionItems": [],
	"decisions": []
}

Focus on:
- Main ideas and concepts covered in this section
- Key arguments or evidence presented
- Learning outcomes or practical applications mentioned
Be precise and specific. Extract the essence of what was discussed.`;
	}
}

export function getReducePrompt(sessionType: SessionType, verbosity: 'brief' | 'detailed'): string {
	const verbosityLevel = verbosity === 'brief' ? '2-3' : '4-6';
	const basePrompt = `You are an expert at synthesizing section-level summaries into a comprehensive whole.

You will receive summaries and extracts from multiple sections of a ${sessionType}. Your task is to combine them into a final, cohesive summary.

CRITICAL INSTRUCTION FOR OUTLINE: Organize the outline by topic, not by chronological order. If the same concept, theme, or agenda item was discussed across multiple sections, merge them into a single outline entry. The outline should flow logically by subject matter, not by section order.

Return a JSON object with the following structure:`;

	if (sessionType === 'meeting') {
		return `${basePrompt}
{
	"summary": "A comprehensive overview of the entire meeting (${verbosityLevel} sentences)",
	"outline": ["topic 1 (merged if discussed in multiple sections)", "topic 2", ...],
	"decisions": ["decision 1", "decision 2", ...],
	"actionItems": [
		{"owner": "Name", "task": "Description", "deadline": "timeframe"},
		...
	],
	"takeaways": []
}

When processing action items and decisions from multiple sections:
- Deduplicate items that appear in multiple sections (same owner and task with minimal rewording)
- Keep only the most specific version of duplicated items
- Preserve all unique items`;
	} else {
		return `${basePrompt}
{
	"summary": "A comprehensive overview of the entire talk (${verbosityLevel} sentences)",
	"outline": ["topic 1 (merged if discussed in multiple sections)", "topic 2", ...],
	"decisions": [],
	"actionItems": [],
	"takeaways": ["takeaway 1", "takeaway 2", ...]
}

Focus on creating a logical, topic-based outline that captures all main ideas discussed, regardless of the order they appeared.`;
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
