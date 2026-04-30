import { DiarizedSegment, SessionType, SummaryResult, TimestampedNote, RecordingSession } from '../types';

export class MarkdownBuilder {
	static getSessionTypeLabel(sessionType: SessionType): string {
		if (sessionType === 'meeting') {
			return 'Meeting';
		}
		if (sessionType === 'lecture') {
			return 'Talk / Lecture';
		}
		return 'Transcription';
	}

	static buildTranscriptNote(segments: DiarizedSegment[], notes: TimestampedNote[]): string {
		const notesMap = new Map<number, string>();
		notes.forEach((note) => {
			notesMap.set(Math.floor(note.time), note.text);
		});

		let markdown = '# Full Transcript\n\n';

		segments.forEach((segment) => {
			const startSec = Math.floor(segment.start / 1000);
			const timeStr = this.formatTime(segment.start);

			markdown += `**${segment.speaker}** [${timeStr}]\n`;
			markdown += `${segment.text}\n\n`;

			// Check if there's a note near this timestamp (within 5 seconds)
			for (let s = Math.max(0, startSec - 5); s <= startSec + 5; s++) {
				if (notesMap.has(s)) {
					markdown += `> **Note:** ${notesMap.get(s)}\n\n`;
					notesMap.delete(s);
					break;
				}
			}
		});

		// Add any remaining notes
		notesMap.forEach((text, time) => {
			const timeStr = this.formatTime(time * 1000);
			markdown += `[${timeStr}] **Note:** ${text}\n\n`;
		});

		return markdown;
	}

	static buildTranscriptionNote(
		session: RecordingSession,
		audioPath: string,
		transcriptPath: string
	): string {
		const date = session.startTime.toISOString().split('T')[0];
		let markdown = `# Transcription — ${date}\n\n`;

		markdown += '## Full Transcript\n';
		markdown += `[[${transcriptPath}]]\n\n`;

		markdown += '## Linked Audio\n';
		markdown += `![[${audioPath}]]\n`;

		return markdown;
	}

	static buildSummaryNote(
		session: RecordingSession,
		summaryResult: SummaryResult,
		audioPath: string,
		transcriptPath: string,
		sessionType: SessionType
	): string {
		const date = session.startTime.toISOString().split('T')[0];
		const typeLabel = this.getSessionTypeLabel(sessionType);

		let markdown = `# ${typeLabel} — ${date}\n\n`;

		markdown += '## Summary\n';
		markdown += `${summaryResult.summary}\n\n`;

		markdown += '## Outline\n';
		summaryResult.outline.forEach((point) => {
			markdown += `- ${point}\n`;
		});
		markdown += '\n';

		if (sessionType === 'meeting') {
			if (summaryResult.decisions.length > 0) {
				markdown += '## Decisions\n';
				summaryResult.decisions.forEach((decision) => {
					markdown += `- ${decision}\n`;
				});
				markdown += '\n';
			}

			if (summaryResult.actionItems.length > 0) {
				markdown += '## Action Items\n';
				summaryResult.actionItems.forEach((item) => {
					const deadline = item.deadline ? ` (${item.deadline})` : '';
					markdown += `- [ ] **${item.owner}** — ${item.task}${deadline}\n`;
				});
				markdown += '\n';
			}
		} else {
			if (summaryResult.takeaways.length > 0) {
				markdown += '## Key Takeaways\n';
				summaryResult.takeaways.forEach((takeaway) => {
					markdown += `- ${takeaway}\n`;
				});
				markdown += '\n';
			}
		}

		markdown += '## Full Transcript\n';
		markdown += `[[${transcriptPath}]]\n\n`;

		markdown += '## Linked Audio\n';
		markdown += `![[${audioPath}]]\n`;

		return markdown;
	}

	private static formatTime(ms: number): string {
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
