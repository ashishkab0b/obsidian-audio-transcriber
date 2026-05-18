export type SessionType = 'meeting' | 'lecture' | 'transcription';
export type TranscriptionModel = 'universal-2' | 'universal-3-pro';

export interface TimestampedNote {
	time: number; // seconds from recording start
	text: string;
}

export interface DiarizedSegment {
	speaker: string; // "Speaker A", "Speaker B", etc.
	text: string;
	start: number; // ms
	end: number; // ms
}

export interface ActionItem {
	owner: string;
	task: string;
	deadline: string;
}

export interface OutlineSection {
	title: string;
	bullets: string[];
}

export interface SummaryResult {
	summary: string;
	outline: OutlineSection[];
	decisions: string[]; // meeting only
	actionItems: ActionItem[]; // meeting only
	takeaways: string[]; // lecture only
}

export interface APICost {
	service: 'assemblyai' | 'openai';
	component: string; // 'Transcription', 'Outline', 'Action Items', 'Executive Summary'
	model?: string; // e.g. 'gpt-5.4', null for assemblyai
	amount: number; // in USD
	promptTokens?: number;
	completionTokens?: number;
}

export interface RecordingSession {
	sessionType: SessionType;
	startTime: Date;
	expectedDurationMinutes: number;
	autoStopWarningAtSeconds: number;
	autoStopDeadlineSeconds: number;
	autoStopWarningShown: boolean;
	autoStopTriggered: boolean;
	notes: TimestampedNote[];
	audioBlob: Blob | null;
	segments: DiarizedSegment[];
	summary: SummaryResult | null;
	apiCosts: APICost[];
}
