export function getMeetingOutlinePrompt(verbosity: 'brief' | 'detailed'): string {
	void verbosity;
	return `You are an expert meeting analyst. Your task is to create a comprehensive outline of a meeting, organized by thematic sections rather than chronological order.

Instructions:
- Group related topics together, regardless of when they were discussed
- Each section should have a clear title and 2-4 bullet points capturing key discussion points
- The outline should be thorough and cover all major discussion areas
- Use clear, action-oriented language
- If a bullet needs sub-points, keep the line breaks inside that bullet string and use hyphens for sub-points

Return a JSON object with this structure:
{
	"outline": [
		{
			"title": "Topic name",
			"bullets": [
				"Key point 1",
				"Key point 2",
				"Key point 3"
			]
		},
		{
			"title": "Another topic",
			"bullets": [
				"Key point 1",
				"Key point 2"
			]
		}
		...
	]
}

Do not include Unicode bullet characters such as •, ◦, or ●. When bullet markers are needed inside a multi-line bullet string, use hyphens only.`;
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

export function getTalkOutlinePrompt(verbosity: 'brief' | 'detailed'): string {
	void verbosity;
	return `You are an expert talk analyst. Your task is to create a comprehensive outline of a talk or lecture, organized by thematic sections.

Instructions:
- Group related ideas together, regardless of presentation order
- Each section should have a clear title and 2-4 bullet points capturing key concepts
- The outline should be thorough and cover all major themes discussed
- Use clear, concept-focused language
- If a bullet needs sub-points, keep the line breaks inside that bullet string and use hyphens for sub-points

Return a JSON object with this structure:
{
	"outline": [
		{
			"title": "Topic name",
			"bullets": [
				"Key concept 1",
				"Key concept 2",
				"Key concept 3"
			]
		},
		{
			"title": "Another topic",
			"bullets": [
				"Key concept 1",
				"Key concept 2"
			]
		}
		...
	]
}

Do not include Unicode bullet characters such as •, ◦, or ●. When bullet markers are needed inside a multi-line bullet string, use hyphens only.`;
}

export function getTalkExecutiveSummaryPrompt(verbosity: 'brief' | 'detailed'): string {
	const sentenceCount = verbosity === 'brief' ? '2-3' : '4-6';
	return `You are an expert at synthesizing talks and lectures. Given a talk outline, write a concise summary that captures the main message and key insights, then extract the main takeaways.

Instructions for summary:
- Write exactly ${sentenceCount} sentences
- Capture the overall message, main themes, and key insights
- Be concise but comprehensive
- Assume the reader wants the core value and learning from the talk

Instructions for takeaways:
- Extract 3-5 of the most important, actionable takeaways
- These should be practical insights or lessons the audience can remember and apply
- Each takeaway should be a clear, standalone insight

Return a JSON object with this structure:
{
	"summary": "Your ${sentenceCount}-sentence summary here.",
	"takeaways": [
		"Takeaway 1",
		"Takeaway 2",
		"Takeaway 3",
		...
	]
}`;
}
