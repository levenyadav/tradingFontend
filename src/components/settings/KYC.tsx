import { useEffect, useState } from "react";
import { getKYCStatus, getKYCRequirements, submitKYC } from "../../lib/api/kyc";
import { Button } from "../ui/button";

export default function KYC({ onBack }: { onBack: () => void }) {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<any>(null);
  const [requirements, setRequirements] = useState<any>(null);
  const [panNumber, setPanNumber] = useState("");
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [country, setCountry] = useState("IN");
  const [documentFront, setDocumentFront] = useState<File | null>(null);
  const [documentBack, setDocumentBack] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const s = await getKYCStatus();
      setStatus(s);
      if (!s?.verified) {
        const req = await getKYCRequirements();
        setRequirements(req);
      }
      setLoading(false);
    })();
  }, []);

  const onSubmit = async () => {
    setSubmitting(true);
    setMessage("");
    try {
      const kycData = {
        panNumber,
        aadhaarNumber,
        firstName,
        lastName,
        dateOfBirth,
        address: { street, city, state, postalCode: zipCode, country },
      };
      await submitKYC({ documentType: "pan_card", kycData, documentFront, documentBack, selfie });
      setMessage("KYC submitted successfully");
    } catch (e: any) {
      setMessage(e?.message || "Failed to submit KYC");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-4 text-gray-700">Loading...</div>;
  if (status?.verified) {
    return (
      <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-gray-900">KYC Status</h3>
        <button onClick={onBack} className="text-gray-700 hover:text-gray-900">Back</button>
      </div>
        <div className="bg-green-50 text-green-700 p-4 rounded">Verified</div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-gray-900">KYC Application</h3>
        <button onClick={onBack} className="text-gray-700 hover:text-gray-900">Back</button>
      </div>
      <div className="space-y-3">
        <input className="w-full bg-white border border-gray-200 rounded-lg p-3 text-gray-700 placeholder:text-gray-400" placeholder="PAN Number" value={panNumber} onChange={e=>setPanNumber(e.target.value)} />
        <input className="w-full bg-white border border-gray-200 rounded-lg p-3 text-gray-700 placeholder:text-gray-400" placeholder="Aadhaar Number" value={aadhaarNumber} onChange={e=>setAadhaarNumber(e.target.value)} />
        <input className="w-full bg-white border border-gray-200 rounded-lg p-3 text-gray-700 placeholder:text-gray-400" placeholder="First Name" value={firstName} onChange={e=>setFirstName(e.target.value)} />
        <input className="w-full bg-white border border-gray-200 rounded-lg p-3 text-gray-700 placeholder:text-gray-400" placeholder="Last Name" value={lastName} onChange={e=>setLastName(e.target.value)} />
        <input className="w-full bg-white border border-gray-200 rounded-lg p-3 text-gray-700 placeholder:text-gray-400" placeholder="Date of Birth (YYYY-MM-DD)" value={dateOfBirth} onChange={e=>setDateOfBirth(e.target.value)} />
        <input className="w-full bg-white border border-gray-200 rounded-lg p-3 text-gray-700 placeholder:text-gray-400" placeholder="Street" value={street} onChange={e=>setStreet(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <input className="w-full bg-white border border-gray-200 rounded-lg p-3 text-gray-700 placeholder:text-gray-400" placeholder="City" value={city} onChange={e=>setCity(e.target.value)} />
          <input className="w-full bg-white border border-gray-200 rounded-lg p-3 text-gray-700 placeholder:text-gray-400" placeholder="State" value={state} onChange={e=>setState(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input className="w-full bg-white border border-gray-200 rounded-lg p-3 text-gray-700 placeholder:text-gray-400" placeholder="Zip Code" value={zipCode} onChange={e=>setZipCode(e.target.value)} />
          <input className="w-full bg-white border border-gray-200 rounded-lg p-3 text-gray-700 placeholder:text-gray-400" placeholder="Country" value={country} onChange={e=>setCountry(e.target.value)} />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-gray-700">PAN/Aadhaar Front</label>
          <input type="file" onChange={e=>setDocumentFront(e.target.files?.[0] || null)} />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-gray-700">Aadhaar Back</label>
          <input type="file" onChange={e=>setDocumentBack(e.target.files?.[0] || null)} />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-gray-700">Selfie with PAN</label>
          <input type="file" onChange={e=>setSelfie(e.target.files?.[0] || null)} />
        </div>
      </div>
      {message && <div className="text-sm text-gray-600">{message}</div>}
      <Button onClick={onSubmit} className="bg-blue-700 text-white" disabled={submitting}>{submitting ? "Submitting..." : "Submit KYC"}</Button>
    </div>
  );
}
