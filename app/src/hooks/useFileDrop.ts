import { useCallback, useRef, useState, type DragEvent } from "react";

export interface UseFileDropOptions {
  /** Called with the dropped files (only the first unless `multiple`). */
  onFiles: (files: File[]) => void;
  /** When true, drops are ignored and no drag highlight is shown. */
  disabled?: boolean;
  /** Accept more than one file per drop. Defaults to false. */
  multiple?: boolean;
}

export interface FileDropHandlers {
  onDragEnter: (e: DragEvent<HTMLElement>) => void;
  onDragOver: (e: DragEvent<HTMLElement>) => void;
  onDragLeave: (e: DragEvent<HTMLElement>) => void;
  onDrop: (e: DragEvent<HTMLElement>) => void;
}

/** True when the drag carries files (not selected text, links, etc.). */
function hasFiles(e: DragEvent<HTMLElement>): boolean {
  const types = e.dataTransfer?.types;
  if (!types) return false;
  return Array.from(types).includes("Files");
}

/**
 * Drag-and-drop file handling for upload zones (#391).
 *
 * - Tracks drag depth so moving over child elements doesn't make the
 *   highlight flicker (dragleave fires for every child boundary).
 * - Ignores non-file drags such as selected text.
 * - Sets `dropEffect` so the browser shows a copy cursor, and "none" while
 *   disabled so an in-progress upload can't be replaced by a drop.
 */
export function useFileDrop({ onFiles, disabled = false, multiple = false }: UseFileDropOptions): {
  isDragging: boolean;
  dropHandlers: FileDropHandlers;
} {
  const [isDragging, setIsDragging] = useState(false);
  const depth = useRef(0);

  const onDragEnter = useCallback(
    (e: DragEvent<HTMLElement>) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth.current += 1;
      if (!disabled) setIsDragging(true);
    },
    [disabled]
  );

  const onDragOver = useCallback(
    (e: DragEvent<HTMLElement>) => {
      if (!hasFiles(e)) return;
      // preventDefault is what marks this element as a valid drop target.
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = disabled ? "none" : "copy";
    },
    [disabled]
  );

  const onDragLeave = useCallback((e: DragEvent<HTMLElement>) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    depth.current = Math.max(0, depth.current - 1);
    if (depth.current === 0) setIsDragging(false);
  }, []);

  const onDrop = useCallback(
    (e: DragEvent<HTMLElement>) => {
      e.preventDefault();
      depth.current = 0;
      setIsDragging(false);
      if (disabled) return;
      const files = Array.from(e.dataTransfer?.files ?? []);
      if (files.length === 0) return;
      onFiles(multiple ? files : files.slice(0, 1));
    },
    [disabled, multiple, onFiles]
  );

  return { isDragging, dropHandlers: { onDragEnter, onDragOver, onDragLeave, onDrop } };
}
