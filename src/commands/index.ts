import { Plugin, MarkdownView } from 'obsidian';
import { RECORDING_VIEW_TYPE, RecordingView } from '../ui/RecordingView';

export function registerCommands(plugin: Plugin): void {
	plugin.addCommand({
		id: 'open-recorder',
		name: 'Open recorder panel',
		callback: () => activateView(plugin),
	});

	plugin.addCommand({
		id: 'start-meeting-in-note',
		name: 'Start meeting recording in this note',
		editorCallback: (editor, view: MarkdownView) => {
			if (!view.file) {
				alert('Cannot determine note file');
				return;
			}
			activateView(plugin).then(() => {
				const leaves = plugin.app.workspace.getLeavesOfType(RECORDING_VIEW_TYPE);
				const firstLeaf = leaves[0];
				if (firstLeaf && firstLeaf.view) {
					const recorderView = firstLeaf.view as RecordingView;
					recorderView.setTargetNote(view.file);
					recorderView.startRecordingWithSessionType('meeting');
				}
			});
		},
	});

	plugin.addCommand({
		id: 'start-talk-in-note',
		name: 'Start talk recording in this note',
		editorCallback: (editor, view: MarkdownView) => {
			if (!view.file) {
				alert('Cannot determine note file');
				return;
			}
			activateView(plugin).then(() => {
				const leaves = plugin.app.workspace.getLeavesOfType(RECORDING_VIEW_TYPE);
				const firstLeaf = leaves[0];
				if (firstLeaf && firstLeaf.view) {
					const recorderView = firstLeaf.view as RecordingView;
					recorderView.setTargetNote(view.file);
					recorderView.startRecordingWithSessionType('lecture');
				}
			});
		},
	});

	plugin.addCommand({
		id: 'start-transcription-in-note',
		name: 'Start transcription in this note',
		editorCallback: (editor, view: MarkdownView) => {
			if (!view.file) {
				alert('Cannot determine note file');
				return;
			}
			activateView(plugin).then(() => {
				const leaves = plugin.app.workspace.getLeavesOfType(RECORDING_VIEW_TYPE);
				const firstLeaf = leaves[0];
				if (firstLeaf && firstLeaf.view) {
					const recorderView = firstLeaf.view as RecordingView;
					recorderView.setTargetNote(view.file);
					recorderView.startRecordingWithSessionType('transcription');
				}
			});
		},
	});

	plugin.addCommand({
		id: 'add-note',
		name: 'Add timestamped note',
		hotkeys: [{ modifiers: ['Ctrl', 'Shift'], key: 'n' }],
		callback: () => {
			const view = plugin.app.workspace.getActiveViewOfType(RecordingView);
			if (view) {
				view.focusNoteInput();
			}
		},
	});
}

async function activateView(plugin: Plugin): Promise<void> {
	const { workspace } = plugin.app;

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
