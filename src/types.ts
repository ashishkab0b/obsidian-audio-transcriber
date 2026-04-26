export type SessionType = 'meeting' | 'lecture';

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

export interface SummaryResult {
	summary: string;
	outline: string[];
	decisions: string[]; // meeting only
	actionItems: ActionItem[]; // meeting only
	takeaways: string[]; // lecture only
}

export interface APICost {
	service: 'assemblyai' | 'openai';
	amount: number; // in USD
	description: string;
}

export interface RecordingSession {
	sessionType: SessionType;
	startTime: Date;
	notes: TimestampedNote[];
	audioBlob: Blob | null;
	segments: DiarizedSegment[];
	summary: SummaryResult | null;
	apiCosts: APICost[];
}
