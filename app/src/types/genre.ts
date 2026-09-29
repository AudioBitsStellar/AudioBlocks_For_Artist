export interface GenreOption {
  id: string;
  label: string;
  category?: string;
}

export interface GenreTagSelectorProps {
  selectedGenre: string;
  selectedTags: string[];
  onGenreChange: (genre: string) => void;
  onTagsChange: (tags: string[]) => void;
  maxTags?: number;
  disabled?: boolean;
}

export const PRESET_GENRES: GenreOption[] = [
  { id: "afrobeat", label: "Afrobeat" },
  { id: "ambient", label: "Ambient" },
  { id: "classical", label: "Classical" },
  { id: "electronic", label: "Electronic" },
  { id: "hiphop", label: "Hip-Hop / Rap" },
  { id: "indie", label: "Indie Rock" },
  { id: "jazz", label: "Jazz" },
  { id: "pop", label: "Pop" },
  { id: "rnb", label: "R&B / Soul" },
  { id: "synthwave", label: "Synthwave" },
];
