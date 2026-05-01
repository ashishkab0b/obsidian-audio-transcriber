import { DiarizedSegment, TranscriptionModel } from '../types';

const TRANSCRIPTION_MODEL_HOURLY_RATES: Record<TranscriptionModel, number> = {
	'universal-2': 0.15,
	'universal-3-pro': 0.21,
};

const SPEAKER_DIARIZATION_HOURLY_RATE = 0.02;

interface AssemblyAIUploadResponse {
	upload_url: string;
}

interface AssemblyAITranscriptRequest {
	audio_url: string;
	speaker_labels: boolean;
	speech_models?: string[];
}

interface AssemblyAIUtterance {
	speaker: string;
	text: string;
	start: number;
	end: number;
}

interface AssemblyAITranscriptResponse {
	id: string;
	status: 'submitted' | 'processing' | 'completed' | 'error';
	utterances: AssemblyAIUtterance[];
	error?: string;
}

export class AssemblyAIClient {
	private apiKey: string;
	private baseUrl = 'https://api.assemblyai.com/v2';
	private transcriptionModel: TranscriptionModel;

	constructor(apiKey: string, transcriptionModel: TranscriptionModel = 'universal-2') {
		this.apiKey = apiKey;
		this.transcriptionModel = transcriptionModel;
	}

	async uploadAudio(blob: Blob): Promise<string> {
		console.log('Uploading audio to AssemblyAI, blob size:', blob.size, 'type:', blob.type);

		// For debugging: create a download link
		const url = URL.createObjectURL(blob);
		console.log('DEBUG: Audio blob can be played at:', url);

		// AssemblyAI upload endpoint requires application/octet-stream
		const response = await fetch(`${this.baseUrl}/upload`, {
			method: 'POST',
			headers: {
				Authorization: this.apiKey,
				'Content-Type': 'application/octet-stream',
			},
			body: blob,
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error('AssemblyAI upload error:', response.status, errorText);
			throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorText}`);
		}

		const data: AssemblyAIUploadResponse = await response.json();
		console.log('Audio uploaded, upload_url:', data.upload_url);
		return data.upload_url;
	}

	async submitTranscript(uploadUrl: string): Promise<string> {
		const request: AssemblyAITranscriptRequest = {
			audio_url: uploadUrl,
			speaker_labels: true,
			speech_models: [this.transcriptionModel],
		};

		console.log('Submitting transcript with request:', JSON.stringify(request));

		const response = await fetch(`${this.baseUrl}/transcript`, {
			method: 'POST',
			headers: {
				Authorization: this.apiKey,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(request),
		});

		console.log('Submit response status:', response.status, response.statusText);

		if (!response.ok) {
			let errorText = '';
			try {
				const body = await response.text();
				errorText = body || '(empty response body)';
				console.error('AssemblyAI submit error response:', errorText);
			} catch (e) {
				console.error('Failed to read error response:', e);
			}
			throw new Error(
				`Submit failed: ${response.status} ${response.statusText} - ${errorText}`
			);
		}

		const data: AssemblyAITranscriptResponse = await response.json();
		console.log('AssemblyAI transcript submitted:', data.id);
		return data.id;
	}

	async pollTranscript(transcriptId: string): Promise<DiarizedSegment[]> {
		let attempts = 0;
		const maxAttempts = 600; // 30 minutes with 3-second intervals

		while (attempts < maxAttempts) {
			const response = await fetch(`${this.baseUrl}/transcript/${transcriptId}`, {
				headers: {
					Authorization: this.apiKey,
				},
			});

			if (!response.ok) {
				throw new Error(`Poll failed: ${response.statusText}`);
			}

			const data: AssemblyAITranscriptResponse = await response.json();

			if (data.status === 'completed') {
				return this.mapUtterancesToSegments(data.utterances || []);
			} else if (data.status === 'error') {
				throw new Error(`Transcription error: ${data.error}`);
			}

			// Wait 3 seconds before polling again
			await new Promise((resolve) => setTimeout(resolve, 3000));
			attempts++;
		}

		throw new Error('Transcription polling timeout');
	}

	private mapUtterancesToSegments(utterances: AssemblyAIUtterance[]): DiarizedSegment[] {
		const speakerMap = new Map<string, string>();
		let speakerCount = 0;

		return utterances.map((utterance) => {
			if (!speakerMap.has(utterance.speaker)) {
				const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
				speakerMap.set(utterance.speaker, `Speaker ${letters[speakerCount % letters.length]}`);
				speakerCount++;
			}

			return {
				speaker: speakerMap.get(utterance.speaker) || 'Speaker A',
				text: utterance.text,
				start: utterance.start,
				end: utterance.end,
			};
		});
	}

	async transcribeAudio(blob: Blob): Promise<DiarizedSegment[]> {
		const uploadUrl = await this.uploadAudio(blob);
		const transcriptId = await this.submitTranscript(uploadUrl);
		return this.pollTranscript(transcriptId);
	}

	calculateTranscriptionCost(segments: DiarizedSegment[]): number {
		// Calculate total duration of audio in seconds
		if (segments.length === 0) return 0;

		const maxEndTime = Math.max(...segments.map(s => s.end));
		const durationSeconds = maxEndTime / 1000; // convert from ms to seconds
		const durationHours = durationSeconds / 3600;

		const hourlyRate = TRANSCRIPTION_MODEL_HOURLY_RATES[this.transcriptionModel] + SPEAKER_DIARIZATION_HOURLY_RATE;
		return Math.round(durationHours * hourlyRate * 10000) / 10000;
	}
}
