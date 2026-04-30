import { Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, PluginSettings, AudioRecorderSettingTab, SECRET_KEYS } from './settings';
import { registerCommands } from './commands';
import { RecordingView, RECORDING_VIEW_TYPE } from './ui/RecordingView';

export default class AudioRecorderPlugin extends Plugin {
	settings: PluginSettings;

	async onload() {
		await this.loadSettings();

		// Register the ItemView
		this.registerView(RECORDING_VIEW_TYPE, (leaf) => new RecordingView(leaf, this));

		// Add ribbon icon to open the transcriber panel
		this.addRibbonIcon('mic', 'Open audio transcriber', () => {
			this.activateRecordingView();
		});

		// Add settings tab
		this.addSettingTab(new AudioRecorderSettingTab(this.app, this));

		// Register commands
		registerCommands(this);
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	// Secure API key storage using Obsidian's SecretStorage API
	async getSecret(key: string): Promise<string | null> {
		try {
			// secretStorage API may not be fully typed in all versions
			const value = await (this.app as any).secretStorage.getSecret(key);
			return value ?? null;
		} catch (error) {
			console.error('Failed to retrieve secret:', error);
			return null;
		}
	}

	async setSecret(key: string, value: string): Promise<void> {
		try {
			// secretStorage API may not be fully typed in all versions
			await (this.app as any).secretStorage.setSecret(key, value);
		} catch (error) {
			console.error('Failed to save secret:', error);
			throw error;
		}
	}

	async deleteSecret(key: string): Promise<void> {
		try {
			// secretStorage API may not be fully typed in all versions
			await (this.app as any).secretStorage.deleteSecret(key);
		} catch (error) {
			console.error('Failed to delete secret:', error);
			throw error;
		}
	}

	// Helper methods to get API keys
	async getAssemblyAIApiKey(): Promise<string | null> {
		return this.getSecret(SECRET_KEYS.ASSEMBLYAI_API_KEY);
	}

	async getOpenAIApiKey(): Promise<string | null> {
		return this.getSecret(SECRET_KEYS.OPENAI_API_KEY);
	}

	private async activateRecordingView(): Promise<void> {
		const { workspace } = this.app;

		let leaf = null;
		const leaves = workspace.getLeavesOfType(RECORDING_VIEW_TYPE);

		if (leaves.length > 0) {
			leaf = leaves[0];
		} else {
			leaf = workspace.getRightLeaf(false);
			if (leaf) {
				await leaf.setViewState({
					type: RECORDING_VIEW_TYPE,
				});
			} else {
				console.error('Failed to create workspace leaf');
				return;
			}
		}

		if (leaf) {
			workspace.revealLeaf(leaf);
		}
	}
}
