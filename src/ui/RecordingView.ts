import { ItemView, ViewStateResult, WorkspaceLeaf, MarkdownView } from 'obsidian';
import AudioRecorderPlugin from '../main';
import { SessionType, TimestampedNote, RecordingSession } from '../types';
import { AudioRecorder } from '../recording/AudioRecorder';
import { AssemblyAIClient } from '../api/assemblyai';
import { Summarizer } from '../api/summarizer';
import { NoteWriter } from '../output/NoteWriter';
import { MarkdownBuilder } from '../output/MarkdownBuilder';

export const RECORDING_VIEW_TYPE = 'audio-transcriber-view';

type ViewState = 'idle' | 'recording' | 'processing' | 'done';

export class RecordingView extends ItemView {
	private plugin: AudioRecorderPlugin;
	private state: ViewState = 'idle';
	private session: RecordingSession | null = null;
	private recorder: AudioRecorder | null = null;
	private timerInterval: number | null = null;
	private animationFrame: number | null = null;
	private targetNoteFile: any = null;

	constructor(leaf: WorkspaceLeaf, plugin: AudioRecorderPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return RECORDING_VIEW_TYPE;
	}

	getDisplayText(): string {
		return 'Audio Transcriber';
	}

	getIcon(): string {
		return 'mic';
	}

	async onOpen(): Promise<void> {
		this.render();
	}

	async onClose(): Promise<void> {
		this.cleanup();
	}

	setTargetNote(file: any): void {
		this.targetNoteFile = file;
		console.log('Target note set to:', file.path);
	}

	async startRecordingWithSessionType(sessionType: SessionType = 'meeting'): Promise<void> {
		await this.startRecording(sessionType);
	}

	focusNoteInput(): void {
		const noteInput = this.containerEl.querySelector('.note-input') as HTMLTextAreaElement;
		if (noteInput) {
			noteInput.focus();
		}
	}

	private cleanup(): void {
		if (this.timerInterval !== null) {
			clearInterval(this.timerInterval);
		}
		if (this.animationFrame !== null) {
			cancelAnimationFrame(this.animationFrame);
		}
	}

	private render(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.addClass('audio-transcriber-view');

		switch (this.state) {
			case 'idle':
				this.renderIdle();
				break;
			case 'recording':
				this.renderRecording();
				break;
			case 'processing':
				this.renderProcessing();
				break;
			case 'done':
				this.renderDone();
				break;
		}
	}

	private renderIdle(): void {
		const { containerEl } = this;

		const content = containerEl.createDiv('content');

		content.createEl('h3', { text: 'Audio Transcriber' });

		const hint = content.createEl('p');
		hint.innerHTML = '<strong>How to use:</strong><br/>1. Open a note<br/>2. Run command: <code>Start recording in this note</code><br/>3. Recording begins automatically';
		hint.style.color = 'var(--text-muted)';
		hint.style.fontSize = '0.9em';
		hint.style.lineHeight = '1.5';
	}

	private renderRecording(): void {
		const { containerEl } = this;

		const content = containerEl.createDiv('content');

		// Timer (smaller, more discrete)
		const timerEl = content.createDiv('timer');
		timerEl.textContent = '00:00:00';
		timerEl.addClass('timer-compact');

		// Stop button
		const buttonGroup = content.createDiv('button-group');
		const stopBtn = buttonGroup.createEl('button', { text: '● Stop' });
		stopBtn.type = 'button';
		stopBtn.addEventListener('click', () => this.stopRecording());

		// Note input
		const noteLabel = content.createEl('label', { text: 'Add a note' });
		const noteInput = content.createEl('textarea', { attr: { placeholder: 'Press Enter to add note...' } });
		noteInput.addClass('note-input');

		noteInput.addEventListener('keydown', (e: KeyboardEvent) => {
			if (e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault();
				const text = noteInput.value.trim();
				if (text) {
					this.addNote(text);
					noteInput.value = '';
				}
			}
		});

		noteInput.addEventListener('keydown', (e: KeyboardEvent) => {
			// Allow Shift+Enter for multiline
			if (e.key === 'Enter' && e.shiftKey) {
				return;
			}
		});

		// Notes list
		const notesLabel = content.createEl('h4', { text: 'Notes' });
		const notesList = content.createDiv('notes-list');
		notesList.id = 'notes-list';

		// Update timer
		this.updateTimer(timerEl);

		// Auto-focus the note input
		noteInput.focus();
	}

	private renderProcessing(): void {
		const { containerEl } = this;

		const content = containerEl.createDiv('content');
		content.createEl('h3', { text: 'Processing...' });

		const status = content.createDiv('status');
		status.id = 'processing-status';
		status.textContent = 'Uploading audio...';

		content.createEl('div', { attr: { class: 'spinner' } });
	}

	private renderDone(): void {
		const { containerEl } = this;

		const content = containerEl.createDiv('content');
		content.createEl('h3', { text: 'Done!' });

		const message = content.createEl('p');
		message.textContent = 'Your recording has been processed and saved into your note.';

		// Display API costs if available
		if (this.session && this.session.apiCosts && this.session.apiCosts.length > 0) {
			const costsSection = content.createDiv('costs-section');
			costsSection.createEl('h4', { text: 'Processing Costs' });

			let totalCost = 0;
			this.session.apiCosts.forEach((cost) => {
				const costLine = costsSection.createDiv('cost-line');
				const service = costLine.createSpan('cost-service');
				service.textContent = `${cost.service.toUpperCase()}:`;
				const amount = costLine.createSpan('cost-amount');
				amount.textContent = `$${cost.amount.toFixed(4)}`;
				totalCost += cost.amount;
			});

			const totalLine = costsSection.createDiv('cost-total');
			totalLine.createEl('strong', { text: `Total: $${totalCost.toFixed(4)}` });
		}

		const buttons = content.createDiv('button-group');
		const resetBtn = buttons.createEl('button', { text: 'New Recording' });
		resetBtn.type = 'button';
		resetBtn.addEventListener('click', () => {
			this.state = 'idle';
			this.session = null;
			this.targetNoteFile = null;
			this.render();
		});
	}

	private async startRecording(sessionType: SessionType): Promise<void> {
		// If in done or processing state, reset to idle first
		if (this.state === 'done' || this.state === 'processing') {
			this.state = 'idle';
			this.session = null;
		}

		// Prevent starting if already recording
		if (this.state === 'recording') {
			alert('Recording already in progress. Stop the current recording first.');
			return;
		}

		if (!this.targetNoteFile) {
			console.error('No target note set');
			alert('Use command "Start recording in this note" from within a note to begin');
			return;
		}

		console.log('Recording into note:', this.targetNoteFile.path);

		this.session = {
			sessionType,
			startTime: new Date(),
			notes: [],
			audioBlob: null,
			segments: [],
			chapters: [],
			summary: null,
			apiCosts: [],
		};

		this.recorder = new AudioRecorder();

		try {
			await this.recorder.start();
			this.state = 'recording';
			this.render();
		} catch (error) {
			console.error('Failed to start recording:', error);
			this.state = 'idle';
			this.render();
		}
	}

	private async stopRecording(): Promise<void> {
		if (!this.recorder || !this.session) {
			return;
		}

		this.cleanup();

		try {
			const audioBlob = await this.recorder.stop();
			this.session.audioBlob = audioBlob;

			this.state = 'processing';
			this.render();

			await this.processRecording();
		} catch (error) {
			console.error('Failed to stop recording:', error);
			this.state = 'idle';
			this.render();
		}
	}

	private async processRecording(): Promise<void> {
		if (!this.session || !this.session.audioBlob) {
			return;
		}

		try {
			this.updateStatus('Uploading audio...');

			const assemblyAiClient = new AssemblyAIClient(this.plugin.settings.assemblyAiApiKey);

			this.updateStatus('Transcribing...');
			const { segments, chapters } = await assemblyAiClient.transcribeAudio(this.session.audioBlob);
			this.session.segments = segments;
			this.session.chapters = chapters;

			// Track AssemblyAI costs
			const aaiCost = assemblyAiClient.calculateTranscriptionCost(this.session.segments);
			this.session.apiCosts.push({
				service: 'assemblyai',
				amount: aaiCost,
				description: `Audio transcription (${this.session.segments.length} segments)`,
			});

			this.updateStatus('Summarizing...');
			const summarizer = new Summarizer(
				this.plugin.settings.openAiApiKey,
				this.plugin.settings.openAiModel,
				this.plugin.settings.temperature
			);

			const transcript = this.session.segments.map(s => s.text).join(' ');
			const notesText = this.session.notes.map(n => n.text).join(' ');
			const totalInputLength = transcript.length + notesText.length;

			// Rough token estimation: ~4 characters per token
			const estimatedInputTokens = Math.ceil(totalInputLength / 4);
			// Summary is typically 30-50% of input size
			const estimatedOutputTokens = Math.ceil(estimatedInputTokens * 0.4);

			this.session.summary = await summarizer.summarize(
				this.session.segments,
				this.session.notes,
				this.session.sessionType,
				this.plugin.settings.summaryVerbosity,
				this.session.chapters
			);

			// Track OpenAI costs
			const openaiCost = summarizer.estimateCost(estimatedInputTokens, estimatedOutputTokens);
			this.session.apiCosts.push({
				service: 'openai',
				amount: openaiCost,
				description: `Summary generation (~${estimatedInputTokens}K input, ~${estimatedOutputTokens}K output tokens)`,
			});

			this.updateStatus('Saving files...');
			await this.saveOutput();

			this.state = 'done';
			this.render();
		} catch (error) {
			console.error('Processing failed:', error);
			this.updateStatus(`Error: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	private async saveOutput(): Promise<void> {
		if (!this.session || !this.session.audioBlob || !this.session.summary || !this.targetNoteFile) {
			throw new Error('Session data incomplete');
		}

		const noteWriter = new NoteWriter(this.app.vault);
		const date = this.session.startTime.toISOString().split('T')[0];
		const timestamp = this.session.startTime.getTime();

		// Save audio file
		const audioFilename = `${this.session.sessionType}_${date}_${timestamp}.webm`;
		const audioPath = await noteWriter.saveAudio(
			this.session.audioBlob,
			this.plugin.settings.audioFolder,
			audioFilename
		);

		// Build and save transcript
		const transcriptContent = MarkdownBuilder.buildTranscriptNote(this.session.segments, this.session.notes);
		const transcriptFilename = `${this.session.sessionType}_${date}_${timestamp}_transcript.md`;
		const transcriptPath = await noteWriter.createNote(
			this.plugin.settings.transcriptFolder,
			transcriptFilename,
			transcriptContent
		);

		// Build summary (but don't save as separate file)
		const summaryContent = MarkdownBuilder.buildSummaryNote(
			this.session,
			this.session.summary,
			audioPath,
			transcriptPath,
			this.session.sessionType
		);

		// Insert summary into the active note
		const currentNoteContent = await this.app.vault.read(this.targetNoteFile);
		const newContent = currentNoteContent + '\n\n' + summaryContent;
		await this.app.vault.modify(this.targetNoteFile, newContent);

		console.log('Summary inserted into note:', this.targetNoteFile.path);
	}

	private updateTimer(timerEl: HTMLElement): void {
		this.timerInterval = window.setInterval(() => {
			if (this.recorder) {
				const seconds = this.recorder.getElapsedSeconds();
				const hours = Math.floor(seconds / 3600);
				const minutes = Math.floor((seconds % 3600) / 60);
				const secs = seconds % 60;
				timerEl.textContent = `${hours.toString().padStart(2, '0')}:${minutes
					.toString()
					.padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
			}
		}, 1000);

		this.plugin.registerInterval(this.timerInterval);
	}



	private addNote(text: string): void {
		if (!this.recorder || !this.session) {
			return;
		}

		const note: TimestampedNote = {
			time: this.recorder.getElapsedSeconds(),
			text,
		};

		this.session.notes.push(note);

		// Update notes list in UI
		const notesList = this.containerEl.querySelector('#notes-list');
		if (notesList) {
			const noteEl = notesList.createDiv('note-item');
			const time = note.time;
			const hours = Math.floor(time / 3600);
			const minutes = Math.floor((time % 3600) / 60);
			const seconds = time % 60;
			const timeStr = `${hours.toString().padStart(2, '0')}:${minutes
				.toString()
				.padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
			noteEl.textContent = `${timeStr}  ${text}`;
		}
	}

	private updateStatus(message: string): void {
		const statusEl = this.containerEl.querySelector('#processing-status');
		if (statusEl) {
			statusEl.textContent = message;
		}
	}
}
