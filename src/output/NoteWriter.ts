import { Vault, TAbstractFile, TFolder } from 'obsidian';

export class NoteWriter {
	constructor(private vault: Vault) {}

	async ensureFolderExists(folderPath: string): Promise<TFolder> {
		const parts = folderPath.split('/').filter((p) => p.length > 0);
		let currentPath = '';

		for (const part of parts) {
			currentPath = currentPath ? `${currentPath}/${part}` : part;

			try {
				const existing = this.vault.getAbstractFileByPath(currentPath);
				if (existing instanceof TFolder) {
					continue;
				} else if (existing) {
					throw new Error(`Path exists but is not a folder: ${currentPath}`);
				}
			} catch {
				// Folder doesn't exist, create it
			}

			await this.vault.createFolder(currentPath);
		}

		const folder = this.vault.getAbstractFileByPath(currentPath);
		if (!(folder instanceof TFolder)) {
			throw new Error(`Failed to create or access folder: ${folderPath}`);
		}
		return folder;
	}

	async saveAudio(blob: Blob, folderPath: string, filename: string): Promise<string> {
		await this.ensureFolderExists(folderPath);

		const buffer = await blob.arrayBuffer();
		const filePath = `${folderPath}/${filename}`;

		await this.vault.createBinary(filePath, buffer);
		return filePath;
	}

	async createNote(folderPath: string, filename: string, content: string): Promise<string> {
		await this.ensureFolderExists(folderPath);

		const filePath = `${folderPath}/${filename}`;

		// Check if file exists and add a number suffix if needed
		let finalPath = filePath;
		let counter = 1;
		while (this.vault.getAbstractFileByPath(finalPath)) {
			const name = filename.replace(/\.md$/, '');
			finalPath = `${folderPath}/${name}_${counter}.md`;
			counter++;
		}

		await this.vault.create(finalPath, content);
		return finalPath;
	}
}
