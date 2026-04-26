import { App, Modal, Setting } from 'obsidian';

export class NoteModal extends Modal {
	onSubmit: (text: string) => void;
	timeDisplay: string;

	constructor(app: App, timeDisplay: string, onSubmit: (text: string) => void) {
		super(app);
		this.timeDisplay = timeDisplay;
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl('h2', { text: `Add note at ${this.timeDisplay}` });

		let inputValue = '';

		new Setting(contentEl).addText((text) =>
			text
				.setPlaceholder('Enter your note...')
				.onChange((value) => {
					inputValue = value;
				})
		);

		new Setting(contentEl).addButton((btn) =>
			btn
				.setButtonText('Save Note')
				.setCta()
				.onClick(() => {
					if (inputValue.trim()) {
						this.onSubmit(inputValue.trim());
						this.close();
					}
				})
		);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
