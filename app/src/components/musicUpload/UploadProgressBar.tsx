interface UploadProgressBarProps {
  fileName: string;
  progress: number;
}

/**
 * Accessible upload progress bar. Screen readers get the value, range and a
 * name that includes the file, instead of having to re-read the visible text.
 */
const UploadProgressBar = ({ fileName, progress }: UploadProgressBarProps) => {
  const value = Math.min(100, Math.max(0, Math.round(progress)));

  return (
    <div
      role="progressbar"
      aria-label={`Upload progress for ${fileName}`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      aria-valuetext={`Uploading ${fileName}, ${value}%`}
      className="w-full bg-zinc-800 rounded-full h-1 mt-1.5 overflow-hidden"
    >
      <div
        className="bg-pink-500 h-1 rounded-full transition-all duration-200 motion-reduce:transition-none"
        style={{ width: `${value}%` }}
      />
    </div>
  );
};

export default UploadProgressBar;
