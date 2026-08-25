import React, { InputHTMLAttributes, forwardRef, useState, DragEvent } from "react";
import { UploadCloud, File, X, AlertCircle } from "lucide-react";

export interface FileUploadProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  error?: string;
  helperText?: string;
  onFileSelect?: (file: File | null) => void;
  acceptedFormats?: string;
}

const FileUpload = forwardRef<HTMLInputElement, FileUploadProps>(
  (
    { className = "", label, error, helperText, disabled, onFileSelect, acceptedFormats, ...props },
    ref
  ) => {
    const [isDragging, setIsDragging] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (!disabled) setIsDragging(true);
    };

    const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
    };

    const handleDrop = (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);

      if (disabled) return;

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        setSelectedFile(file);
        if (onFileSelect) onFileSelect(file);
      }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        const file = e.target.files[0];
        setSelectedFile(file);
        if (onFileSelect) onFileSelect(file);
      }
    };

    const clearFile = (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setSelectedFile(null);
      if (onFileSelect) onFileSelect(null);
    };

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label className={`text-sm font-medium ${disabled ? "text-gray-400" : "text-gray-200"}`}>
            {label}
          </label>
        )}

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            relative w-full border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center transition-all
            ${disabled ? "opacity-50 cursor-not-allowed border-gray-700 bg-gray-900/50" : "cursor-pointer hover:bg-gray-800/50 hover:border-blue-500"}
            ${isDragging ? "border-blue-500 bg-blue-500/10" : "border-gray-700 bg-gray-900"}
            ${error ? "border-red-500 bg-red-500/5" : ""}
            ${className}
          `}
        >
          <input
            type="file"
            ref={ref}
            disabled={disabled}
            onChange={handleFileChange}
            accept={acceptedFormats}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            {...props}
          />

          {selectedFile ? (
            <div className="flex items-center gap-3 bg-gray-800 p-3 rounded-lg w-full max-w-sm">
              <div className="bg-blue-500/20 p-2 rounded text-blue-500">
                <File size={20} />
              </div>
              <div className="flex-1 overflow-hidden text-left">
                <p className="text-sm font-medium text-gray-200 truncate">{selectedFile.name}</p>
                <p className="text-xs text-gray-400">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              {!disabled && (
                <button
                  type="button"
                  onClick={clearFile}
                  className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          ) : (
            <>
              <div
                className={`p-3 rounded-full mb-3 ${error ? "bg-red-500/10 text-red-500" : "bg-gray-800 text-gray-400"}`}
              >
                {error ? <AlertCircle size={24} /> : <UploadCloud size={24} />}
              </div>
              <p className="text-sm font-medium text-gray-200 mb-1">
                <span className="text-blue-500">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-gray-400">
                {acceptedFormats
                  ? `Accepted formats: ${acceptedFormats}`
                  : "SVG, PNG, JPG or MP3 (max. 10MB)"}
              </p>
            </>
          )}
        </div>

        {(error || helperText) && (
          <p className={`text-xs ${error ? "text-red-500" : "text-gray-400"}`}>
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

FileUpload.displayName = "FileUpload";

export default FileUpload;
