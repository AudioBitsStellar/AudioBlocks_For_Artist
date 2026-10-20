import { useRole } from "@/hooks/useRole";
import { getSettingsRestrictionReason } from "@/types/role";

interface NotificationPreferences {
  commentsOnSongs: boolean;
  salesAndRoyalties: boolean;
  platformAlerts: boolean;
}

interface ProfileSettingsTabProps {
  notifications: NotificationPreferences;
  onNotificationChange: (key: keyof NotificationPreferences) => void;
}

/**
 * Settings tab for notification preferences.
 */
export default function ProfileSettingsTab({
  notifications,
  onNotificationChange,
}: ProfileSettingsTabProps) {
  const { role, info: roleInfo, can } = useRole();
  const canEditSettings = can("settings:edit");

  return (
    <div id="settings-panel" role="tabpanel" className="mt-6 space-y-6">
      {/* Comments on songs */}
      <div className="flex items-start justify-between p-6 rounded-lg">
        <div className="flex-1 pr-6">
          <h3 className="text-white font-semibold mb-2">Comments on songs</h3>
          <p className="text-sm text-[#A3A3A3]">
            Stay updated on feedback, reactions, and conversations around your tracks
          </p>
        </div>
        <button
          onClick={() => onNotificationChange("commentsOnSongs")}
          role="switch"
          disabled={!canEditSettings}
          aria-checked={notifications.commentsOnSongs}
          title={canEditSettings ? undefined : getSettingsRestrictionReason(role)}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            notifications.commentsOnSongs ? "bg-[#D2045B]" : "bg-[#2A2A2A]"
          } ${!canEditSettings ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <span
            className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
              notifications.commentsOnSongs ? "translate-x-6" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* Sales and Royalties updates */}
      <div className="flex items-start justify-between p-6 rounded-lg">
        <div className="flex-1 pr-6">
          <h3 className="text-white font-semibold mb-2">Sales and Royalties updates</h3>
          <p className="text-sm text-[#A3A3A3]">
            Track your earnings and get notified about new sales and royalty payouts.
          </p>
        </div>
        <button
          onClick={() => onNotificationChange("salesAndRoyalties")}
          role="switch"
          disabled={!canEditSettings}
          aria-checked={notifications.salesAndRoyalties}
          title={canEditSettings ? undefined : getSettingsRestrictionReason(role)}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            notifications.salesAndRoyalties ? "bg-[#D2045B]" : "bg-[#2A2A2A]"
          } ${!canEditSettings ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <span
            className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
              notifications.salesAndRoyalties ? "translate-x-6" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* Platform Alerts */}
      <div className="flex items-start justify-between p-6 rounded-lg">
        <div className="flex-1 pr-6">
          <h3 className="text-white font-semibold mb-2">Platform Alerts</h3>
          <p className="text-sm text-[#A3A3A3]">
            Receive important updates about your account, platform changes, and security
            notices.
          </p>
        </div>
        <button
          onClick={() => onNotificationChange("platformAlerts")}
          role="switch"
          disabled={!canEditSettings}
          aria-checked={notifications.platformAlerts}
          title={canEditSettings ? undefined : getSettingsRestrictionReason(role)}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            notifications.platformAlerts ? "bg-[#D2045B]" : "bg-[#2A2A2A]"
          } ${!canEditSettings ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <span
            className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
              notifications.platformAlerts ? "translate-x-6" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {!canEditSettings && (
        <p className="text-xs text-[#A3A3A3] italic" data-testid="settings-readonly-notice">
          {`You're signed in as a ${roleInfo.label.toLowerCase()} — settings are managed by the workspace owner.`}
        </p>
      )}
    </div>
  );
}
