import { useEffect, useRef, useState } from "react";
import { CheckCircle, Clock, ShieldCheck, Upload, Camera, Check, AlertCircle, Info, X, FileText, User, MapPin, Sparkles, ArrowRight, ArrowLeft, HelpCircle } from "lucide-react";
import { getKYCStatus, submitKYC } from "../../lib/api/kyc";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card } from "../ui/card";
import { Progress } from "../ui/progress";
import { Badge } from "../ui/badge";

type Step = "welcome" | "personal" | "address" | "documents" | "selfie" | "review" | "submit";

interface StepConfig {
  id: Step;
  title: string;
  description: string;
  icon: any;
  order: number;
}

const STEPS: StepConfig[] = [
  { id: "welcome", title: "Get Started", description: "Quick overview", icon: Sparkles, order: 0 },
  { id: "personal", title: "Personal Info", description: "Your details", icon: User, order: 1 },
  { id: "address", title: "Address", description: "Where you live", icon: MapPin, order: 2 },
  { id: "documents", title: "Documents", description: "ID proof", icon: FileText, order: 3 },
  { id: "selfie", title: "Selfie", description: "Photo verification", icon: Camera, order: 4 },
  { id: "review", title: "Review", description: "Check & submit", icon: CheckCircle, order: 5 },
];

function useCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  const start = async (facingMode: "user" | "environment" = "user") => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: facingMode === "user" ? "user" : { ideal: "environment" } }, 
        audio: false 
      });
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        await videoRef.current.play();
      }
    } catch (error) {
      console.error("Camera error:", error);
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

  return { videoRef, start, stop, capture, isActive: !!stream };
}

export default function KYCWizardNew({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<Step>("welcome");
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Personal Info
  const [panNumber, setPanNumber] = useState("");
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");

  // Address Info
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [country, setCountry] = useState("IN");

  // Documents
  const [docFront, setDocFront] = useState<File | null>(null);
  const [docBack, setDocBack] = useState<File | null>(null);
  const [panCard, setPanCard] = useState<File | null>(null);
  const [selfieBlob, setSelfieBlob] = useState<Blob | null>(null);

  // UI State
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [captureMode, setCaptureMode] = useState<'doc' | 'selfie' | null>(null);
  const [currentDocType, setCurrentDocType] = useState<'pan' | 'aadhaar-front' | 'aadhaar-back' | null>(null);

  const { videoRef, start, stop, capture, isActive } = useCamera();

  useEffect(() => {
    (async () => {
      try {
        const s = await getKYCStatus();
        setStatus(s);
        if (s?.verified || s?.status === "verified") {
          setStep("submit");
        } else if (s?.status === "processing" || s?.status === "pending") {
          setStep("submit");
        }
      } catch (error) {
        console.error("Failed to load KYC status:", error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (showCamera) {
      const facingMode = captureMode === 'doc' ? 'environment' : 'user';
      start(facingMode as any);
    } else {
      stop();
    }
    return () => stop();
  }, [showCamera, captureMode]);

  const getCurrentStepIndex = () => STEPS.findIndex(s => s.id === step);
  const progress = ((getCurrentStepIndex() + 1) / STEPS.length) * 100;

  const validatePersonal = () => {
    const newErrors: Record<string, string> = {};
    const panPattern = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
    const aadhaarPattern = /^[0-9]{12}$/;

    if (!panPattern.test(panNumber)) newErrors.panNumber = "Invalid PAN format (e.g., ABCDE1234F)";
    if (!aadhaarPattern.test(aadhaarNumber)) newErrors.aadhaarNumber = "Aadhaar must be 12 digits";
    if (!firstName.trim()) newErrors.firstName = "First name is required";
    if (!lastName.trim()) newErrors.lastName = "Last name is required";
    if (!dateOfBirth) newErrors.dateOfBirth = "Date of birth is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateAddress = () => {
    const newErrors: Record<string, string> = {};
    if (!street.trim()) newErrors.street = "Street address is required";
    if (!city.trim()) newErrors.city = "City is required";
    if (!state.trim()) newErrors.state = "State is required";
    if (!zipCode.trim()) newErrors.zipCode = "Zip code is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateDocuments = () => {
    if (!panCard || !docFront || !docBack) {
      setMessage("Please upload PAN card and both sides of Aadhaar card");
      return false;
    }
    setMessage("");
    return true;
  };

  const validateSelfie = () => {
    if (!selfieBlob) {
      setMessage("Please capture a selfie with your PAN card");
      return false;
    }
    setMessage("");
    return true;
  };

  const handleNext = () => {
    setMessage("");
    setErrors({});

    if (step === "personal" && !validatePersonal()) return;
    if (step === "address" && !validateAddress()) return;
    if (step === "documents" && !validateDocuments()) return;
    if (step === "selfie" && !validateSelfie()) return;

    const currentIndex = getCurrentStepIndex();
    if (currentIndex < STEPS.length - 1) {
      setStep(STEPS[currentIndex + 1].id);
    }
  };

  const handleBack = () => {
    const currentIndex = getCurrentStepIndex();
    if (currentIndex > 0) {
      setStep(STEPS[currentIndex - 1].id);
    }
  };

  const handleCapture = async (type: 'pan' | 'aadhaar-front' | 'aadhaar-back' | 'selfie') => {
    const blob = await capture();
    if (blob) {
      if (type === 'pan') {
        setPanCard(new File([blob], "pan-card.png", { type: "image/png" }));
      } else if (type === 'aadhaar-front') {
        setDocFront(new File([blob], "aadhaar-front.png", { type: "image/png" }));
      } else if (type === 'aadhaar-back') {
        setDocBack(new File([blob], "aadhaar-back.png", { type: "image/png" }));
      } else {
        setSelfieBlob(blob);
      }
      setShowCamera(false);
      setCaptureMode(null);
    }
  };

  const handleSubmit = async () => {
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
      await submitKYC({ documentType: "pan_card", kycData, documentFront: panCard || docFront, documentBack: docBack, selfie: selfieFile });
      setStep("submit");
    } catch (error: any) {
      setMessage(error?.message || "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-700 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading verification status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="text-white p-6 pb-8" style={{ background: '#ef5b2a' }}>
        <button onClick={onBack} className="mb-4 text-white/90 hover:text-white flex items-center gap-2">
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>
        <div className="flex items-center gap-3 mb-3">
          <ShieldCheck className="w-10 h-10" />
          <div>
            <h1 className="text-2xl font-bold">Identity Verification</h1>
            <p className="text-blue-100 text-sm">Secure your account in just a few steps</p>
          </div>
        </div>
        
        {step !== "welcome" && step !== "submit" && (
          <div className="mt-6">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-blue-100">Step {getCurrentStepIndex() + 1} of {STEPS.length}</span>
              <span className="text-blue-100">{Math.round(progress)}% complete</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-white h-full rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="p-4 pb-24 max-w-2xl mx-auto">
        {/* Welcome Step */}
        {step === "welcome" && (
          <div className="space-y-4 animate-fade-in">
            <Card className="p-6 bg-white">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-10 h-10 text-blue-700" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Let's verify your identity</h2>
                <p className="text-gray-600">This quick process helps keep your account secure and unlocks all platform features.</p>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
                  <Clock className="w-5 h-5 text-blue-700 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Takes 5 minutes</p>
                    <p className="text-sm text-gray-600">Quick and easy verification process</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
                  <ShieldCheck className="w-5 h-5 text-green-700 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Secure & encrypted</p>
                    <p className="text-sm text-gray-600">Your data is protected with bank-level security</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-purple-700 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Unlock full access</p>
                    <p className="text-sm text-gray-600">Higher limits, all payment methods, priority support</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-gray-700" />
                  What you'll need
                </h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    PAN Card (Permanent Account Number)
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    Aadhaar Card (both sides)
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    A clear selfie with your PAN card
                  </li>
                </ul>
              </div>

              <Button onClick={() => setStep("personal")} className="w-full h-12 bg-blue-700 hover:bg-blue-800 text-white">
                Get Started
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Card>
          </div>
        )}

        {/* Personal Info Step */}
        {step === "personal" && (
          <div className="space-y-4 animate-fade-in">
            <Card className="p-6 bg-white">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-blue-700" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Personal Information</h2>
                  <p className="text-sm text-gray-600">Enter details exactly as they appear on your PAN card</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="panNumber" className="text-gray-700 font-medium mb-2 flex items-center gap-2">
                    PAN Number
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="panNumber"
                    value={panNumber}
                    onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                    placeholder="ABCDE1234F"
                    className={`h-12 ${errors.panNumber ? 'border-red-400' : ''}`}
                    maxLength={10}
                  />
                  {errors.panNumber && <p className="text-xs text-red-600 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.panNumber}</p>}
                  <p className="text-xs text-gray-500 mt-1">Format: 5 letters, 4 digits, 1 letter</p>
                </div>

                <div>
                  <Label htmlFor="aadhaarNumber" className="text-gray-700 font-medium mb-2 flex items-center gap-2">
                    Aadhaar Number
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="aadhaarNumber"
                    value={aadhaarNumber}
                    onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, ''))}
                    placeholder="1234 5678 9012"
                    className={`h-12 ${errors.aadhaarNumber ? 'border-red-400' : ''}`}
                    maxLength={12}
                  />
                  {errors.aadhaarNumber && <p className="text-xs text-red-600 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.aadhaarNumber}</p>}
                  <p className="text-xs text-gray-500 mt-1">12-digit Aadhaar number</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName" className="text-gray-700 font-medium mb-2 flex items-center gap-2">
                      First Name
                      <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="John"
                      className={`h-12 ${errors.firstName ? 'border-red-400' : ''}`}
                    />
                    {errors.firstName && <p className="text-xs text-red-600 mt-1"><AlertCircle className="w-3 h-3 inline mr-1" />{errors.firstName}</p>}
                  </div>
                  <div>
                    <Label htmlFor="lastName" className="text-gray-700 font-medium mb-2 flex items-center gap-2">
                      Last Name
                      <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Doe"
                      className={`h-12 ${errors.lastName ? 'border-red-400' : ''}`}
                    />
                    {errors.lastName && <p className="text-xs text-red-600 mt-1"><AlertCircle className="w-3 h-3 inline mr-1" />{errors.lastName}</p>}
                  </div>
                </div>

                <div>
                  <Label htmlFor="dateOfBirth" className="text-gray-700 font-medium mb-2 flex items-center gap-2">
                    Date of Birth
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className={`h-12 ${errors.dateOfBirth ? 'border-red-400' : ''}`}
                  />
                  {errors.dateOfBirth && <p className="text-xs text-red-600 mt-1"><AlertCircle className="w-3 h-3 inline mr-1" />{errors.dateOfBirth}</p>}
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button onClick={handleBack} variant="outline" className="flex-1 h-12">
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Back
                </Button>
                <Button onClick={handleNext} className="flex-1 h-12 bg-blue-700 hover:bg-blue-800">
                  Continue
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Address Step */}
        {step === "address" && (
          <div className="space-y-4 animate-fade-in">
            <Card className="p-6 bg-white">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-blue-700" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Address Details</h2>
                  <p className="text-sm text-gray-600">Your residential address for verification</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="street" className="text-gray-700 font-medium mb-2 flex items-center gap-2">
                    Street Address
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="street"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    placeholder="123 Main Street, Apartment 4B"
                    className={`h-12 ${errors.street ? 'border-red-400' : ''}`}
                  />
                  {errors.street && <p className="text-xs text-red-600 mt-1"><AlertCircle className="w-3 h-3 inline mr-1" />{errors.street}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city" className="text-gray-700 font-medium mb-2 flex items-center gap-2">
                      City
                      <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Mumbai"
                      className={`h-12 ${errors.city ? 'border-red-400' : ''}`}
                    />
                    {errors.city && <p className="text-xs text-red-600 mt-1"><AlertCircle className="w-3 h-3 inline mr-1" />{errors.city}</p>}
                  </div>
                  <div>
                    <Label htmlFor="state" className="text-gray-700 font-medium mb-2 flex items-center gap-2">
                      State
                      <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="state"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="Maharashtra"
                      className={`h-12 ${errors.state ? 'border-red-400' : ''}`}
                    />
                    {errors.state && <p className="text-xs text-red-600 mt-1"><AlertCircle className="w-3 h-3 inline mr-1" />{errors.state}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="zipCode" className="text-gray-700 font-medium mb-2 flex items-center gap-2">
                      PIN Code
                      <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="zipCode"
                      value={zipCode}
                      onChange={(e) => setZipCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="400001"
                      className={`h-12 ${errors.zipCode ? 'border-red-400' : ''}`}
                      maxLength={6}
                    />
                    {errors.zipCode && <p className="text-xs text-red-600 mt-1"><AlertCircle className="w-3 h-3 inline mr-1" />{errors.zipCode}</p>}
                  </div>
                  <div>
                    <Label htmlFor="country" className="text-gray-700 font-medium mb-2">
                      Country
                    </Label>
                    <Input
                      id="country"
                      value={country}
                      disabled
                      className="h-12 bg-gray-100"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button onClick={handleBack} variant="outline" className="flex-1 h-12">
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Back
                </Button>
                <Button onClick={handleNext} className="flex-1 h-12 bg-blue-700 hover:bg-blue-800">
                  Continue
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Documents Step */}
        {step === "documents" && (
          <div className="space-y-4 animate-fade-in">
            <Card className="p-6 bg-white">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-700" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Upload Documents</h2>
                  <p className="text-sm text-gray-600">Clear photos of your PAN & Aadhaar card</p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-700 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <p className="font-medium mb-1">Tips for good photos:</p>
                    <ul className="space-y-1 text-blue-800">
                      <li>• Place document on a flat, contrasting surface</li>
                      <li>• Ensure all text is clearly readable</li>
                      <li>• Avoid glare and shadows</li>
                      <li>• Capture all four corners of the card</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {/* PAN Card */}
                <div>
                  <Label className="text-gray-700 font-medium mb-3 block flex items-center gap-2">
                    <FileText className="w-5 h-5 text-gray-600" />
                    PAN Card (Front Side) <span className="text-red-500">*</span>
                  </Label>
                  {!panCard ? (
                    <div className="space-y-3">
                      <button
                        onClick={() => {
                          setShowCamera(true);
                          setCaptureMode('doc');
                          setCurrentDocType('pan');
                        }}
                        className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-blue-500 hover:bg-blue-50 transition-colors"
                      >
                        <Camera className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-700 font-medium">Take Photo</p>
                        <p className="text-sm text-gray-500">Capture PAN card</p>
                      </button>
                      <div className="relative">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setPanCard(e.target.files?.[0] || null)}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          id="upload-pan"
                        />
                        <label
                          htmlFor="upload-pan"
                          className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-blue-500 hover:bg-blue-50 transition-colors cursor-pointer flex items-center justify-center gap-3"
                        >
                          <Upload className="w-6 h-6 text-gray-400" />
                          <div className="text-left">
                            <p className="text-gray-700 font-medium">Upload from Gallery</p>
                            <p className="text-sm text-gray-500">JPG, PNG (max 5MB)</p>
                          </div>
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div className="relative border-2 border-green-500 rounded-lg overflow-hidden bg-gray-50">
                      <img src={URL.createObjectURL(panCard)} alt="PAN Card" className="w-full" />
                      <div className="absolute top-2 right-2 flex gap-2">
                        <button
                          onClick={() => {
                            setPanCard(null);
                            setShowCamera(true);
                            setCaptureMode('doc');
                            setCurrentDocType('pan');
                          }}
                          className="bg-blue-600 text-white px-3 py-1.5 rounded-full hover:bg-blue-700 text-sm flex items-center gap-1"
                        >
                          <Camera className="w-4 h-4" />
                          Retake
                        </button>
                        <button
                          onClick={() => setPanCard(null)}
                          className="bg-red-600 text-white p-2 rounded-full hover:bg-red-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="absolute bottom-2 left-2 bg-green-600 text-white px-3 py-1 rounded-full text-sm flex items-center gap-1">
                        <Check className="w-4 h-4" />
                        PAN Card Uploaded
                      </div>
                    </div>
                  )}
                </div>

                {/* Aadhaar Front */}
                <div>
                  <Label className="text-gray-700 font-medium mb-3 block flex items-center gap-2">
                    <FileText className="w-5 h-5 text-gray-600" />
                    Aadhaar Card (Front Side) <span className="text-red-500">*</span>
                  </Label>
                  {!docFront ? (
                    <div className="space-y-3">
                      <button
                        onClick={() => {
                          setShowCamera(true);
                          setCaptureMode('doc');
                          setCurrentDocType('aadhaar-front');
                        }}
                        className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-blue-500 hover:bg-blue-50 transition-colors"
                      >
                        <Camera className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-700 font-medium">Take Photo</p>
                        <p className="text-sm text-gray-500">Capture front side with photo</p>
                      </button>
                      <div className="relative">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setDocFront(e.target.files?.[0] || null)}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          id="upload-aadhaar-front"
                        />
                        <label
                          htmlFor="upload-aadhaar-front"
                          className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-blue-500 hover:bg-blue-50 transition-colors cursor-pointer flex items-center justify-center gap-3"
                        >
                          <Upload className="w-6 h-6 text-gray-400" />
                          <div className="text-left">
                            <p className="text-gray-700 font-medium">Upload from Gallery</p>
                            <p className="text-sm text-gray-500">JPG, PNG (max 5MB)</p>
                          </div>
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div className="relative border-2 border-green-500 rounded-lg overflow-hidden bg-gray-50">
                      <img src={URL.createObjectURL(docFront)} alt="Aadhaar Front" className="w-full" />
                      <div className="absolute top-2 right-2 flex gap-2">
                        <button
                          onClick={() => {
                            setDocFront(null);
                            setShowCamera(true);
                            setCaptureMode('doc');
                            setCurrentDocType('aadhaar-front');
                          }}
                          className="bg-blue-600 text-white px-3 py-1.5 rounded-full hover:bg-blue-700 text-sm flex items-center gap-1"
                        >
                          <Camera className="w-4 h-4" />
                          Retake
                        </button>
                        <button
                          onClick={() => setDocFront(null)}
                          className="bg-red-600 text-white p-2 rounded-full hover:bg-red-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="absolute bottom-2 left-2 bg-green-600 text-white px-3 py-1 rounded-full text-sm flex items-center gap-1">
                        <Check className="w-4 h-4" />
                        Aadhaar Front Uploaded
                      </div>
                    </div>
                  )}
                </div>

                {/* Aadhaar Back */}
                <div>
                  <Label className="text-gray-700 font-medium mb-3 block flex items-center gap-2">
                    <FileText className="w-5 h-5 text-gray-600" />
                    Aadhaar Card (Back Side) <span className="text-red-500">*</span>
                  </Label>
                  {!docBack ? (
                    <div className="space-y-3">
                      <button
                        onClick={() => {
                          setShowCamera(true);
                          setCaptureMode('doc');
                          setCurrentDocType('aadhaar-back');
                        }}
                        className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-blue-500 hover:bg-blue-50 transition-colors"
                      >
                        <Camera className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-700 font-medium">Take Photo</p>
                        <p className="text-sm text-gray-500">Capture back side with address</p>
                      </button>
                      <div className="relative">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setDocBack(e.target.files?.[0] || null)}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          id="upload-aadhaar-back"
                        />
                        <label
                          htmlFor="upload-aadhaar-back"
                          className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-blue-500 hover:bg-blue-50 transition-colors cursor-pointer flex items-center justify-center gap-3"
                        >
                          <Upload className="w-6 h-6 text-gray-400" />
                          <div className="text-left">
                            <p className="text-gray-700 font-medium">Upload from Gallery</p>
                            <p className="text-sm text-gray-500">JPG, PNG (max 5MB)</p>
                          </div>
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div className="relative border-2 border-green-500 rounded-lg overflow-hidden bg-gray-50">
                      <img src={URL.createObjectURL(docBack)} alt="Aadhaar Back" className="w-full" />
                      <div className="absolute top-2 right-2 flex gap-2">
                        <button
                          onClick={() => {
                            setDocBack(null);
                            setShowCamera(true);
                            setCaptureMode('doc');
                            setCurrentDocType('aadhaar-back');
                          }}
                          className="bg-blue-600 text-white px-3 py-1.5 rounded-full hover:bg-blue-700 text-sm flex items-center gap-1"
                        >
                          <Camera className="w-4 h-4" />
                          Retake
                        </button>
                        <button
                          onClick={() => setDocBack(null)}
                          className="bg-red-600 text-white p-2 rounded-full hover:bg-red-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="absolute bottom-2 left-2 bg-green-600 text-white px-3 py-1 rounded-full text-sm flex items-center gap-1">
                        <Check className="w-4 h-4" />
                        Aadhaar Back Uploaded
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {message && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2 mt-6">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <p className="text-sm text-red-900">{message}</p>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <Button onClick={handleBack} variant="outline" className="flex-1 h-12">
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Back
                </Button>
                <Button onClick={handleNext} className="flex-1 h-12 bg-blue-700 hover:bg-blue-800">
                  Continue
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Selfie Step */}
        {step === "selfie" && (
          <div className="space-y-4 animate-fade-in">
            <Card className="p-6 bg-white">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Camera className="w-6 h-6 text-blue-700" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Selfie Verification</h2>
                  <p className="text-sm text-gray-600">Take a photo holding your PAN card</p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-700 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <p className="font-medium mb-1">For a successful selfie:</p>
                    <ul className="space-y-1 text-blue-800">
                      <li>• Hold your PAN card next to your face</li>
                      <li>• Make sure both your face and card are clearly visible</li>
                      <li>• Good lighting, no hats or sunglasses</li>
                      <li>• Look directly at the camera</li>
                    </ul>
                  </div>
                </div>
              </div>

              {!selfieBlob ? (
                <button
                  onClick={() => {
                    setShowCamera(true);
                    setCaptureMode('selfie');
                  }}
                  className="w-full border-2 border-dashed border-gray-300 rounded-lg p-12 hover:border-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <Camera className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-700 font-medium text-lg mb-1">Take Selfie with PAN Card</p>
                  <p className="text-sm text-gray-500">Click to open camera</p>
                </button>
              ) : (
                <div className="relative border-2 border-green-500 rounded-lg overflow-hidden">
                  <img src={URL.createObjectURL(selfieBlob)} alt="Selfie" className="w-full" />
                  <button
                    onClick={() => setSelfieBlob(null)}
                    className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full hover:bg-red-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="absolute bottom-2 left-2 bg-green-600 text-white px-3 py-1 rounded-full text-sm flex items-center gap-1">
                    <Check className="w-4 h-4" />
                    Captured
                  </div>
                </div>
              )}

              {message && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2 mt-4">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <p className="text-sm text-red-900">{message}</p>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <Button onClick={handleBack} variant="outline" className="flex-1 h-12">
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Back
                </Button>
                <Button onClick={handleNext} className="flex-1 h-12 bg-blue-700 hover:bg-blue-800">
                  Continue
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Review Step */}
        {step === "review" && (
          <div className="space-y-4 animate-fade-in">
            <Card className="p-6 bg-white">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-blue-700" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Review & Submit</h2>
                  <p className="text-sm text-gray-600">Please verify all information is correct</p>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-700 mt-0.5" />
                  <div className="text-sm text-yellow-900">
                    <p className="font-medium">Important:</p>
                    <p>After submission, you cannot edit your information. Please review carefully.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {/* Personal Info Summary */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Personal Information
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">PAN Number:</span>
                      <span className="font-mono text-gray-900">{panNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Aadhaar Number:</span>
                      <span className="font-mono text-gray-900">{aadhaarNumber.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Full Name:</span>
                      <span className="text-gray-900">{firstName} {lastName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date of Birth:</span>
                      <span className="text-gray-900">{dateOfBirth}</span>
                    </div>
                  </div>
                </div>

                {/* Address Summary */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Address
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-900">
                    <p>{street}</p>
                    <p>{city}, {state} {zipCode}</p>
                    <p>{country}</p>
                  </div>
                </div>

                {/* Documents Preview */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Uploaded Documents
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    {panCard && (
                      <div className="relative">
                        <img src={URL.createObjectURL(panCard)} alt="PAN Card" className="w-full rounded-lg border" />
                        <Badge className="absolute bottom-1 left-1 bg-green-600 text-white text-xs">PAN</Badge>
                      </div>
                    )}
                    {docFront && (
                      <div className="relative">
                        <img src={URL.createObjectURL(docFront)} alt="Aadhaar front" className="w-full rounded-lg border" />
                        <Badge className="absolute bottom-1 left-1 bg-green-600 text-white text-xs">Aadhaar Front</Badge>
                      </div>
                    )}
                    {docBack && (
                      <div className="relative">
                        <img src={URL.createObjectURL(docBack)} alt="Aadhaar back" className="w-full rounded-lg border" />
                        <Badge className="absolute bottom-1 left-1 bg-green-600 text-white text-xs">Aadhaar Back</Badge>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {message && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2 mt-4">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <p className="text-sm text-red-900">{message}</p>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <Button onClick={handleBack} variant="outline" className="flex-1 h-12">
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Back
                </Button>
                <Button 
                  onClick={handleSubmit} 
                  disabled={submitting}
                  className="flex-1 h-12 bg-green-600 hover:bg-green-700 text-white"
                >
                  {submitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Submit for Verification
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Submit/Status Step */}
        {step === "submit" && (
          <div className="space-y-4 animate-fade-in">
            <Card className="p-8 bg-white text-center">
              {status?.verified || status?.status === "verified" ? (
                <>
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-12 h-12 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Verification Complete!</h2>
                  <p className="text-gray-600 mb-6">Your identity has been successfully verified.</p>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                    <p className="text-sm text-green-900">✓ You now have full access to all platform features</p>
                    <p className="text-sm text-green-900">✓ Higher trading and withdrawal limits</p>
                    <p className="text-sm text-green-900">✓ All payment methods available</p>
                  </div>
                  <Button onClick={onBack} className="w-full h-12 bg-blue-700 hover:bg-blue-800">
                    Back to Settings
                  </Button>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Clock className="w-12 h-12 text-blue-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Verification in Progress</h2>
                  <p className="text-gray-600 mb-6">Thank you for submitting your documents. Our team is reviewing your information.</p>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6 text-left">
                    <h3 className="font-semibold text-gray-900 mb-3">What happens next?</h3>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-blue-600 mt-0.5" />
                        <span>Our team will review your documents within 1-3 business days</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-blue-600 mt-0.5" />
                        <span>You'll receive an email notification once verification is complete</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-blue-600 mt-0.5" />
                        <span>You can continue using your account with current limits</span>
                      </li>
                    </ul>
                  </div>
                  <Button onClick={onBack} variant="outline" className="w-full h-12">
                    Back to Settings
                  </Button>
                </>
              )}
            </Card>
          </div>
        )}

        {/* Selfie Step - will continue in next message due to length */}
      </div>

      {/* Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-lg w-full overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">
                {captureMode === 'selfie' ? 'Take Selfie' : 'Capture Document'}
              </h3>
              <button onClick={() => {
                setShowCamera(false);
                setCaptureMode(null);
              }} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative bg-black">
              <video ref={videoRef} className="w-full" muted playsInline />
            </div>
            <div className="p-4 flex gap-3">
              <Button onClick={() => {
                setShowCamera(false);
                setCaptureMode(null);
              }} variant="outline" className="flex-1">
                Cancel
              </Button>
              <Button onClick={() => {
                if (captureMode === 'selfie') {
                  handleCapture('selfie');
                } else if (currentDocType) {
                  handleCapture(currentDocType);
                }
              }} className="flex-1 bg-blue-700">
                <Camera className="w-5 h-5 mr-2" />
                Capture
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
