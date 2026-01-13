// API Response types
export interface AxiosResponse<T = any> {
	success: boolean;
	data?: T;
	message?: string;
	error?: string;
}

export interface updateProfilePayload {
	username: string;
	bio: string;
	website: string;
	profileImage?: File | string;
	pageCover?: string;
	twitter: string;
}

export interface uploadSong {
	fileId: string;
	totalChunks: number;
	title: string;
	coverArtPath: string;
	description: string;
	genre: string;
	composers: string;
}
