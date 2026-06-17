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

export interface UploadSong {
	fileId: string;
	totalChunks: number;
	title: string;
	coverArtPath: string;
	description: string;
	genre: string;
	composer: string;
	// marketPrice: string;
}
export interface UploadCoverResponse {
	cover: File | string;
	fileId: string;
}

export interface UploadChunkResponse {
	chunkIndex: number;
	fileId: string;
	chunk: number | string;
}

export interface MusicFormValues {
	songTitle: string;
	albumTitle: string;
	genre: string;
	releaseDate: string;
	marketPrice: string;
	purchasePrice: string;
}

export interface RegisterEmailPayload {
	email: string;
	password: string;
	role: "artist" | "listener" | "admin";
	username?: string;
	name?: string;
}

export interface LoginEmailPayload {
	email: string;
	password: string;
}

export interface AuthUser {
	id: string;
	email?: string;
	role: string;
	username?: string;
	name?: string;
}

export interface AuthResponse {
	user: AuthUser;
	token: string;
}
