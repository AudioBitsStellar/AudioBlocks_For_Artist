import { z } from 'zod';
import { MUSIC_GENRES } from '@/components/shared/music_genre';

export const songFormSchema = z.object({
  title: z.string().min(1, 'Song title is required').max(100, 'Title must be 100 characters or less'),
  description: z.string().min(1, 'Description is required').max(500, 'Description must be 500 characters or less'),
  genre: z.string().min(1, 'Please select a genre').refine((val) => MUSIC_GENRES.includes(val), 'Invalid genre selection'),
  composer: z.string().min(1, 'Composer name is required').max(100, 'Composer name must be 100 characters or less'),
});

export const albumFormSchema = z.object({
  albumTitle: z.string().min(1, 'Album title is required').max(100, 'Title must be 100 characters or less'),
  genre: z.string().min(1, 'Please select a genre').refine((val) => MUSIC_GENRES.includes(val), 'Invalid genre selection'),
  songTitle: z.string().min(1, 'Song title is required').max(100, 'Title must be 100 characters or less'),
  purchasePrice: z.string().optional(),
});

export const profileFormSchema = z.object({
  username: z.string().min(1, 'Display name is required').max(50, 'Display name must be 50 characters or less'),
  bio: z.string().max(500, 'Bio must be 500 characters or less').optional(),
  website: z.string().url('Please enter a valid URL').or(z.literal('')).optional(),
  twitter: z.string().max(50, 'Twitter username must be 50 characters or less').optional(),
});