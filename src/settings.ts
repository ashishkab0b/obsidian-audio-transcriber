import { App, PluginSettingTab, Setting } from "obsidian";
import AudioRecorderPlugin from "./main";

export interface PluginSettings {
	temperature: number;
	summaryVerbosity: 'brief' | 'detailed';
	audioFolder: string;
	transcriptFolder: string;
	notesFolder: string;
	autoOpenNote: boolean;
}

export const DEFAULT_SETTINGS: PluginSettings = {
	temperature: 0.3,
	summaryVerbosity: 'detailed',
	audioFolder: 'recordings/audio',
	transcriptFolder: 'recordings/transcripts',
	notesFolder: 'recordings',
	autoOpenNote: true,
};

// Secret key names for storing in Obsidian's secure vault
export const SECRET_KEYS = {
	ASSEMBLYAI_API_KEY: 'obsidian-audio-transcriber-assemblyai-key',
	OPENAI_API_KEY: 'obsidian-audio-transcriber-openai-key',
} as const;

export class AudioRecorderSettingTab extends PluginSettingTab {
	plugin: AudioRecorderPlugin;

	constructor(app: App, plugin: AudioRecorderPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// API Keys section
		containerEl.createEl('h2', { text: 'API Keys' });
		containerEl.createEl('p', { text: 'API keys are stored securely in your operating system keychain and are not synced.' });

		new Setting(containerEl)
			.setName('AssemblyAI API Key')
			.setDesc('API key for speech-to-text transcription and speaker diarization')
			.addText((text) => {
				text
					.setPlaceholder('Enter your AssemblyAI API key')
					.inputEl.type = 'password';
				// Load current value from secrets
				this.plugin.getSecret(SECRET_KEYS.ASSEMBLYAI_API_KEY).then((value) => {
					if (value) text.setValue(value);
				});
				text.onChange(async (value) => {
					if (value.trim()) {
						await this.plugin.setSecret(SECRET_KEYS.ASSEMBLYAI_API_KEY, value);
					}
				});
			});

		new Setting(containerEl)
			.setName('OpenAI API Key')
			.setDesc('API key for meeting analysis (outline, action items, executive summary)')
			.addText((text) => {
				text
					.setPlaceholder('Enter your OpenAI API key')
					.inputEl.type = 'password';
				// Load current value from secrets
				this.plugin.getSecret(SECRET_KEYS.OPENAI_API_KEY).then((value) => {
					if (value) text.setValue(value);
				});
				text.onChange(async (value) => {
					if (value.trim()) {
						await this.plugin.setSecret(SECRET_KEYS.OPENAI_API_KEY, value);
					}
				});
			});

		// Summarization settings section
		containerEl.createEl('h2', { text: 'Summarization' });

		new Setting(containerEl)
			.setName('Temperature')
			.setDesc('Controls randomness in analysis: 0.0 = precise/deterministic, 1.0 = creative/varied')
			.addSlider((slider) =>
				slider
					.setLimits(0, 1, 0.1)
					.setValue(this.plugin.settings.temperature)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.temperature = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName('Summary Length')
			.setDesc('Brief = 2-3 sentences | Detailed = 4-6 sentences')
			.addDropdown((dropdown) =>
				dropdown
					.addOption('brief', 'Brief')
					.addOption('detailed', 'Detailed')
					.setValue(this.plugin.settings.summaryVerbosity)
					.onChange(async (value) => {
						this.plugin.settings.summaryVerbosity = value as 'brief' | 'detailed';
						await this.plugin.saveSettings();
					})
			);

		// Output and behavior section
		containerEl.createEl('h2', { text: 'Output' });

		new Setting(containerEl)
			.setName('Audio Folder')
			.setDesc('Where to save meeting recordings')
			.addText((text) =>
				text
					.setPlaceholder('recordings/audio')
					.setValue(this.plugin.settings.audioFolder)
					.onChange(async (value) => {
						this.plugin.settings.audioFolder = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName('Transcript Folder')
			.setDesc('Where to save diarized transcripts')
			.addText((text) =>
				text
					.setPlaceholder('recordings/transcripts')
					.setValue(this.plugin.settings.transcriptFolder)
					.onChange(async (value) => {
						this.plugin.settings.transcriptFolder = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName('Summary Folder')
			.setDesc('Where to save summary notes')
			.addText((text) =>
				text
					.setPlaceholder('recordings')
					.setValue(this.plugin.settings.notesFolder)
					.onChange(async (value) => {
						this.plugin.settings.notesFolder = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName('Auto-open summary')
			.setDesc('Automatically open the summary note after processing completes')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.autoOpenNote)
					.onChange(async (value) => {
						this.plugin.settings.autoOpenNote = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
