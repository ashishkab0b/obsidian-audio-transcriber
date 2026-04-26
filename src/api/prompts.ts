export function getMeetingOutlinePrompt(verbosity: 'brief' | 'detailed'): string {
	const sentenceCount = verbosity === 'brief' ? '2-3' : '4-6';
	return `You are an expert meeting analyst. Your task is to create a comprehensive outline of a meeting, organized by thematic sections rather than chronological order.

Instructions:
- Group related topics together, regardless of when they were discussed
- Each section should have a clear title and 2-4 bullet points capturing key discussion points
- The outline should be thorough and cover all major discussion areas
- Use clear, action-oriented language

Return a JSON object with this structure:
{
	"outline": [
		"**Topic Name**: \u2022 key point 1\u2022 key point 2\u2022 key point 3",
		"**Another Topic**: \u2022 key point 1\u2022 key point 2",
		...
	]
}`;
}

export function getMeetingActionItemsPrompt(): string {
	return `You are an expert at extracting structured commitments from meeting transcripts. Your task is to identify all action items and decisions mentioned during the meeting.

Instructions for action items:
- Extract EVERY action item, commitment, and task mentioned
- Attribute each action item to the person who committed to it (use "Unassigned" if unclear)
- Include deadlines/timeframes if mentioned; use "Not specified" if no deadline given
- Be precise and specific in the task description

Instructions for decisions:
- Extract all decisions made during the meeting
- Include context if needed for clarity
- Do not include action items as decisions

Return a JSON object with this structure:
{
	"actionItems": [
		{"owner": "Name", "task": "Description", "deadline": "timeframe"},
		...
	],
	"decisions": [
		"Decision 1 with context",
		"Decision 2 with context",
		...
	]
}`;
}

export function getMeetingExecutiveSummaryPrompt(verbosity: 'brief' | 'detailed'): string {
	const sentenceCount = verbosity === 'brief' ? '2-3' : '4-6';
	return `You are an expert at writing executive summaries. Given a meeting outline, write a concise summary that captures the meeting's purpose, key outcomes, and overall direction.

Instructions:
- Write exactly ${sentenceCount} sentences
- Focus on the most important topics and outcomes
- Be concise but comprehensive
- Assume the reader wants to understand what happened and what matters

Return a JSON object with this structure:
{
	"summary": "Your ${sentenceCount}-sentence summary here."
}`;
}
