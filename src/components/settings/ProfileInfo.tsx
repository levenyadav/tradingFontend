import { useEffect, useState } from "react";
import { getMe } from "../../lib/api/user";
import { jsonFetch } from "../../lib/api/client";
import { authHeaders } from "../../lib/api/utils";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Badge } from "../ui/badge";

export default function ProfileInfo({ onBack }: { onBack: () => void }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [timezone, setTimezone] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    (async () => {
      const me = await getMe();
      setFirstName(me.firstName || "");
      setLastName(me.lastName || "");
      setPhone((me as any).phone || "");
      setCountry((me as any).country || "");
      setTimezone(me.timezone || "UTC");
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    setMessage("");
    try {
      await jsonFetch("/api/v1/users/profile", {
        method: "PUT",
        headers: authHeaders(),
        body: { firstName, lastName, phone, country, timezone },
      });
      setMessage("Profile updated");
    } catch (e: any) {
      setMessage(e?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-blue-700 to-blue-900 p-6 text-white">
        <button onClick={onBack} className="mb-4 text-white/80 hover:text-white">← Back</button>
        <h1 className="text-2xl font-semibold">Profile Information</h1>
      </div>
      <div className="p-4 text-gray-700">Loading...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-blue-700 to-blue-900 p-6 text-white">
        <button onClick={onBack} className="mb-4 text-white/80 hover:text-white">← Back</button>
        <h1 className="text-2xl font-semibold">Profile Information</h1>
        <p className="text-white/90">Keep your account details up to date for a better experience</p>
      </div>
      <div className="p-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Personal Details</CardTitle>
            <CardDescription>Basic information associated with your account</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-500 mb-1">First Name</p>
                <Input placeholder="First Name" value={firstName} onChange={e=>setFirstName(e.target.value)} />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Last Name</p>
                <Input placeholder="Last Name" value={lastName} onChange={e=>setLastName(e.target.value)} />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Phone</p>
                <Input type="tel" inputMode="tel" autoComplete="tel" placeholder="Phone" value={phone} onChange={e=>setPhone(e.target.value)} />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Country (e.g., IN)</p>
                <Input placeholder="Country" value={country} onChange={e=>setCountry(e.target.value.toUpperCase())} />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Timezone</p>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger className="w-full bg-white text-gray-700 justify-center data-[placeholder]:text-gray-500"><SelectValue placeholder="Timezone" className="w-full text-center text-gray-700" /></SelectTrigger>
                  <SelectContent className="bg-white text-gray-700">
                    <SelectItem value="UTC" className="text-gray-700">UTC</SelectItem>
                    <SelectItem value="Asia/Kolkata" className="text-gray-700">Asia/Kolkata</SelectItem>
                    <SelectItem value="Europe/London" className="text-gray-700">Europe/London</SelectItem>
                    <SelectItem value="America/New_York" className="text-gray-700">America/New_York</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end gap-3 px-2 py-2">
              {message && (<Badge className="bg-green-100 text-green-700">{message}</Badge>)}
              <Button className="h-11 px-6 rounded-lg bg-blue-700 hover:bg-blue-800 text-white" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-blue-700">Tips</CardTitle>
            <p className="text-sm text-blue-700">Ensure your name matches your KYC documents</p>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
              <li>Use your legal first and last name</li>
              <li>Provide a reachable phone number for account notifications</li>
              <li>Timezone helps us show times correctly across transactions</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
