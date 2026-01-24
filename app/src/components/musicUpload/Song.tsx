import { Trash2, RotateCw, Play } from 'lucide-react';
import { useRef, useState } from 'react';
import Image from 'next/image';
import { MusicFormValues, UploadSong } from '@/types';
import { useForm } from 'react-hook-form';
import { MUSIC_GENRES } from '../shared/music_genre';
import useUploadServices from '@/services/uploadSerive';
import { splitFile, generateFileId } from "@/utils/chunkUploader";
import MusicLoader from '../MusicLoader';
import { toast } from 'sonner';

const Song = () => {
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [fileId, setFileId] = useState<string | null>(null);
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);


    const [coverImage, setCoverImage] = useState<string | null>(null);
    const [uploadedFile, setUploadedFile] = useState<{ name: string; size: string; status: 'uploading' | 'success' | 'failed' } | null>(null);
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
        formState: { errors, isSubmitting },
    } = useForm<UploadSong>();


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

    const handleMusicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // setAudioFile(file);
        // setFileId(generateFileId());

        setUploadedFile({
            name: file.name,
            size: formatFileSize(file.size),
            status: "uploading",
        });
    };

    const uploadSongInChunks = async (file: File, fileId: string) => {
        const chunks = splitFile(file);

        for (let i = 0; i < chunks.length; i++) {
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
            const fileSize = formatFileSize(file.size);
            // const newFileId = generateFileId();
            //  setAudioFile(file);
            // setFileId(newFileId);


            setUploadedFile({ name: file.name, size: fileSize, status: 'uploading' });

        }
    };

    const handleRetry = async () => {
        if (!audioFile || !fileId) return;

        try {
            setUploadProgress(0);
            setUploadedFile(prev =>
                prev ? { ...prev, status: "uploading" } : prev
            );

            const totalChunks = await uploadSongInChunks(audioFile, fileId);

            setUploadedFile(prev =>
                prev ? { ...prev, status: "success" } : prev
            );

        } catch (err) {
            console.error(err);
            setUploadedFile(prev =>
                prev ? { ...prev, status: "failed" } : prev
            );
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
            toast.error("Please upload song and cover");
            return;
        }

        try {
            setIsUploading(true);
            setUploadedFile((prev) =>
                prev ? { ...prev, status: "uploading" } : prev
            );

            // 1. Upload chunks
            const totalChunks = await uploadSongInChunks(audioFile, fileId);

            // 2. Upload cover
            const coverForm = new FormData();
            coverForm.append("fileId", fileId);
            coverForm.append("cover", coverFile);

            const coverRes = await uploadCover.mutateAsync(coverForm);
            const coverArtPath = coverRes.data.cover;

            // 3. Finalize
            await finalizeUpload.mutateAsync({
                fileId: fileId,
                totalChunks: totalChunks,
                title: data.title,
                description: data.description,
                genre: data.genre,
                composers: data.composer,
                coverArtPath: coverArtPath,
                // marketPrice: data.marketPrice,
            });

            setUploadedFile((prev) =>
                prev ? { ...prev, status: "success" } : prev
            );

            reset();
            setCoverImage(null);
            setUploadProgress(0);
            setUploadedFile(null);
            setAudioFile(null);
            setFileId(null);
        } catch (err) {
            console.error(err);
            setUploadedFile((prev) =>
                prev ? { ...prev, status: "failed" } : prev
            );
        } finally {
            setIsUploading(false);
        }
    };


    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-5 col-span-2">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-white">
                        Song Title <span className="text-[#D2045B]">*</span>
                    </label>
                    <input
                        {...register('title', { required: true })}
                        placeholder="Add Song Title"
                        className="w-full rounded-lg border border-[#2A2A2A] bg-[#161616] px-4 py-3 text-white placeholder:text-[#6F6F6F] focus:border-[#885FA8] focus:outline-none"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-white">
                        Song Description <span className="text-[#D2045B]">*</span>
                    </label>
                    <input
                        {...register('description', { required: true })}
                        placeholder="Enter Song Description"
                        className="w-full rounded-lg border border-[#2A2A2A] bg-[#161616] px-4 py-3 text-white placeholder:text-[#6F6F6F] focus:border-[#885FA8] focus:outline-none"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-white">
                        Genre <span className="text-[#D2045B]">*</span>
                    </label>
                    <select
                        {...register('genre', { required: true })}
                        className="w-full rounded-lg border border-[#2A2A2A] bg-[#161616] px-4 py-3 text-white focus:border-[#885FA8] focus:outline-none"
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

                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-white">
                        Composer <span className="text-[#D2045B]">*</span>
                    </label>
                    <input
                        {...register('composer', { required: true })}
                        placeholder="Enter Composer Name"
                        className="w-full rounded-lg border border-[#2A2A2A] bg-[#161616] px-4 py-3 text-white placeholder:text-[#6F6F6F] focus:border-[#885FA8] focus:outline-none"
                    />
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
                    disabled={isBusy}
                    className={`w-[131px] rounded-lg font-semibold px-6 py-3 mt-6 transition-all flex items-center justify-center gap-2
                    ${isUploading || isSubmitting
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
                    />

                    <button
                        onClick={() => !isBusy && coverInputRef.current?.click()}
                        className="w-full rounded-lg border border-[#2A2A2A] bg-[#111111] text-white px-4 py-2 hover:bg-[#1a1a1a] transition-colors"
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

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="audio/*"
                        onChange={handleMusicUpload}
                        className="hidden"
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
                                                <span className="text-[10px] text-red-500 font-medium">Upload failed</span>
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
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    {uploadedFile.status === 'failed' && (
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
                </div>

            </div>
        </div>
    )
}

export default Song