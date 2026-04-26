import { Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, PluginSettings, AudioRecorderSettingTab } from './settings';
import { registerCommands } from './commands';
import { RecordingView, RECORDING_VIEW_TYPE } from './ui/RecordingView';

export default class AudioRecorderPlugin extends Plugin {
	settings: PluginSettings;

	async onload() {
		await this.loadSettings();

		// Register the ItemView
		this.registerView(RECORDING_VIEW_TYPE, (leaf) => new RecordingView(leaf, this));

		// Add ribbon icon to open the recorder panel
		this.addRibbonIcon('mic', 'Open audio recorder', () => {
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
