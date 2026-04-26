// Model IDs and pricing for meeting summarization components

export const MEETING_MODELS = {
	outline: 'gpt-5.4',
	actionItems: 'gpt-5.4-mini',
	executiveSummary: 'gpt-5.4-mini',
} as const;

export const TALK_MODELS = {
	outline: 'gpt-5.4',
	executiveSummary: 'gpt-5.4-mini',
} as const;

// Pricing per 1K tokens (input, output)
// Update these when OpenAI publishes or changes pricing
export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
	'gpt-5.4': { input: 0.01, output: 0.03 },
	'gpt-5.4-mini': { input: 0.001, output: 0.004 },
	'gpt-5.4-nano': { input: 0.0003, output: 0.0012 },
	'gpt-4o': { input: 0.0025, output: 0.01 },
	'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
};

export function computeCost(model: string, promptTokens: number, completionTokens: number): number {
	const pricing = MODEL_PRICING[model] ?? { input: 0, output: 0 };
	const cost = (promptTokens / 1000) * pricing.input + (completionTokens / 1000) * pricing.output;
	return Math.round(cost * 10000) / 10000;
}
