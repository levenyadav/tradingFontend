import { useState } from "react";
import { changePassword } from "../../lib/api/auth";
import { getAccessToken } from "../../lib/storage/session";
import { Button } from "../ui/button";

export default function ChangePassword({ onBack }: { onBack: () => void }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    setMessage("");
    try {
      const accessToken = getAccessToken() || "";
      await changePassword({ currentPassword, newPassword, confirmPassword, accessToken });
      setMessage("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e: any) {
      setMessage(e?.message || "Failed to change password");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-gray-900">Change Password</h3>
        <button onClick={onBack} className="text-gray-700 hover:text-gray-900">Back</button>
      </div>
      <input className="w-full bg-white border border-gray-200 rounded-lg p-3 text-gray-700 placeholder:text-gray-400" placeholder="Current Password" type="password" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)} />
      <input className="w-full bg-white border border-gray-200 rounded-lg p-3 text-gray-700 placeholder:text-gray-400" placeholder="New Password" type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} />
      <input className="w-full bg-white border border-gray-200 rounded-lg p-3 text-gray-700 placeholder:text-gray-400" placeholder="Confirm Password" type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} />
      {message && <div className="text-sm text-gray-600">{message}</div>}
      <Button onClick={save} className="bg-blue-700 text-white" disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
    </div>
  );
}
