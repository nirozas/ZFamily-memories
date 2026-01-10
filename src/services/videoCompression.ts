import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

class VideoCompressionService {
    private ffmpeg: FFmpeg | null = null;
    private loaded = false;

    async load() {
        if (this.loaded) return;

        this.ffmpeg = new FFmpeg();

        // Load ffmpeg.wasm from a CDN or local public folder
        // Using unpkg for simplicity in this setup, ensuring we use the multi-threaded or single-threaded core
        // For broad compatibility without COOP/COEP headers, we might need single-threaded, but let's try standard first.
        // Actually, to avoid header issues on simple dev servers, let's use the core URL construction:

        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';

        await this.ffmpeg.load({
            coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
            wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });

        this.loaded = true;
    }

    async compressVideo(file: File, onProgress: (progress: number) => void): Promise<File> {
        if (!this.loaded || !this.ffmpeg) {
            await this.load();
        }

        const ffmpeg = this.ffmpeg!;
        const { name } = file;

        // Write file to memory
        await ffmpeg.writeFile(name, await fetchFile(file));

        ffmpeg.on('progress', ({ progress }) => {
            onProgress(Math.round(progress * 100));
        });

        // Compress command: preset 'ultrafast' for speed, crf 28 for decent quality/size balance
        // Scale to 720p max width to ensure it's web-friendly
        await ffmpeg.exec([
            '-i', name,
            '-c:v', 'libx264',
            '-preset', 'ultrafast',
            '-crf', '28',
            '-vf', 'scale=min(1280\\,iw):-2', // Scale width to 1280 if larger, keep aspect ratio. -2 ensures even height.
            '-c:a', 'aac',
            '-b:a', '128k',
            'output.mp4'
        ]);

        // Read result
        const data = await ffmpeg.readFile('output.mp4');

        // Cleanup
        await ffmpeg.deleteFile(name);
        await ffmpeg.deleteFile('output.mp4');

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return new File([data as any], `compressed_${name.split('.')[0]}.mp4`, { type: 'video/mp4' });
    }
}

export const videoCompressionService = new VideoCompressionService();
