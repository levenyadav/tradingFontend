import { useEffect, useRef, useState } from "react";
import { CheckCircle, Clock, ShieldCheck, Upload, Camera, Check, AlertCircle, Info, X, FileText, User, MapPin, Sparkles } from "lucide-react";
import { getKYCStatus, submitKYC } from "../../lib/api/kyc";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card } from "../ui/card";
import { Progress } from "../ui/progress";
import { Badge } from "../ui/badge";

type Step = "welcome" | "personal" | "address" | "documents" | "selfie" | "review" | "submit";

function useCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const start = async () => {
    const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
    setStream(s);
    if (videoRef.current) {
      videoRef.current.srcObject = s;
      await videoRef.current.play();
    }
  };
  const stop = () => {
    stream?.getTracks().forEach(t => t.stop());
    setStream(null);
  };
  const capture = () => {
    if (!videoRef.current) return null;
    const v = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth || 640;
    canvas.height = v.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
    return new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/png", 0.92);
    });
  };
  return { videoRef, start, stop, capture };
}

function useCameraDocs() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const start = async () => {
    const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
    setStream(s);
    if (videoRef.current) {
      videoRef.current.srcObject = s;
      await videoRef.current.play();
    }
  };
  const stop = () => {
    stream?.getTracks().forEach(t => t.stop());
    setStream(null);
  };
  const capture = () => {
    if (!videoRef.current) return null;
    const v = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth || 640;
    canvas.height = v.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
    return new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/png", 0.92);
    });
  };
  return { videoRef, start, stop, capture };
}

export default function KYCWizard({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<Step>("welcome");
  const [locked, setLocked] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const [polling, setPolling] = useState(false);

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

  const [docFront, setDocFront] = useState<File | null>(null);
  const [docBack, setDocBack] = useState<File | null>(null);
  const [selfieBlob, setSelfieBlob] = useState<Blob | null>(null);

  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showCamera, setShowCamera] = useState(false);
  const [captureMode, setCaptureMode] = useState<'front' | 'back' | null>(null);

  useEffect(() => {
    (async () => {
      const s = await getKYCStatus();
      setStatus(s);
      if (s?.verified || s?.status === "verified") {
        setStep("status");
        setLocked(true);
      } else if (s?.status === "processing") {
        setStep("status");
        setLocked(true);
      } else if (s?.status === "pending") {
        setStep("details");
        setLocked(false);
      } else {
        setStep("details");
      }
    })();
  }, []);

  const { videoRef, start, stop, capture } = useCamera();
  const { videoRef: docVideoRef, start: startDocCam, stop: stopDocCam, capture: captureDoc } = useCameraDocs();

  useEffect(() => {
    if (step === "selfie") start();
    else stop();
  }, [step]);

  useEffect(() => {
    if (step === "documents") startDocCam();
    else stopDocCam();
  }, [step]);

  const captureSelfie = async () => {
    const blob = await capture();
    if (blob) setSelfieBlob(blob);
  };

  const nextFromDetails = () => {
    const panOk = /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(panNumber);
    const aadhaarOk = /^[0-9]{12}$/.test(aadhaarNumber);
    const newErrors: Record<string, string> = {};
    if (!panOk) newErrors.panNumber = "PAN must match AAAAA9999A";
    if (!aadhaarOk) newErrors.aadhaarNumber = "Aadhaar must be 12 digits";
    if (!firstName) newErrors.firstName = "First name is required";
    if (!lastName) newErrors.lastName = "Last name is required";
    if (!dateOfBirth) newErrors.dateOfBirth = "Date of Birth is required";
    setErrors(newErrors);
    if (Object.keys(newErrors).length) { setMessage("Please complete required fields"); return; }
    setMessage("");
    setStep("documents");
  };

  const nextFromDocuments = () => {
    if (!docFront || !docBack) {
      setMessage("Capture PAN/Aadhaar front and back");
      return;
    }
    setMessage("");
    setStep("selfie");
  };

  const nextFromSelfie = () => {
    if (!selfieBlob) {
      setMessage("Capture selfie with PAN in hand");
      return;
    }
    setMessage("");
    setStep("review");
  };

  const submit = async () => {
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
      const selfieFile = selfieBlob ? new File([selfieBlob], "selfie.png", { type: "image/png" }) : null;
      await submitKYC({ documentType: "pan_card", kycData, documentFront: docFront, documentBack: docBack, selfie: selfieFile });
      setLocked(true);
      setStep("status");
      setMessage("");
      setPolling(true);
    } catch (e: any) {
      const msg = String(e?.message || "Submission failed");
      const lower = msg.toLowerCase();
      if (lower.includes("already in progress") || lower.includes("already submitted")) {
        setLocked(true);
        setStep("status");
        setMessage("");
        setPolling(true);
      } else {
        setMessage(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    let t: any;
    const loop = async () => {
      const s = await getKYCStatus();
      setStatus(s);
      if (s?.verified || s?.status === "verified") {
        setPolling(false);
        return;
      }
      t = setTimeout(loop, 30000);
    };
    if (polling) loop();
    return () => t && clearTimeout(t);
  }, [polling]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-blue-700 to-blue-900 p-6 text-white">
        <button type="button" onClick={onBack} className="mb-4 text-white/80 hover:text-white">← Back</button>
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-8 h-8" />
          <h1 className="text-2xl font-semibold">KYC Verification</h1>
        </div>
        <p className="text-white/90">Complete a quick 4-step verification to secure your account</p>
      </div>
      <div className="p-4 space-y-4">
      {(() => {
        const getLabels = (s: Step) => {
          switch (s) {
            case "details": return { current: "Details", next: "Documents", prev: [] };
            case "documents": return { current: "Documents", next: "Selfie", prev: ["Details"] };
            case "selfie": return { current: "Selfie", next: "Review", prev: ["Details", "Documents"] };
            case "review": return { current: "Review", next: "Status", prev: ["Details", "Documents", "Selfie"] };
            case "status": return { current: "Status", next: null, prev: ["Details", "Documents", "Selfie", "Review"] };
            default: return { current: "Details", next: "Documents", prev: [] };
          }
        };
        const { current, next, prev } = getLabels(step);
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-blue-700 font-semibold text-[14px]">{current}</span>
              {next && (
                <>
                  <span className="text-gray-400">›</span>
                  <span className="text-gray-600 text-[13px]">{next}</span>
                </>
              )}
            </div>
            {prev.length > 0 && step !== "status" && (
              <div className="text-[11px] text-gray-400">Completed: {prev.join(", ")}</div>
            )}
          </div>
        );
      })()}

      {step === "details" && (
        <div className="space-y-3">
          <input className={`w-full bg-white border rounded-lg p-3 text-gray-700 placeholder:text-gray-400 ${errors.panNumber?"border-red-400":"border-gray-200"}`} placeholder="PAN Number" value={panNumber} onChange={e=>setPanNumber(e.target.value.toUpperCase())} />
          {errors.panNumber && <div className="text-xs text-red-600">{errors.panNumber}</div>}
          <input className={`w-full bg-white border rounded-lg p-3 text-gray-700 placeholder:text-gray-400 ${errors.aadhaarNumber?"border-red-400":"border-gray-200"}`} placeholder="Aadhaar Number" value={aadhaarNumber} onChange={e=>setAadhaarNumber(e.target.value)} />
          {errors.aadhaarNumber && <div className="text-xs text-red-600">{errors.aadhaarNumber}</div>}
          <div className="grid grid-cols-2 gap-3">
            <input className={`w-full bg-white border rounded-lg p-3 text-gray-700 placeholder:text-gray-400 ${errors.firstName?"border-red-400":"border-gray-200"}`} placeholder="First Name" value={firstName} onChange={e=>setFirstName(e.target.value)} />
            <input className={`w-full bg-white border rounded-lg p-3 text-gray-700 placeholder:text-gray-400 ${errors.lastName?"border-red-400":"border-gray-200"}`} placeholder="Last Name" value={lastName} onChange={e=>setLastName(e.target.value)} />
          </div>
          <input className={`w-full bg-white border rounded-lg p-3 text-gray-700 placeholder:text-gray-400 ${errors.dateOfBirth?"border-red-400":"border-gray-200"}`} placeholder="Date of Birth (YYYY-MM-DD)" value={dateOfBirth} onChange={e=>setDateOfBirth(e.target.value)} />
          {errors.dateOfBirth && <div className="text-xs text-red-600">{errors.dateOfBirth}</div>}
          <input className="w-full bg-white border border-gray-200 rounded-lg p-3 text-gray-700 placeholder:text-gray-400" placeholder="Street" value={street} onChange={e=>setStreet(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <input className="w-full bg-white border border-gray-200 rounded-lg p-3 text-gray-700 placeholder:text-gray-400" placeholder="City" value={city} onChange={e=>setCity(e.target.value)} />
            <input className="w-full bg-white border border-gray-200 rounded-lg p-3 text-gray-700 placeholder:text-gray-400" placeholder="State" value={state} onChange={e=>setState(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input className="w-full bg-white border border-gray-200 rounded-lg p-3 text-gray-700 placeholder:text-gray-400" placeholder="Zip Code" value={zipCode} onChange={e=>setZipCode(e.target.value)} />
            <input className="w-full bg-white border border-gray-200 rounded-lg p-3 text-gray-700 placeholder:text-gray-400" placeholder="Country" value={country} onChange={e=>setCountry(e.target.value)} />
          </div>
          <Button onClick={nextFromDetails} className="bg-blue-700 text-white">Next</Button>
        </div>
      )}

      {step === "documents" && (
        <div className="space-y-4">
          <div className="text-gray-700">Hold your PAN/Aadhaar clearly in the placeholder box, avoid glare, ensure text is readable.</div>
          <div className="relative">
            <video ref={docVideoRef} className="w-full rounded bg-black" muted playsInline />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-56 h-36 border-2 border-dashed border-gray-300 bg-white/10 rounded" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <div className="text-sm text-gray-700">Front</div>
              <div className="flex gap-2">
                <Button onClick={async ()=>{ const b = await captureDoc(); if (b) setDocFront(new File([b], "front.png", { type: "image/png" })); }} className="bg-blue-700 text-white">Capture Front</Button>
                <input type="file" accept="image/*" onChange={e=>setDocFront(e.target.files?.[0] || null)} className="text-gray-700" />
              </div>
              {docFront && <img src={URL.createObjectURL(docFront)} className="w-32 h-20 rounded border" />}
            </div>
            <div className="space-y-2">
              <div className="text-sm text-gray-700">Back</div>
              <div className="flex gap-2">
                <Button onClick={async ()=>{ const b = await captureDoc(); if (b) setDocBack(new File([b], "back.png", { type: "image/png" })); }} className="bg-blue-700 text-white">Capture Back</Button>
                <input type="file" accept="image/*" onChange={e=>setDocBack(e.target.files?.[0] || null)} className="text-gray-700" />
              </div>
              {docBack && <img src={URL.createObjectURL(docBack)} className="w-32 h-20 rounded border" />}
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <Button onClick={()=>setStep("details")} className="bg-gray-100 text-gray-700">Back</Button>
            <Button onClick={nextFromDocuments} className="h-11 px-6 rounded-lg bg-blue-700 hover:bg-blue-800 text-white">Next</Button>
          </div>
        </div>
      )}

      {step === "selfie" && (
        <div className="space-y-3">
          <div className="text-gray-700">Hold your PAN card in your hand; center your face and card. Tap Capture.</div>
          <video ref={videoRef} className="w-full rounded bg-black" muted playsInline />
          <div className="flex gap-3 justify-between">
            <Button onClick={captureSelfie} className="bg-blue-700 text-white">Capture</Button>
            <Button onClick={()=>setSelfieBlob(null)} className="bg-gray-100 text-gray-700">Retake</Button>
          </div>
          {selfieBlob && <img src={URL.createObjectURL(selfieBlob)} alt="Selfie" className="w-40 h-40 rounded" />}
          <div className="flex gap-3 justify-between">
            <Button onClick={()=>setStep("documents")} className="bg-gray-100 text-gray-700">Back</Button>
            <Button onClick={nextFromSelfie} className="h-11 px-6 rounded-lg bg-blue-700 hover:bg-blue-800 text-white">Next</Button>
          </div>
        </div>
      )}

      {step === "review" && (
        <div className="space-y-3">
          <div className="text-gray-700">Review details and photos. After submission, editing is disabled.</div>
          <div className="grid grid-cols-2 gap-3 text-gray-700">
            <div>PAN: {panNumber}</div>
            <div>Aadhaar: {aadhaarNumber}</div>
            <div>Name: {firstName} {lastName}</div>
            <div>DOB: {dateOfBirth}</div>
          </div>
          <div className="flex gap-3">
            {docFront && <img src={URL.createObjectURL(docFront)} className="w-32 h-20 rounded border" />}
            {docBack && <img src={URL.createObjectURL(docBack)} className="w-32 h-20 rounded border" />}
            {selfieBlob && <img src={URL.createObjectURL(selfieBlob)} className="w-32 h-20 rounded border" />}
          </div>
          <div className="flex gap-3 justify-end">
            <Button onClick={()=>setStep("selfie")} className="bg-gray-100 text-gray-700">Back</Button>
            <Button onClick={submit} className="h-11 px-6 rounded-lg bg-blue-700 hover:bg-blue-800 text-white" disabled={submitting}>{submitting?"Submitting...":"Submit"}</Button>
          </div>
        </div>
      )}

      {step === "status" && (
        <div className="space-y-3">
          {status?.verified || status?.status === "verified" ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-700 mt-0.5" />
              <div>
                <p className="text-green-800 font-medium">KYC Verified</p>
                <p className="text-green-700 text-sm">Thank you. Your identity has been verified.</p>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-4 flex items-start gap-3 text-yellow-900">
              <Clock className="w-5 h-5 text-yellow-900 mt-0.5" />
              <div>
                <p className="font-medium">KYC in processing</p>
                <p className="text-sm">Your KYC application is under review. Please wait.</p>
                <p className="text-sm">Verification typically takes 1–3 business days.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {message && step !== "status" && <div className="text-sm text-blue-700 bg-blue-100 border border-blue-200 rounded px-3 py-2">{message}</div>}
      </div>
    </div>
  );
}
