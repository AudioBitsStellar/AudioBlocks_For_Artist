"use client";

import { useState, useRef } from "react";
import Breadcrumb from "@/components/Breadcrumb";
import Image from "next/image";
import { updateProfilePayload } from "@/types";
import { useForm } from "react-hook-form";
import { zodResolver } from '@hookform/resolvers/zod';
import { profileFormSchema } from "@/types/formValidation";
import MusicLoader from "@/components/MusicLoader";
import useArtistServices from "@/services/artistServices";
import SetupArtistOnChainProfile from "@/components/common/wallet/SetupArtistOnChainProfile";
import ErrorBoundary from "@/components/ErrorBoundary";
import { analytics } from "@/lib/analytics";
import { toast } from "sonner";
import { isRetryableError, getErrorMessage } from "@/utils/errorRecovery";

export default function ProfilePage() {
	const [activeTab, setActiveTab] = useState<"profile" | "settings" | "onchain">("profile");
	const { useUpdateArtistProfile } = useArtistServices();
	const updateProfileMutation = useUpdateArtistProfile();

	const {
		register,
		setValue,
		handleSubmit,
		formState: { errors, isSubmitting, isValid },
	} = useForm<updateProfilePayload>({
		resolver: zodResolver(profileFormSchema),
		mode: 'onChange',
	});

	const [profileImage, setProfileImage] = useState<string | null>(null);
	const profileInputRef = useRef<HTMLInputElement>(null);
	const [notifications, setNotifications] = useState({
		commentsOnSongs: false,
		salesAndRoyalties: true,
		platformAlerts: true,
	});

	const handleProfileImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			setValue("profileImage", file);

			// Preview only
			const reader = new FileReader();
			reader.onloadend = () => {
				setProfileImage(reader.result as string);
			};
			reader.readAsDataURL(file);
		}
	};

	const onSubmit = async (data: updateProfilePayload) => {
		const formData = new FormData();

		formData.append("username", data.username);
		formData.append("bio", data.bio || '');
		formData.append("website", data.website || '');
		formData.append("twitter", data.twitter || '');

		if (data.profileImage instanceof File) {
			formData.append("profileImage", data.profileImage);
		}

		updateProfileMutation.mutate(formData, {
			onSuccess: () => {
				analytics.profileSaved({
					hasImage: data.profileImage instanceof File,
					hasWebsite: Boolean(data.website?.trim()),
					hasTwitter: Boolean(data.twitter?.trim()),
				});
				toast.success("Profile saved successfully");
			},
			onError: (err: unknown) => {
				const msg = getErrorMessage(err);
				if (isRetryableError(err)) {
					toast.error(`Could not save profile — please try again. (${msg})`);
				} else {
					toast.error(`Profile save failed: ${msg}`);
				}
			},
		});
	};

	return (

		<>
			<Breadcrumb items={[{ label: "Profile", isActive: true }]} />

			{/* Tabs */}
			<div className="flex items-center gap-2 border-b border-[#2A2A2A]" role="tablist">
				<button
					onClick={() => setActiveTab("profile")}
					role="tab"
					aria-selected={activeTab === "profile"}
					aria-controls="profile-panel"
					className={`px-6 py-3 font-semibold transition-colors rounded-t-lg ${activeTab === "profile"
							? "bg-[#D2045B] text-white"
							: "bg-transparent text-gray-400 hover:text-white"
						}`}
				>
					Profile
				</button>
				<button
					onClick={() => setActiveTab("settings")}
					role="tab"
					aria-selected={activeTab === "settings"}
					aria-controls="settings-panel"
					className={`px-6 py-3 font-semibold transition-colors rounded-t-lg ${activeTab === "settings"
							? "bg-[#D2045B] text-white"
							: "bg-transparent text-gray-400 hover:text-white"
						}`}
				>
					Settings
				</button>
				<button
					onClick={() => setActiveTab("onchain")}
					role="tab"
					aria-selected={activeTab === "onchain"}
					aria-controls="onchain-panel"
					className={`px-6 py-3 font-semibold transition-colors rounded-t-lg ${activeTab === "onchain"
							? "bg-[#D2045B] text-white"
							: "bg-transparent text-gray-400 hover:text-white"
						}`}
				>
					On-chain
				</button>
			</div>

			{/* Main Content - Two Columns */}
			{activeTab === "profile" && (
				<div id="profile-panel" className="grid grid-cols-1 lg:grid-cols-[60%_40%] gap-16 mt-6">
					{/* Left Column - Form Fields */}
					<div className="space-y-5">
						<div className="flex flex-col mt-7">
							<label htmlFor="display-name" className="text-sm font-medium text-white mb-2">
								Display name <span className="text-[#D2045B]">*</span>
							</label>
							<input
								id="display-name"
								{...register("username")}
								placeholder="Add Display name"
								aria-invalid={errors.username ? 'true' : 'false'}
								aria-describedby={errors.username ? 'username-error' : undefined}
								className="text-white placeholder:text-[#6F6F6F] focus:outline-none px-4"
								style={{
									width: "660px",
									height: "48px",
									borderRadius: "16px",
									background: "#FFFFFF0A",
									backdropFilter: "blur(40px)",
									border: errors.username ? "1px solid #ef4444" : "none",
								}}
							/>
							{errors.username && (
								<p id="username-error" className="text-[10px] text-red-500 mt-1" role="alert">{errors.username.message}</p>
							)}
						</div>

						<div className="flex flex-col mt-7">
							<label htmlFor="short-bio" className="text-sm font-medium text-white mb-2">
								Short bio
							</label>
							<textarea
								id="short-bio"
								{...register("bio")}
								placeholder="Tell about yourself in a few words"
								aria-invalid={errors.bio ? 'true' : 'false'}
								aria-describedby={errors.bio ? 'bio-error' : undefined}
								className="text-white placeholder:text-[#6F6F6F] focus:outline-none px-4 py-3 resize-none"
								style={{
									width: "660px",
									height: "120px",
									borderRadius: "16px",
									background: "#FFFFFF0A",
									backdropFilter: "blur(40px)",
									border: errors.bio ? "1px solid #ef4444" : "none",
								}}
							/>
							{errors.bio && (
								<p id="bio-error" className="text-[10px] text-red-500 mt-1" role="alert">{errors.bio.message}</p>
							)}
						</div>

						<div className="flex flex-col mt-7">
							<label htmlFor="website-url" className="text-sm font-medium text-white mb-2">
								Website URL
							</label>
							<input
								id="website-url"
								{...register("website")}
								placeholder="https://"
								aria-invalid={errors.website ? 'true' : 'false'}
								aria-describedby={errors.website ? 'website-error' : undefined}
								className="text-white placeholder:text-[#6F6F6F] focus:outline-none px-4"
								style={{
									width: "660px",
									height: "48px",
									borderRadius: "16px",
									background: "#FFFFFF0A",
									backdropFilter: "blur(40px)",
									border: errors.website ? "1px solid #ef4444" : "none",
								}}
							/>
							{errors.website && (
								<p id="website-error" className="text-[10px] text-red-500 mt-1" role="alert">{errors.website.message}</p>
							)}
						</div>

						<div className="flex flex-col mt-7">
							<label htmlFor="twitter-username" className="text-sm font-medium text-white mb-2">
								X (Twitter)
							</label>
							<input
								id="twitter-username"
								{...register("twitter")}
								placeholder="Enter your X username"
								aria-invalid={errors.twitter ? 'true' : 'false'}
								aria-describedby={errors.twitter ? 'twitter-error' : undefined}
								className="text-white placeholder:text-[#6F6F6F] focus:outline-none px-4"
								style={{
									width: "660px",
									height: "48px",
									borderRadius: "16px",
									background: "#FFFFFF0A",
									backdropFilter: "blur(40px)",
									border: errors.twitter ? "1px solid #ef4444" : "none",
								}}
							/>
							{errors.twitter && (
								<p id="twitter-error" className="text-[10px] text-red-500 mt-1" role="alert">{errors.twitter.message}</p>
							)}
						</div>

						<button
							onClick={handleSubmit(onSubmit)}
							disabled={isSubmitting || !isValid}
							className={` ${isSubmitting || !isValid ? "opacity-70 cursor-not-allowed" : ""
								} w-[131px] rounded-lg cursor-pointer bg-[#D2045B] hover:bg-[#B8043F] text-white font-semibold px-6 py-3 transition-colors mt-6`}
						>
							{isSubmitting ? <MusicLoader small /> : "Save"}
						</button>
					</div>

					{/* Right Column - Profile Image */}
					<div
						className="border border-[#2A2A2A] mt-12 bg-[#161616] p-6 flex flex-col"
						style={{
							width: "244px",
							height: "321px",
							borderRadius: "16px",
						}}
					>
						{profileImage ? (
							<div className="relative w-full aspect-square rounded-lg overflow-hidden mb-4">
								<Image
									src={profileImage}
									alt="Profile"
									fill
									className="object-cover"
									unoptimized
								/>
							</div>
						) : (
							<div className="w-full aspect-square rounded-lg bg-linear-to-br from-gray-600 to-gray-800 mb-4 flex items-center justify-center relative overflow-hidden">
								<div className="absolute inset-0 flex items-center justify-center">
									<svg
										className="w-24 h-24 text-gray-400"
										fill="currentColor"
										viewBox="0 0 24 24"
										aria-hidden="true"
									>
										<path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
									</svg>
								</div>
							</div>
						)}

						<h3 className="text-white font-semibold mb-2 text-sm">
							Profile
						</h3>
						<p className="text-xs text-[#A3A3A3] mb-4 flex-1">
							Make your artist profile stand out with a striking cover image
						</p>

						<input
							type="file"
							accept="image/*"
							className="hidden"
							{...register("profileImage")}
							ref={profileInputRef}
							onChange={handleProfileImageUpload}
							aria-label="Upload profile image"
						/>

						<button
							onClick={() => profileInputRef.current?.click()}
							className="w-full rounded-lg border border-[#2A2A2A] bg-[#111111] text-white px-4 py-2 hover:bg-[#1a1a1a] transition-colors text-sm"
						>
							Add Cover
						</button>
					</div>
				</div>
			)}

			{activeTab === "settings" && (
				<div id="settings-panel" className="mt-6 space-y-6">
					{/* Comments on songs */}
					<div className="flex items-start justify-between p-6 rounded-lg  ">
						<div className="flex-1 pr-6">
							<h3 className="text-white font-semibold mb-2">
								Comments on songs
							</h3>
							<p className="text-sm text-[#A3A3A3]">
								Stay updated on feedback, reactions, and conversations
								around your tracks
							</p>
						</div>
						<button
							onClick={() =>
								setNotifications((prev) => ({
									...prev,
									commentsOnSongs: !prev.commentsOnSongs,
								}))
							}
							role="switch"
							aria-checked={notifications.commentsOnSongs}
							className={`relative w-12 h-6 rounded-full transition-colors ${notifications.commentsOnSongs
									? "bg-[#D2045B]"
									: "bg-[#2A2A2A]"
								}`}
						>
							<span
								className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${notifications.commentsOnSongs
										? "translate-x-6"
										: "translate-x-0"
									}`}
							/>
						</button>
					</div>

					{/* Sales and Royalties updates */}
					<div className="flex items-start justify-between p-6 rounded-lg ">
						<div className="flex-1 pr-6">
							<h3 className="text-white font-semibold mb-2">
								Sales and Royalties updates
							</h3>
							<p className="text-sm text-[#A3A3A3]">
								Track your earnings and get notified about new sales and
								royalty payouts.
							</p>
						</div>
						<button
							onClick={() =>
								setNotifications((prev) => ({
									...prev,
									salesAndRoyalties: !prev.salesAndRoyalties,
								}))
							}
							role="switch"
							aria-checked={notifications.salesAndRoyalties}
							className={`relative w-12 h-6 rounded-full transition-colors ${notifications.salesAndRoyalties
									? "bg-[#D2045B]"
									: "bg-[#2A2A2A]"
								}`}
						>
							<span
								className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${notifications.salesAndRoyalties
										? "translate-x-6"
										: "translate-x-0"
									}`}
							/>
						</button>
					</div>

					{/* Platform Alerts */}
					<div className="flex items-start justify-between p-6 rounded-lg ">
						<div className="flex-1 pr-6">
							<h3 className="text-white font-semibold mb-2">
								Platform Alerts
							</h3>
							<p className="text-sm text-[#A3A3A3]">
								Receive important updates about your account, platform
								changes, and security notices.
							</p>
						</div>
						<button
							onClick={() =>
								setNotifications((prev) => ({
									...prev,
									platformAlerts: !prev.platformAlerts,
								}))
							}
							role="switch"
							aria-checked={notifications.platformAlerts}
							className={`relative w-12 h-6 rounded-full transition-colors ${notifications.platformAlerts
									? "bg-[#D2045B]"
									: "bg-[#2A2A2A]"
								}`}
						>
							<span
								className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${notifications.platformAlerts
										? "translate-x-6"
										: "translate-x-0"
									}`}
							/>
						</button>
					</div>
				</div>
			)}

			{activeTab === "onchain" && (
				<div id="onchain-panel" className="mt-6">
					<ErrorBoundary fallbackTitle="Failed to load on-chain profile">
						<SetupArtistOnChainProfile />
					</ErrorBoundary>
				</div>
			)}
		</>
	);
}