import { App, Modal, Setting } from 'obsidian';

const MIN_DURATION_MINUTES = 1;
const MAX_DURATION_MINUTES = 24 * 60;

export class RecordingDurationModal extends Modal {
	private resolved = false;
	private inputValue: string;

	constructor(
		app: App,
		private defaultDurationMinutes: number,
		private onSubmit: (durationMinutes: number | null) => void
	) {
		super(app);
		this.inputValue = String(defaultDurationMinutes);
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h2', { text: 'Set recording duration' });
		contentEl.createEl('p', {
			text: 'The plugin will warn you at this time and auto-stop 10 minutes later if you do nothing.',
		});

		const errorEl = contentEl.createDiv('recording-duration-error');

		new Setting(contentEl)
			.setName('Expected duration')
			.setDesc('Minutes')
			.addText((text) => {
				text
					.setPlaceholder(String(this.defaultDurationMinutes))
					.setValue(this.inputValue)
					.onChange((value) => {
						this.inputValue = value;
						errorEl.empty();
					});

				text.inputEl.type = 'number';
				text.inputEl.min = String(MIN_DURATION_MINUTES);
				text.inputEl.max = String(MAX_DURATION_MINUTES);
				text.inputEl.step = '1';
				text.inputEl.addEventListener('keydown', (event: KeyboardEvent) => {
					if (event.key === 'Enter') {
						event.preventDefault();
						this.submit(errorEl);
					}
				});
			});

		new Setting(contentEl)
			.addButton((button) =>
				button
					.setButtonText('Cancel')
					.onClick(() => this.close())
			)
			.addButton((button) =>
				button
					.setButtonText('Start recording')
					.setCta()
					.onClick(() => this.submit(errorEl))
			);
	}

	onClose(): void {
		this.contentEl.empty();

		if (!this.resolved) {
			this.resolved = true;
			this.onSubmit(null);
		}
	}

	private submit(errorEl: HTMLElement): void {
		const durationMinutes = Number(this.inputValue);

		if (
			!Number.isInteger(durationMinutes) ||
			durationMinutes < MIN_DURATION_MINUTES ||
			durationMinutes > MAX_DURATION_MINUTES
		) {
			errorEl.textContent = 'Enter a whole number from 1 to 1440.';
			return;
		}

		this.resolved = true;
		this.onSubmit(durationMinutes);
		this.close();
	}
}
