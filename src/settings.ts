import { App, PluginSettingTab, Setting } from "obsidian";
import AudioRecorderPlugin from "./main";
import { TranscriptionModel } from "./types";

export interface PluginSettings {
	temperature: number;
	summaryVerbosity: 'brief' | 'detailed';
	transcriptionModel: TranscriptionModel;
	audioFolder: string;
	transcriptFolder: string;
	notesFolder: string;
	autoOpenNote: boolean;
}

export const DEFAULT_SETTINGS: PluginSettings = {
	temperature: 0.3,
	summaryVerbosity: 'detailed',
	transcriptionModel: 'universal-3-pro',
	audioFolder: 'recordings/audio',
	transcriptFolder: 'recordings/transcripts',
	notesFolder: 'recordings',
	autoOpenNote: true,
};

// Secret key names for storing in Obsidian's secure vault
export const SECRET_KEYS = {
	ASSEMBLYAI_API_KEY: 'assemblyai-api-key',
	OPENAI_API_KEY: 'openai-api-key',
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

		// API Keys info
		containerEl.createEl('h2', { text: 'API Keys' });
		containerEl.createEl('p', { text: 'This plugin requires an AssemblyAI key for transcription. Meeting and talk analysis also require an OpenAI key. Manage them in Obsidian Settings → Keychain.' });
		containerEl.createEl('p', { text: `Secret names: "${SECRET_KEYS.ASSEMBLYAI_API_KEY}" and "${SECRET_KEYS.OPENAI_API_KEY}"` });

		// Transcription settings section
		containerEl.createEl('h2', { text: 'Transcription' });

		new Setting(containerEl)
			.setName('AssemblyAI model')
			.setDesc('Universal-2 is cheaper. Universal-3 Pro can improve accuracy for harder audio.')
			.addDropdown((dropdown) =>
				dropdown
					.addOption('universal-2', 'Universal-2')
					.addOption('universal-3-pro', 'Universal-3 Pro')
					.setValue(this.plugin.settings.transcriptionModel)
					.onChange(async (value) => {
						this.plugin.settings.transcriptionModel = value as TranscriptionModel;
						await this.plugin.saveSettings();
					})
			);

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
