import { App, PluginSettingTab, Setting } from "obsidian";
import AudioRecorderPlugin from "./main";

export interface PluginSettings {
	assemblyAiApiKey: string;
	openAiApiKey: string;
	temperature: number;
	summaryVerbosity: 'brief' | 'detailed';
	audioFolder: string;
	transcriptFolder: string;
	notesFolder: string;
	autoOpenNote: boolean;
}

export const DEFAULT_SETTINGS: PluginSettings = {
	assemblyAiApiKey: '',
	openAiApiKey: '',
	temperature: 0.3,
	summaryVerbosity: 'detailed',
	audioFolder: 'recordings/audio',
	transcriptFolder: 'recordings/transcripts',
	notesFolder: 'recordings',
	autoOpenNote: true,
};

export class AudioRecorderSettingTab extends PluginSettingTab {
	plugin: AudioRecorderPlugin;

	constructor(app: App, plugin: AudioRecorderPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'API Keys' });

		new Setting(containerEl)
			.setName('AssemblyAI API Key')
			.setDesc('Your AssemblyAI API key for transcription and speaker diarization')
			.addText((text) =>
				text
					.setPlaceholder('Enter your AssemblyAI API key')
					.setValue(this.plugin.settings.assemblyAiApiKey)
					.onChange(async (value) => {
						this.plugin.settings.assemblyAiApiKey = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName('OpenAI API Key')
			.setDesc('Your OpenAI API key for summarization')
			.addText((text) =>
				text
					.setPlaceholder('Enter your OpenAI API key')
					.setValue(this.plugin.settings.openAiApiKey)
					.onChange(async (value) => {
						this.plugin.settings.openAiApiKey = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName('Temperature')
			.setDesc('Creativity level for summaries (0.0 = precise, 1.0 = creative)')
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
			.setName('Summary Verbosity')
			.setDesc('How detailed should summaries be?')
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

		containerEl.createEl('h2', { text: 'Output Folders' });

		new Setting(containerEl)
			.setName('Audio Folder')
			.setDesc('Folder to save audio recordings (default: recordings/audio)')
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
			.setDesc('Folder to save transcript files (default: recordings/transcripts)')
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
			.setName('Notes Folder')
			.setDesc('Folder to save summary notes (default: recordings)')
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
			.setName('Auto-open summary note')
			.setDesc('Automatically open the generated summary note after processing')
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
