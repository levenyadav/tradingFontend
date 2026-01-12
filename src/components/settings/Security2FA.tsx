import { useEffect, useState } from "react";
import { getMe } from "../../lib/api/user";
import { enable2FA, disable2FA } from "../../lib/api/auth";
import { getAccessToken } from "../../lib/storage/session";
import { Button } from "../ui/button";

export default function Security2FA({ onBack }: { onBack: () => void }) {
  const [loading, setLoading] = useState(true);
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [password, setPassword] = useState("");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    (async () => {
      const me = await getMe();
      setTwoFAEnabled(!!me.twoFactorEnabled);
      setLoading(false);
    })();
  }, []);

  const onEnable = async () => {
    setMessage("");
    const token = getAccessToken() || "";
    try {
      const res = await enable2FA({ token, password });
      setSecret(res.secret);
      setQrCode(res.qrCode);
      setMessage("2FA enabled. Scan QR in your authenticator app.");
      setTwoFAEnabled(true);
    } catch (e: any) {
      setMessage(e?.message || "Failed to enable 2FA");
    }
  };

  const onDisable = async () => {
    setMessage("");
    const token = getAccessToken() || "";
    try {
      await disable2FA({ token, password });
      setSecret(null);
      setQrCode(null);
      setTwoFAEnabled(false);
      setMessage("2FA disabled");
    } catch (e: any) {
      setMessage(e?.message || "Failed to disable 2FA");
    }
  };

  if (loading) return <div className="p-4 text-gray-700">Loading...</div>;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-gray-900">Security & Verification</h3>
        <button onClick={onBack} className="text-gray-700 hover:text-gray-900">Back</button>
      </div>
      <input className="w-full bg-white border border-gray-200 rounded-lg p-3 text-gray-700 placeholder:text-gray-400" placeholder="Current Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
      {!twoFAEnabled ? (
        <Button onClick={onEnable} className="bg-blue-700 text-white">Enable 2FA</Button>
      ) : (
        <Button onClick={onDisable} className="bg-red-600 text-white">Disable 2FA</Button>
      )}
      {secret && <div className="text-sm text-gray-700">Secret: {secret}</div>}
      {qrCode && <img src={qrCode} alt="QR Code" className="w-40 h-40" />}
      {message && <div className="text-sm text-gray-600">{message}</div>}
    </div>
  );
}
