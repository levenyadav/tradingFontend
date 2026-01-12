import { useEffect, useState } from "react";
import { jsonFetch } from "../../lib/api/client";
import { authHeaders } from "../../lib/api/utils";
import { Button } from "../ui/button";

type BankInfo = {
  bankName?: string;
  accountNumber?: string;
  routingNumber?: string;
  swiftCode?: string;
  accountHolderName?: string;
};

export default function PaymentMethods({ onBack }: { onBack: () => void }) {
  const [methods, setMethods] = useState<any[]>([]);
  const [bankInfo, setBankInfo] = useState<BankInfo>({});
  const [usdtAddress, setUsdtAddress] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    (async () => {
      const res = await jsonFetch<{ data: any }>("/api/v1/payments/methods?includeDetails=true", { method: "GET", headers: authHeaders() });
      setMethods(res.data);
      try {
        const crypto = await jsonFetch<{ data: any }>("/api/v1/payments/crypto-details?asset=USDT&network=TRC20", { method: "GET", headers: authHeaders() });
        setUsdtAddress(crypto.data.address || "");
      } catch {}
    })();
  }, []);

  const saveLocal = () => {
    localStorage.setItem("withdraw_bank_info", JSON.stringify(bankInfo));
    localStorage.setItem("withdraw_usdt_address", usdtAddress);
    setMessage("Saved locally for faster withdrawals");
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-gray-900">Payment Methods</h3>
        <button onClick={onBack} className="text-gray-700 hover:text-gray-900">Back</button>
      </div>
      <div className="space-y-2">
        <h4 className="text-gray-900">Available Methods</h4>
        <div className="space-y-2">
          {methods.map((m) => (
            <div key={m.id} className="border border-gray-200 rounded p-3 text-sm">
              <div className="font-medium">{m.name}</div>
              <div className="text-gray-600">{m.description}</div>
              {m.bankDetails && (
                <div className="text-gray-600">Bank: {m.bankDetails.bankName} • Account: {m.bankDetails.accountNumber}</div>
              )}
              {m.cryptoDetails?.usdt?.trc20Address && (
                <div className="text-gray-600">USDT TRC20: {m.cryptoDetails.usdt.trc20Address}</div>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <h4 className="text-gray-900">Withdraw Preferences</h4>
        <div className="grid grid-cols-2 gap-3">
          <input className="w-full bg-white border border-gray-200 rounded-lg p-3 text-gray-700 placeholder:text-gray-400" placeholder="Bank Name" value={bankInfo.bankName || ""} onChange={e=>setBankInfo({ ...bankInfo, bankName: e.target.value })} />
          <input className="w-full bg-white border border-gray-200 rounded-lg p-3 text-gray-700 placeholder:text-gray-400" placeholder="Account Number" value={bankInfo.accountNumber || ""} onChange={e=>setBankInfo({ ...bankInfo, accountNumber: e.target.value })} />
          <input className="w-full bg-white border border-gray-200 rounded-lg p-3 text-gray-700 placeholder:text-gray-400" placeholder="Routing Number" value={bankInfo.routingNumber || ""} onChange={e=>setBankInfo({ ...bankInfo, routingNumber: e.target.value })} />
          <input className="w-full bg-white border border-gray-200 rounded-lg p-3 text-gray-700 placeholder:text-gray-400" placeholder="SWIFT Code" value={bankInfo.swiftCode || ""} onChange={e=>setBankInfo({ ...bankInfo, swiftCode: e.target.value })} />
          <input className="w-full bg-white border border-gray-200 rounded-lg p-3 text-gray-700 placeholder:text-gray-400" placeholder="Account Holder Name" value={bankInfo.accountHolderName || ""} onChange={e=>setBankInfo({ ...bankInfo, accountHolderName: e.target.value })} />
        </div>
        <input className="w-full bg-white border border-gray-200 rounded-lg p-3 text-gray-700 placeholder:text-gray-400" placeholder="USDT TRC20 Address" value={usdtAddress} onChange={e=>setUsdtAddress(e.target.value)} />
      </div>
      {message && <div className="text-sm text-gray-600">{message}</div>}
      <Button onClick={saveLocal} className="bg-blue-700 text-white">Save Preferences</Button>
    </div>
  );
}
