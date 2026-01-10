import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;

const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm';

async function loadFFmpeg() {
    if (ffmpeg) return ffmpeg;

    ffmpeg = new FFmpeg();
    await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    return ffmpeg;
}

export const mediaService = {
    /**
     * Compresses an image file using Canvas API
     */
    async compressImage(file: File, maxWidth = 2000, quality = 0.8): Promise<File> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    if (width > maxWidth) {
                        height = (maxWidth / width) * height;
                        width = maxWidth;
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);

                    canvas.toBlob((blob) => {
                        if (blob) {
                            resolve(new File([blob], file.name, { type: 'image/jpeg' }));
                        } else {
                            reject(new Error('Canvas compression failed'));
                        }
                    }, 'image/jpeg', quality);
                };
            };
            reader.onerror = (error) => reject(error);
        });
    },

    /**
     * Compresses a video file using FFmpeg.wasm
     */
    async compressVideo(file: File, onProgress?: (p: number) => void): Promise<File> {
        const ff = await loadFFmpeg();

        const inputName = 'input.mp4';
        const outputName = 'output.mp4';

        await ff.writeFile(inputName, await fetchFile(file));

        if (onProgress) {
            ff.on('progress', ({ progress }) => {
                onProgress(progress);
            });
        }

        // Compress video: scale filter, crf (constant rate factor) for quality, libx264
        // CRF 28 is a good default for decent size reduction with minimal visual impact
        await ff.exec([
            '-i', inputName,
            '-vcodec', 'libx264',
            '-crf', '28',
            '-preset', 'veryfast',
            '-s', '1280x720', // Downscale to 720p for better compression
            '-acodec', 'aac',
            outputName
        ]);

        const data = await ff.readFile(outputName);
        const compressedFile = new File([data as any], file.name, { type: 'video/mp4' });

        // Cleanup
        await ff.deleteFile(inputName);
        await ff.deleteFile(outputName);

        return compressedFile;
    }
};
