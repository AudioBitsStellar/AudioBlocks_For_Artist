import { Trash2, RotateCw, Play } from 'lucide-react';
import { useRef, useState } from 'react';
import Image from 'next/image';
import { UploadSong } from '@/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { songFormSchema } from '@/types/formValidation';
import { MUSIC_GENRES } from '../shared/music_genre';
import useUploadServices from '@/services/uploadSerive';
import { splitFile, generateFileId } from "@/utils/chunkUploader";
import MusicLoader from '../MusicLoader';
import { useToast } from '@/hooks/useToastHandler';
import MintSongButton from '@/components/common/wallet/MintSongButton';
import { analytics } from '@/lib/analytics';
import { isRetryableError, getErrorMessage } from '@/utils/errorRecovery';

const ALLOWED_AUDIO_TYPES = new Set([
    'audio/mpeg',
    'audio/wav',
    'audio/wave',
    'audio/x-wav',
    'audio/mp4',
    'audio/m4a',
    'audio/aac',
    'audio/ogg',
    'audio/flac',
    'audio/x-flac',
    'audio/webm',
]);

const MAX_FILE_SIZE_BYTES = 200 * 1024 * 1024; // 200 MB
const MAX_RETRY_ATTEMPTS = 3;

const Song = () => {
    const toast = useToast();
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [fileId, setFileId] = useState<string | null>(null);
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [mintableSongId, setMintableSongId] = useState<string | null>(null);
    const [uploadStartedAt, setUploadStartedAt] = useState<number | null>(null);
    const [retryCount, setRetryCount] = useState(0);
    const [failedChunkIndex, setFailedChunkIndex] = useState<number>(0);

    const [coverImage, setCoverImage] = useState<string | null>(null);
    const [uploadedFile, setUploadedFile] = useState<{ name: string; size: string; status: 'uploading' | 'success' | 'failed' } | null>(null);
    const [validationError, setValidationError] = useState<string | null>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { useFinalizeUpload, useUploadChunk, useUploadCover } = useUploadServices();
    const uploadChunk = useUploadChunk();
    const uploadCover = useUploadCover();
    const finalizeUpload = useFinalizeUpload();


    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting, isValid },
    } = useForm<UploadSong>({
        resolver: zodResolver(songFormSchema),
        mode: 'onChange',
    });


    const isBusy =
        isUploading ||
        isSubmitting ||
        uploadChunk.isPending ||
        uploadCover.isPending ||
        finalizeUpload.isPending;

    const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setCoverFile(file);

        const reader = new FileReader();
        reader.onloadend = () => setCoverImage(reader.result as string);
        reader.readAsDataURL(file);
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return bytes + ' b';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' kb';
        return (bytes / (1024 * 1024)).toFixed(1) + ' mb';
    };

    const validateAudioFile = (file: File): string | null => {
        if (!ALLOWED_AUDIO_TYPES.has(file.type) && !file.name.match(/\.(mp3|wav|m4a|aac|ogg|flac|webm)$/i)) {
            return `Unsupported file type. Please upload an audio file (MP3, WAV, M4A, AAC, OGG, FLAC, WebM).`;
        }
        if (file.size > MAX_FILE_SIZE_BYTES) {
            return `File too large. Maximum size is 200 MB, but your file is ${formatFileSize(file.size)}.`;
        }
        return null;
    };

    const handleMusicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const error = validateAudioFile(file);
        if (error) {
            setValidationError(error);
            setUploadedFile(null);
            return;
        }

        setValidationError(null);
        setAudioFile(file);
        setFileId(generateFileId());
        setRetryCount(0);
        setFailedChunkIndex(0);

        setUploadedFile({
            name: file.name,
            size: formatFileSize(file.size),
            status: "uploading",
        });
    };

    const uploadSongInChunks = async (file: File, fileId: string, startChunk = 0) => {
        const chunks = splitFile(file);

        for (let i = startChunk; i < chunks.length; i++) {
            const form = new FormData();
            form.append("fileId", fileId);
            form.append("chunkIndex", String(i));
            form.append("chunk", chunks[i]);

            await uploadChunk.mutateAsync(form);

            const percent = Math.round(((i + 1) / chunks.length) * 100);
            setUploadProgress(percent);
        }

        return chunks.length;
    };


    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) {
            const error = validateAudioFile(file);
            if (error) {
                setValidationError(error);
                setUploadedFile(null);
                return;
            }

            setValidationError(null);
            setAudioFile(file);
            setFileId(generateFileId());
            setRetryCount(0);
            setFailedChunkIndex(0);

            const fileSize = formatFileSize(file.size);
            setUploadedFile({ name: file.name, size: fileSize, status: 'uploading' });
        }
    };

    const handleRetry = async () => {
        if (!audioFile || !fileId) return;

        if (retryCount >= MAX_RETRY_ATTEMPTS) {
            setUploadedFile(prev =>
                prev ? { ...prev, status: "failed" } : prev
            );
            toast.error(`Maximum retry attempts (${MAX_RETRY_ATTEMPTS}) reached. Please delete and start over.`);
            return;
        }

        try {
            setRetryCount(prev => prev + 1);
            setUploadedFile(prev =>
                prev ? { ...prev, status: "uploading" } : prev
            );

            await uploadSongInChunks(audioFile, fileId, failedChunkIndex);

            setUploadedFile(prev =>
                prev ? { ...prev, status: "success" } : prev
            );

        } catch (err) {
            console.error(err);
            setUploadedFile(prev =>
                prev ? { ...prev, status: "failed" } : prev
            );
            toast.error(`Retry failed: ${getErrorMessage(err as Error)}`);
        }
    };


    const handleDelete = () => {
        setUploadedFile(null);
        setAudioFile(null);
        setFileId(null);
        setUploadProgress(0);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
    };


    const onSubmit = async (data: UploadSong) => {
        if (!audioFile || !fileId || !coverFile) {
            toast.error('Please upload song and cover');
            return;
        }

        const startedAt = Date.now();
        setUploadStartedAt(startedAt);

        analytics.uploadStarted({
            fileId,
            fileName: audioFile.name,
            fileSizeBytes: audioFile.size,
        });

        try {
            setIsUploading(true);
            setUploadedFile((prev) =>
                prev ? { ...prev, status: "uploading" } : prev
            );

            const chunks = splitFile(audioFile);
            for (let i = 0; i < chunks.length; i++) {
                const form = new FormData();
                form.append("fileId", fileId);
                form.append("chunkIndex", String(i));
                form.append("chunk", chunks[i]);

                await uploadChunk.mutateAsync(form);

                const percent = Math.round(((i + 1) / chunks.length) * 100);
                setUploadProgress(percent);
            }
            const totalChunks = chunks.length;

            // 2. Upload cover
            const coverForm = new FormData();
            coverForm.append("fileId", fileId);
            coverForm.append("cover", coverFile);

            const coverRes = await uploadCover.mutateAsync(coverForm);
            const coverArtPath = coverRes.data.cover;

            // 3. Finalize
            const finalizeResult: any = await finalizeUpload.mutateAsync({
                fileId: fileId,
                totalChunks: totalChunks,
                title: data.title,
                description: data.description,
                genre: data.genre,
                composers: data.composer,
                coverArtPath: coverArtPath,
                // marketPrice: data.marketPrice,
            });

            const songId: string = finalizeResult?.data?.id ?? '';

            analytics.uploadCompleted({
                fileId,
                songId,
                durationMs: Date.now() - startedAt,
            });

            // The song still needs to finish transcoding + IPFS pinning in the
            // background before it's mintable; the Mint button below will show
            // a clear backend error if clicked too early.
            setMintableSongId(songId || null);

            setUploadedFile((prev) =>
                prev ? { ...prev, status: "success" } : prev
            );

            toast.success('Song uploaded successfully!');

            reset();
            setCoverImage(null);
            setUploadProgress(0);
            setUploadedFile(null);
            setAudioFile(null);
            setFileId(null);
        } catch (err: any) {
            console.error(err);
            const reason = getErrorMessage(err);
            analytics.uploadFailed({ fileId, reason });
            setUploadedFile((prev) =>
                prev ? { ...prev, status: "failed" } : prev
            );
            if (isRetryableError(err)) {
                toast.error(`Upload failed — tap retry to try again. (${reason})`);
            } else {
                toast.error(`Upload failed: ${reason}`);
            }
        } finally {
            setIsUploading(false);
        }
    };


    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-5 col-span-2">
                <div className="space-y-2">
                    <label htmlFor="song-title" className="text-sm font-medium text-white">
                        Song Title <span className="text-[#D2045B]">*</span>
                    </label>
                    <input
                        id="song-title"
                        {...register('title')}
                        placeholder="Add Song Title"
                        aria-invalid={errors.title ? 'true' : 'false'}
                        className={`w-full rounded-lg border bg-[#161616] px-4 py-3 text-white placeholder:text-[#6F6F6F] focus:border-[#885FA8] focus:outline-none ${errors.title ? 'border-red-500' : 'border-[#2A2A2A]'}`}
                    />
                    {errors.title && (
                        <p className="text-[10px] text-red-500" role="alert">{errors.title.message}</p>
                    )}
                </div>

                <div className="space-y-2">
                    <label htmlFor="song-description" className="text-sm font-medium text-white">
                        Song Description <span className="text-[#D2045B]">*</span>
                    </label>
                    <input
                        id="song-description"
                        {...register('description')}
                        placeholder="Enter Song Description"
                        aria-invalid={errors.description ? 'true' : 'false'}
                        className={`w-full rounded-lg border bg-[#161616] px-4 py-3 text-white placeholder:text-[#6F6F6F] focus:border-[#885FA8] focus:outline-none ${errors.description ? 'border-red-500' : 'border-[#2A2A2A]'}`}
                    />
                    {errors.description && (
                        <p className="text-[10px] text-red-500" role="alert">{errors.description.message}</p>
                    )}
                </div>

                <div className="space-y-2">
                    <label htmlFor="song-genre" className="text-sm font-medium text-white">
                        Genre <span className="text-[#D2045B]">*</span>
                    </label>
                    <select
                        id="song-genre"
                        {...register('genre')}
                        aria-invalid={errors.genre ? 'true' : 'false'}
                        className={`w-full rounded-lg border bg-[#161616] px-4 py-3 text-white focus:border-[#885FA8] focus:outline-none ${errors.genre ? 'border-red-500' : 'border-[#2A2A2A]'}`}
                    >
                        <option value="" disabled>
                            Select genre
                        </option>

                        {MUSIC_GENRES.map((genre) => (
                            <option key={genre} value={genre} className="bg-[#161616]">
                                {genre}
                            </option>
                        ))}
                    </select>
                    {errors.genre && (
                        <p className="text-[10px] text-red-500" role="alert">{errors.genre.message}</p>
                    )}
                </div>

                <div className="space-y-2">
                    <label htmlFor="song-composer" className="text-sm font-medium text-white">
                        Composer <span className="text-[#D2045B]">*</span>
                    </label>
                    <input
                        id="song-composer"
                        {...register('composer')}
                        placeholder="Enter Composer Name"
                        aria-invalid={errors.composer ? 'true' : 'false'}
                        className={`w-full rounded-lg border bg-[#161616] px-4 py-3 text-white placeholder:text-[#6F6F6F] focus:border-[#885FA8] focus:outline-none ${errors.composer ? 'border-red-500' : 'border-[#2A2A2A]'}`}
                    />
                    {errors.composer && (
                        <p className="text-[10px] text-red-500" role="alert">{errors.composer.message}</p>
                    )}
                </div>

                {/* <div className="space-y-2">
                    <label className="text-sm font-medium text-white">
                        Market Price <span className="text-[#D2045B]">*</span>
                    </label>
                    <input
                        {...register('marketPrice', { required: true })}
                        placeholder="Add Price of Song"
                        className="w-full rounded-lg border border-[#2A2A2A] bg-[#161616] px-4 py-3 text-white placeholder:text-[#6F6F6F] focus:border-[#885FA8] focus:outline-none"
                    />
                </div> */}

                <button
                    onClick={handleSubmit(onSubmit)}
                    disabled={isBusy || !isValid || !audioFile || !coverFile}
                    className={`w-[131px] rounded-lg font-semibold px-6 py-3 mt-6 transition-all flex items-center justify-center gap-2
                    ${isBusy || !isValid || !audioFile || !coverFile
                            ? "bg-[#8a8a8a] cursor-not-allowed"
                            : "bg-[#D2045B] hover:bg-[#B8043F]"
                        } text-white`}
                >
                    {isBusy ? <MusicLoader small /> : 'Add Music'}
                </button>
            </div>

            {/* Right Column - Media Uploads */}
            <div className="space-y-6  col-span-1">
                {/* Add Music Cover Section */}
                <div className="rounded-2xl border border-[#2A2A2A] bg-[#161616] p-6 w-full flex flex-col" style={{ height: '321px' }}>
                    {coverImage ? (
                        <div className="relative w-full aspect-square rounded-lg overflow-hidden mb-4">
                            <Image
                                src={coverImage}
                                alt="Music cover"
                                fill
                                className="object-cover"
                                unoptimized
                            />
                        </div>
                    ) : (
                        <div className="w-full aspect-square rounded-lg bg-linear-to-br from-teal-500 via-purple-500 to-pink-500 mb-4 flex items-center justify-center relative overflow-hidden">
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-32 h-32 rounded-full bg-yellow-400 border-8 border-red-500 relative z-10"></div>
                                <div className="absolute left-8 top-12 w-24 h-24 rounded-full bg-purple-400 opacity-80"></div>
                                <div className="absolute right-8 bottom-12 w-20 h-20 rounded-full bg-purple-600 opacity-60"></div>
                            </div>
                        </div>
                    )}

                    <h3 className="text-white font-semibold mb-2">Add Music Cover</h3>
                    <p className="text-sm text-[#A3A3A3] mb-4 flex-1">Make your song stand out with a striking cover image</p>

                    <input
                        ref={coverInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleCoverUpload}
                        className="hidden"
                        aria-label="Upload cover image"
                    />

                    <button
                        onClick={() => !isBusy && coverInputRef.current?.click()}
                        disabled={isBusy}
                        className="w-full rounded-lg border border-[#2A2A2A] bg-[#111111] text-white px-4 py-2 hover:bg-[#1a1a1a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Add Cover
                    </button>
                </div>

                {/* Upload Music Section - Only show for Add Song mode */}

                <div className="rounded-2xl border border-[#2A2A2A] bg-[#161616] p-6 w-full flex flex-col overflow-hidden" style={{ height: '192.33px' }}>
                    <h3 className="text-white font-semibold mb-3 text-sm">Upload Music</h3>

                    {!uploadedFile ? (
                        <div
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            className="border-2 border-dashed border-[#2A2A2A] rounded-lg p-3 text-center mb-3 flex-1 flex flex-col items-center justify-center min-h-0"
                            role="button"
                            tabIndex={0}
                            aria-label="Upload music file - drag and drop or click to select"
                        >
                            <p className="text-xs text-[#A3A3A3]">
                                Drag & drop your files here or{' '}
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="text-white underline hover:text-[#D2045B]"
                                >
                                    Choose files
                                </button>
                            </p>
                        </div>
                    ) : (
                        <div
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            className="border-2 border-dashed border-[#2A2A2A] rounded-lg p-3 text-center mb-3 flex-1 flex flex-col items-center justify-center min-h-0"
                            role="button"
                            tabIndex={0}
                            aria-label="Replace uploaded file"
                        >
                            <p className="text-xs text-[#A3A3A3]">
                                {uploadedFile.status === 'uploading' ? 'Uploading...' : 'Drag & drop your files here or'}{' '}
                                {uploadedFile.status !== 'uploading' && (
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="text-white underline hover:text-[#D2045B]"
                                    >
                                        Choose files
                                    </button>
                                )}
                            </p>
                        </div>
                    )}

                    {validationError && (
                        <p className="text-[10px] text-red-500 mb-2" role="alert">{validationError}</p>
                    )}

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="audio/*"
                        onChange={handleMusicUpload}
                        className="hidden"
                        aria-label="Upload audio file"
                    />

                    <div className="shrink-0">
                        <p className="text-xs font-semibold text-white mb-1.5">Uploaded</p>
                        {uploadedFile ? (
                            <div className="bg-[#1a1a1a] rounded-lg p-2 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <div className="w-6 h-6 rounded-full bg-[#2A2A2A] flex items-center justify-center shrink-0">
                                        <Play size={12} className="text-[#A3A3A3] ml-0.5" fill="#A3A3A3" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs text-white truncate">{uploadedFile.name}</p>
                                        <div className="flex items-center gap-2">
                                            <p className="text-[10px] text-[#A3A3A3]">{uploadedFile.size}</p>
                                            {uploadedFile.status === 'failed' && (
                                                    <span className="text-[10px] text-red-500 font-medium">
                                                        {retryCount >= MAX_RETRY_ATTEMPTS ? 'Max retries reached' : 'Upload failed'}
                                                    </span>
                                                )}
                                            {uploadedFile.status === 'success' && (
                                                    <span className="text-[10px] text-green-500 font-medium">Upload finished</span>
                                                )}
                                            {uploadedFile.status === 'uploading' && (
                                                    <span className="text-[10px] text-yellow-500 font-medium">
                                                        Uploading... {uploadProgress}%
                                                    </span>
                                                )}

                                        </div>
                                        {uploadedFile.status === 'uploading' && (
                                            <div className="w-full bg-zinc-800 rounded-full h-1 mt-1.5 overflow-hidden">
                                                <div
                                                    className="bg-pink-500 h-1 rounded-full transition-all duration-200"
                                                    style={{ width: `${uploadProgress}%` }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    {uploadedFile.status === 'failed' && retryCount < MAX_RETRY_ATTEMPTS && (
                                        <button
                                            onClick={handleRetry}
                                            className="p-1 text-[#A3A3A3] hover:text-white transition-colors"
                                            disabled={isBusy}
                                            title="Retry upload"
                                        >
                                            <RotateCw size={14} />
                                        </button>
                                    )}
                                    <button
                                        disabled={isBusy}
                                        className="p-1 text-[#A3A3A3] hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                        onClick={handleDelete}
                                        title="Delete file"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <p className="text-[10px] text-[#A3A3A3]">No uploads added to the queue</p>
                        )}
                    </div>

                    {mintableSongId && (
                        <div className="mt-3 bg-[#1a1a1a] rounded-lg p-3 flex items-center justify-between gap-2">
                            <p className="text-xs text-[#A3A3A3]">
                                Song uploaded. Once it&apos;s finished processing, mint it on-chain:
                            </p>
                            <MintSongButton songId={mintableSongId} />
                        </div>
                    )}
                </div>

            </div>
        </div>
    )
}

export default Song