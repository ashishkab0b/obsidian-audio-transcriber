export class AudioRecorder {
	private mediaRecorder: MediaRecorder | null = null;
	private audioContext: AudioContext | null = null;
	private analyser: AnalyserNode | null = null;
	private microphone: MediaStreamAudioSourceNode | null = null;
	private chunks: Blob[] = [];
	private startTime: number = 0;

	async start(): Promise<void> {
		this.chunks = [];
		this.startTime = Date.now();

		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

			// Create AudioContext for waveform analysis
			this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
			this.microphone = this.audioContext.createMediaStreamSource(stream);
			this.analyser = this.audioContext.createAnalyser();
			this.analyser.fftSize = 2048;

			this.microphone.connect(this.analyser);

			// Create MediaRecorder for audio capture
			// Use audio/webm with opus codec which AssemblyAI supports
			const mimeType = 'audio/webm;codecs=opus';
			const recorderOptions: MediaRecorderOptions = { mimeType };

			console.log('Starting recording with MIME type:', mimeType);

			this.mediaRecorder = new MediaRecorder(stream, recorderOptions);

			this.mediaRecorder.ondataavailable = (event) => {
				if (event.data.size > 0) {
					this.chunks.push(event.data);
					console.log('Data chunk received:', event.data.size, 'bytes, type:', event.data.type);
				}
			};

			this.mediaRecorder.start();
		} catch (error) {
			console.error('Failed to start recording:', error);
			throw error;
		}
	}

	async stop(): Promise<Blob> {
		return new Promise((resolve, reject) => {
			if (!this.mediaRecorder) {
				reject(new Error('Recording not started'));
				return;
			}

			this.mediaRecorder.onstop = () => {
				// Explicitly use webm with opus codec
				const blob = new Blob(this.chunks, { type: 'audio/webm;codecs=opus' });
				console.log('Recording stopped. Blob size:', blob.size, 'Blob type:', blob.type, 'Chunks count:', this.chunks.length);
				this.cleanup();
				resolve(blob);
			};

			this.mediaRecorder.stop();
		});
	}

	getAnalyserNode(): AnalyserNode | null {
		return this.analyser;
	}

	getElapsedSeconds(): number {
		if (this.startTime === 0) return 0;
		return Math.floor((Date.now() - this.startTime) / 1000);
	}

	private cleanup(): void {
		if (this.mediaRecorder && this.mediaRecorder.stream) {
			this.mediaRecorder.stream.getTracks().forEach((track) => track.stop());
		}
		if (this.audioContext) {
			this.audioContext.close();
		}
		this.mediaRecorder = null;
		this.audioContext = null;
		this.analyser = null;
		this.microphone = null;
	}
}
