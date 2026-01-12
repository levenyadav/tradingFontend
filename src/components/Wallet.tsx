import { useEffect, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, ArrowLeftRight, Gift, CreditCard, Building2, Wallet as WalletIcon, Percent, Check, ChevronLeft, Copy, Info, AlertCircle } from 'lucide-react';
import { mockAccount, formatCurrency, formatDateTime } from '../lib/mockData';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { getTransactions, WalletTxn } from '../lib/api/transactions';
import { getWalletBalance, transferToAccount, transferFromAccount } from '../lib/api/wallet';
import { getMethods, getBankDetails, getCryptoDetails, deposit as apiDeposit, withdraw as apiWithdraw, submitVerification, calculateFees } from '../lib/api/payments';
import { Toast } from './Toast';
import { getAccounts, Account } from '../lib/api/accounts';
import { Skeleton } from './ui/skeleton';
import { Spinner } from './ui/spinner';
import { EmptyState } from './EmptyState';

interface WalletProps {
  onNavigate: (screen: string) => void;
}

export function Wallet({ onNavigate }: WalletProps) {
  const [activeView, setActiveView] = useState<'overview' | 'deposit' | 'withdraw' | 'transfer'>('overview');
  const [depositMethod, setDepositMethod] = useState<string>('bank_transfer');
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [transactions, setTransactions] = useState<WalletTxn[]>([]);
  const [wallet, setWallet] = useState<{ balance: number; availableToTransfer: number; pendingTransactions: number }>({ balance: 0, availableToTransfer: 0, pendingTransactions: 0 });
  const [methods, setMethods] = useState<any[]>([]);
  const [bankInfo, setBankInfo] = useState<any>(null);
  const [usdtInfo, setUsdtInfo] = useState<any>(null);
  const [lastDepositTxnId, setLastDepositTxnId] = useState<string>('');
  const [utrNumber, setUtrNumber] = useState('');
  const [feePreview, setFeePreview] = useState<{ fee: number; total: number; netAmount: number; currency: string } | null>(null);
  const [depositStep, setDepositStep] = useState<number>(1);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [withdrawStep, setWithdrawStep] = useState<number>(1);
  const [withdrawMethod, setWithdrawMethod] = useState<string>('bank_transfer');
  const [bankWithdraw, setBankWithdraw] = useState({ bankName: '', accountNumber: '', routingNumber: '', swiftCode: '', accountHolderName: '' });
  const [cryptoWithdraw, setCryptoWithdraw] = useState({ walletAddress: '' });
  const [transferStep, setTransferStep] = useState<number>(1);
  const [transferDirection, setTransferDirection] = useState<'wallet_to_account' | 'account_to_wallet'>('wallet_to_account');
  const [transferAmount, setTransferAmount] = useState<string>('');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [transferReason, setTransferReason] = useState<string>('');
  const [transferError, setTransferError] = useState<string>('');
  const [loadingFees, setLoadingFees] = useState(false);
  const [creatingDeposit, setCreatingDeposit] = useState(false);
  const [submittingVerification, setSubmittingVerification] = useState(false);
  const [requestingWithdrawal, setRequestingWithdrawal] = useState(false);
  const [confirmingTransfer, setConfirmingTransfer] = useState(false);

  const account = mockAccount;
  const [overviewLoading, setOverviewLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [txns, wb, pm, accts] = await Promise.all([
          getTransactions({ page: 1, limit: 5, sortBy: 'createdAt', sortOrder: 'desc' }),
          getWalletBalance(),
          getMethods(true),
          getAccounts('active'),
        ]);
        setTransactions(txns);
        setWallet({ balance: wb.balance, availableToTransfer: wb.availableToTransfer, pendingTransactions: wb.pendingTransactions });
        setMethods(pm);
        // Preload details
        try { setBankInfo(await getBankDetails('INR')); } catch {}
        try { setUsdtInfo(await getCryptoDetails('USDT','TRC20')); } catch {}
        setAccounts(accts);
      } catch (e) {
        setTransactions([]);
      } finally {
        setOverviewLoading(false);
      }
    })();
  }, []);

  if (activeView === 'deposit') {
    return (
      <div className="pb-20 md:pb-8">
        <div className="p-4">
          <button
            onClick={() => setActiveView('overview')}
            className="text-blue-700 hover:text-blue-800 mb-4"
          >
            ← Back to Wallet
          </button>

          <h2 className="text-gray-900 mb-2">Deposit Funds</h2>
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-6">
            <span className={`${depositStep>=1?'text-blue-700':''}`}>Method</span>
            <span>›</span>
            <span className={`${depositStep>=2?'text-blue-700':''}`}>Amount</span>
            <span>›</span>
            <span className={`${depositStep>=3?'text-blue-700':''}`}>Instructions</span>
            <span>›</span>
            <span className={`${depositStep>=4?'text-blue-700':''}`}>Confirm</span>
            <span>›</span>
            <span className={`${depositStep>=5?'text-blue-700':''}`}>Done</span>
          </div>

          {/* Payment Methods (from backend) */}
          {depositStep===1 && (
          <div className="space-y-3 mb-6">
            {overviewLoading && (
              <div className="space-y-2" aria-busy="true" aria-live="polite">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="w-full p-4 rounded-lg border-2 border-transparent bg-white">
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-6 h-6 rounded" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-1/3 mb-2" />
                        <Skeleton className="h-3 w-1/4" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!overviewLoading && methods.length===0 && (
              <EmptyState title="No payment methods" message="No deposit methods are configured." />
            )}
            {!overviewLoading && methods.map((m) => (
              <button key={m.id} onClick={() => setDepositMethod(m.id)} className={`w-full flex items-center gap-3 p-4 rounded-lg border-2 transition-colors ${depositMethod===m.id?'border-blue-700 bg-blue-50':'border-gray-200 bg-white hover:border-gray-300'}`}>
                {m.id==='bank_transfer' ? <Building2 className="w-6 h-6 text-gray-700"/> : m.id==='crypto' ? <WalletIcon className="w-6 h-6 text-gray-700"/> : <CreditCard className="w-6 h-6 text-gray-700"/>}
                <div className="flex-1 text-left">
                  <p className="text-gray-900">{m.name}</p>
                  <p className="text-sm text-gray-500">{m.processingTime ?? ''} • Fee: {typeof m.fees?.deposit==='string'?m.fees.deposit:m.fees?.deposit ?? 0}</p>
                </div>
              </button>
            ))}
          </div>
          )}

          {/* Amount Input */}
          {depositStep===2 && (
          <div className="bg-white rounded-lg p-4 mb-4">
            <Label htmlFor="depositAmount" className="text-gray-700 mb-2 block">
              Deposit Amount
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <Input
                id="depositAmount"
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="0.00"
                className="pl-7 h-12 text-lg font-mono"
                min="10"
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">Minimum deposit: $10</p>
          </div>
          )}

          {/* Quick Amount Buttons */}
          {depositStep===2 && (
          <div className="grid grid-cols-4 gap-2 mb-6">
            {[100, 500, 1000, 5000].map((amount) => (
              <button
                key={amount}
                onClick={() => setDepositAmount(amount.toString())}
                className="py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-900 transition-colors"
              >
                ${amount}
              </button>
            ))}
          </div>
          )}

          {depositStep===2 && (
          <div className="flex items-center justify-between mb-4">
            <Button
              className="h-12 bg-gray-100 text-gray-900 hover:bg-gray-200"
              onClick={async () => {
                if (!depositAmount) return;
                try {
                  setLoadingFees(true);
                  const fp = await calculateFees({ amount: parseFloat(depositAmount), type: 'deposit', method: depositMethod==='crypto'?'crypto':'bank_transfer', currency: depositMethod==='bank_transfer'?'INR':'USD' });
                  setFeePreview(fp);
                } catch {}
                finally { setLoadingFees(false); }
              }}
            >
              {loadingFees ? (<span className="flex items-center gap-2"><Spinner size={14} /><span>Previewing...</span></span>) : 'Preview Fees'}
            </Button>
            {feePreview && (
              <div className="text-sm text-gray-700">Fee: {feePreview.fee} • Total: {feePreview.total}</div>
            )}
          </div>
          )}
          {depositStep===2 && (
          <Button
            className="w-full h-12 bg-green-600 hover:bg-green-700 text-white rounded-lg"
            disabled={!depositAmount || parseFloat(depositAmount) < 10}
            onClick={() => setDepositStep(3)}
          >
            Continue
          </Button>
          )}

          {depositStep===3 && (
            <div className="bg-white rounded-lg p-4 mb-6 border">
              {depositMethod==='bank_transfer' && overviewLoading && (
                <div className="space-y-2" aria-busy="true" aria-live="polite">
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              )}
              {depositMethod==='bank_transfer' && !overviewLoading && !bankInfo && (
                <EmptyState title="Bank details unavailable" message="Please try crypto deposit or contact support." />
              )}
              {depositMethod==='bank_transfer' && bankInfo && (
                <div className="space-y-2">
                  <p className="text-gray-900">Bank Details</p>
                  <p className="text-sm text-gray-600">{bankInfo.bankName} • {bankInfo.accountNumber}</p>
                  <div className="flex gap-2">
                    <Button className="bg-gray-100 text-gray-900 hover:bg-gray-200" onClick={()=>{navigator.clipboard.writeText(`${bankInfo.bankName} ${bankInfo.accountNumber}`); setToast({message:'Copied bank details', type:'info'});}}>Copy</Button>
                    <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={async()=>{
                      try{
                        setCreatingDeposit(true);
                        const amt = parseFloat(depositAmount);
                        const res = await apiDeposit({ amount: amt, currency:'INR', paymentMethod:'banktransfer', paymentDetails: { accountHolderName:'Your Name', bankName: bankInfo?.bankName || 'HDFC', accountNumber:'XXXX', routingNumber: bankInfo?.routingNumber || 'IFSC', swiftCode: bankInfo?.swiftCode || 'HDFCINBB' } });
                        if (res?.transaction?.transactionId){ setLastDepositTxnId(res.transaction.transactionId); setToast({message:'Deposit created', type:'success'}); setDepositStep(4);} else { setToast({message:'Deposit creation failed', type:'error'}); }
                      }catch(e){ setToast({message:'Deposit creation failed', type:'error'}); }
                      finally { setCreatingDeposit(false); }
                    }}>{creatingDeposit ? (<span className="flex items-center gap-2"><Spinner size={14} /><span>Processing...</span></span>) : 'I have paid'}</Button>
                  </div>
                </div>
              )}
              {depositMethod==='crypto' && overviewLoading && (
                <div className="space-y-2" aria-busy="true" aria-live="polite">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              )}
              {depositMethod==='crypto' && !overviewLoading && !usdtInfo && (
                <EmptyState title="Crypto address unavailable" message="Please choose bank transfer or try again later." />
              )}
              {depositMethod==='crypto' && usdtInfo && (
                <div className="space-y-2">
                  <p className="text-gray-900">USDT TRC20 Address</p>
                  <p className="text-sm font-mono text-gray-700 break-all">{usdtInfo.address}</p>
                  <div className="flex gap-2">
                    <Button className="bg-gray-100 text-gray-900 hover:bg-gray-200" onClick={()=>{navigator.clipboard.writeText(usdtInfo.address); setToast({message:'Address copied', type:'info'});}}>Copy</Button>
                    <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={async()=>{
                      try{
                        setCreatingDeposit(true);
                        const amt = parseFloat(depositAmount);
                        const res = await apiDeposit({ amount: amt, paymentMethod: 'usdt_trc20', paymentDetails: { asset:'USDT', chain:'TRC20' } });
                        if (res?.transaction?.transactionId){ setLastDepositTxnId(res.transaction.transactionId); setToast({message:'Deposit created', type:'success'}); setDepositStep(4);} else { setToast({message:'Deposit creation failed', type:'error'}); }
                      }catch(e){ setToast({message:'Deposit creation failed', type:'error'}); }
                      finally { setCreatingDeposit(false); }
                    }}>{creatingDeposit ? (<span className="flex items-center gap-2"><Spinner size={14} /><span>Processing...</span></span>) : 'I have transferred'}</Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {depositStep===4 && (
            <div className="bg-white rounded-lg p-4 mb-6 border">
              <div className="space-y-3">
                <Label className="text-gray-700">{depositMethod==='crypto'?'TRX ID':'UTR Number'}</Label>
                <Input type="text" value={utrNumber} onChange={(e)=>setUtrNumber(e.target.value)} placeholder={depositMethod==='crypto'?'Enter TRX transaction ID':'Enter UTR number'} />
                <div className="flex gap-2">
                  <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={async()=>{
                    if (!lastDepositTxnId){ setToast({message:'No transaction to verify', type:'error'}); return; }
                    try{ setSubmittingVerification(true); const r = await submitVerification(lastDepositTxnId, { utrNumber, notes: 'Paid' }); setToast({message:'Verification submitted', type:'success'}); setDepositStep(5);}catch(e){ setToast({message:'Verification failed', type:'error'}); } finally { setSubmittingVerification(false); }
                  }}>{submittingVerification ? (<span className="flex items-center gap-2"><Spinner size={14} /><span>Submitting...</span></span>) : 'Submit Verification'}</Button>
                </div>
              </div>
            </div>
          )}

          {depositStep===5 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-900">Deposit flow completed</p>
              <p className="text-sm text-green-800">Transaction: {lastDepositTxnId || 'N/A'}</p>
              <div className="mt-3 flex gap-2">
                <Button className="bg-white text-gray-900 border" onClick={()=>setActiveView('overview')}>Back to Wallet</Button>
                <Button className="bg-gray-100 text-gray-900" onClick={()=>{ setDepositStep(1); setDepositAmount(''); setFeePreview(null); setUtrNumber(''); setLastDepositTxnId(''); }}>New Deposit</Button>
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-between">
            {depositStep>1 && depositStep<5 && (
              <Button className="bg-white text-gray-900 border" onClick={()=>setDepositStep(depositStep-1)}>Back</Button>
            )}
            {depositStep===1 && (
              <Button className="bg-blue-700 hover:bg-blue-800 text-white" onClick={()=>setDepositStep(2)}>Next</Button>
            )}
          </div>

          {toast && <Toast message={toast.message} type={toast.type} onClose={()=>setToast(null)} />}

          
        </div>
      </div>
    );
  }

  if (activeView === 'withdraw') {
    return (
      <div className="pb-20 md:pb-8">
        <div className="p-4">
          <button
            onClick={() => setActiveView('overview')}
            className="text-blue-700 hover:text-blue-800 mb-4"
          >
            ← Back to Wallet
          </button>

          <h2 className="text-gray-900 mb-2">Withdraw Funds</h2>
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
            <span className={`${withdrawStep>=1?'text-blue-700':''}`}>Amount</span>
            <span>›</span>
            <span className={`${withdrawStep>=2?'text-blue-700':''}`}>Method</span>
            <span>›</span>
            <span className={`${withdrawStep>=3?'text-blue-700':''}`}>Destination</span>
            <span>›</span>
            <span className={`${withdrawStep>=4?'text-blue-700':''}`}>Confirm</span>
            <span>›</span>
            <span className={`${withdrawStep>=5?'text-blue-700':''}`}>Done</span>
          </div>
          <p className="text-gray-600 mb-6">Available balance: {formatCurrency(wallet.availableToTransfer)}</p>

          {/* Amount Input */}
          {withdrawStep===1 && (
          <div className="bg-white rounded-lg p-4 mb-4">
            <Label htmlFor="withdrawAmount" className="text-gray-700 mb-2 block">
              Withdrawal Amount
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <Input
                id="withdrawAmount"
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="0.00"
                className="pl-7 h-12 text-lg font-mono"
                min="10"
                max={wallet.availableToTransfer}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Minimum withdrawal: $10 • Processing time: 1-2 business days
            </p>
          </div>
          )}

          {/* Withdrawal Method */}
          {withdrawStep===2 && (
          <div className="bg-white rounded-lg p-4 mb-6">
            <Label className="text-gray-700 mb-3 block">Withdraw method</Label>
            <div className="space-y-2">
              <button onClick={()=>setWithdrawMethod('bank_transfer')} className={`w-full flex items-center justify-between p-3 border rounded-lg ${withdrawMethod==='bank_transfer'?'border-blue-700':'border-gray-200 hover:border-blue-700'}`}>
                <div className="flex items-center gap-3">
                  <Building2 className="w-5 h-5 text-gray-700" />
                  <div className="text-left">
                    <p className="text-gray-900">Bank Transfer (INR)</p>
                    <p className="text-xs text-gray-500">Fee: ₹25 eq</p>
                  </div>
                </div>
              </button>
              <button onClick={()=>setWithdrawMethod('crypto')} className={`w-full flex items-center justify-between p-3 border rounded-lg ${withdrawMethod==='crypto'?'border-blue-700':'border-gray-200 hover:border-blue-700'}`}>
                <div className="flex items-center gap-3">
                  <WalletIcon className="w-5 h-5 text-gray-700" />
                  <div className="text-left">
                    <p className="text-gray-900">USDT (TRC20)</p>
                    <p className="text-xs text-gray-500">Network fee applies</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
          )}

          {withdrawStep<=3 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-orange-900">
              <strong>Important:</strong> Withdrawals are processed within 1-2 business days. 
              You'll receive an email confirmation once processed.
            </p>
          </div>
          )}

          {withdrawStep===1 && (
          <div className="flex items-center justify-between mb-4">
            <Button className="h-12 bg-gray-100 text-gray-900 hover:bg-gray-200" onClick={async()=>{ if(!withdrawAmount) return; try{ setLoadingFees(true); const fp = await calculateFees({ amount: parseFloat(withdrawAmount), type:'withdrawal', method: withdrawMethod==='crypto'?'crypto':'bank_transfer', currency: withdrawMethod==='bank_transfer'?'INR':'USD' }); setFeePreview(fp);}catch{} finally { setLoadingFees(false); }}}>
              {loadingFees ? (<span className="flex items-center gap-2"><Spinner size={14} /><span>Previewing...</span></span>) : 'Preview Fees'}
            </Button>
            {feePreview && (<div className="text-sm text-gray-700">Fee: {feePreview.fee} • Net: {feePreview.netAmount}</div>)}
          </div>
          )}

          {withdrawStep===3 && (
            <div className="bg-white rounded-lg p-4 mb-6 border">
              {withdrawMethod==='bank_transfer' && (
                <div className="space-y-2">
                  <Label className="text-gray-700">Bank Details</Label>
                  <Input placeholder="Bank Name" value={bankWithdraw.bankName} onChange={e=>setBankWithdraw({...bankWithdraw, bankName:e.target.value})} />
                  <Input placeholder="Account Number" value={bankWithdraw.accountNumber} onChange={e=>setBankWithdraw({...bankWithdraw, accountNumber:e.target.value})} />
                  <Input placeholder="IFSC / Routing" value={bankWithdraw.routingNumber} onChange={e=>setBankWithdraw({...bankWithdraw, routingNumber:e.target.value})} />
                  <Input placeholder="SWIFT Code" value={bankWithdraw.swiftCode} onChange={e=>setBankWithdraw({...bankWithdraw, swiftCode:e.target.value})} />
                  <Input placeholder="Account Holder Name" value={bankWithdraw.accountHolderName} onChange={e=>setBankWithdraw({...bankWithdraw, accountHolderName:e.target.value})} />
                </div>
              )}
              {withdrawMethod==='crypto' && (
                <div className="space-y-2">
                  <Label className="text-gray-700">USDT TRC20 Address</Label>
                  <Input placeholder="T..." value={cryptoWithdraw.walletAddress} onChange={e=>setCryptoWithdraw({...cryptoWithdraw, walletAddress:e.target.value})} />
                </div>
              )}
            </div>
          )}

          {withdrawStep===4 && (
            <Button
              className="w-full h-12 bg-blue-700 hover:bg-blue-800 text-white rounded-lg"
              disabled={!withdrawAmount || parseFloat(withdrawAmount) < 10 || parseFloat(withdrawAmount) > wallet.availableToTransfer}
              onClick={async()=>{
                const amt = parseFloat(withdrawAmount);
                try{
                  setRequestingWithdrawal(true);
                  let res;
                  if (withdrawMethod==='crypto'){
                    res = await apiWithdraw({ amount: amt, paymentMethod: 'crypto', paymentDetails: { walletAddress: cryptoWithdraw.walletAddress, asset:'USDT', chain:'TRC20' } });
                  } else {
                    res = await apiWithdraw({ amount: amt, currency: 'INR', paymentMethod: 'bank_transfer', paymentDetails: { bankName: bankWithdraw.bankName, accountNumber: bankWithdraw.accountNumber, routingNumber: bankWithdraw.routingNumber, swiftCode: bankWithdraw.swiftCode, accountHolderName: bankWithdraw.accountHolderName } });
                  }
                  setToast({message:'Withdrawal requested', type:'success'});
                  setWithdrawStep(5);
                }catch{ setToast({message:'Withdrawal failed', type:'error'}); }
                finally { setRequestingWithdrawal(false); }
              }}
            >
              {requestingWithdrawal ? (<span className="flex items-center gap-2"><Spinner size={14} /><span>Requesting...</span></span>) : 'Request Withdrawal'}
            </Button>
          )}

          <div className="mt-6 flex justify-between">
            {withdrawStep>1 && withdrawStep<5 && (
              <Button className="bg-white text-gray-900 border" onClick={()=>setWithdrawStep(withdrawStep-1)}>Back</Button>
            )}
            {withdrawStep===1 && (
              <Button className="bg-blue-700 hover:bg-blue-800 text-white" disabled={!withdrawAmount || parseFloat(withdrawAmount) < 10} onClick={()=>setWithdrawStep(2)}>Next</Button>
            )}
            {withdrawStep===2 && (
              <Button className="bg-blue-700 hover:bg-blue-800 text-white" onClick={()=>setWithdrawStep(3)}>Next</Button>
            )}
            {withdrawStep===3 && (
              <Button className="bg-blue-700 hover:bg-blue-800 text-white" onClick={()=>setWithdrawStep(4)}>Next</Button>
            )}
          </div>

          {toast && <Toast message={toast.message} type={toast.type} onClose={()=>setToast(null)} />}
        </div>
      </div>
    );
  }

  if (activeView === 'transfer') {
    return (
      <div className="pb-20 md:pb-8">
        <div className="p-4">
          <button onClick={() => setActiveView('overview')} className="text-blue-700 hover:text-blue-800 mb-4">← Back to Wallet</button>
          <h2 className="text-gray-900 mb-2">Transfer Funds</h2>
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-6">
            <span className={`${transferStep>=1?'text-blue-700':''}`}>Direction</span>
            <span>›</span>
            <span className={`${transferStep>=2?'text-blue-700':''}`}>Amount</span>
            <span>›</span>
            <span className={`${transferStep>=3?'text-blue-700':''}`}>Account</span>
            <span>›</span>
            <span className={`${transferStep>=4?'text-blue-700':''}`}>Confirm</span>
            <span>›</span>
            <span className={`${transferStep>=5?'text-blue-700':''}`}>Done</span>
          </div>

          {transferStep===1 && (
            <div className="space-y-3 mb-6">
              <button onClick={()=>setTransferDirection('wallet_to_account')} className={`w-full flex items-center gap-3 p-4 rounded-lg border-2 transition-colors ${transferDirection==='wallet_to_account'?'border-blue-700 bg-blue-50':'border-gray-200 bg-white hover:border-gray-300'}`}>
                <div className="flex-1 text-left">
                  <p className="text-gray-900">Wallet → Trading Account</p>
                  <p className="text-sm text-gray-500">Instant internal transfer</p>
                </div>
              </button>
              <button onClick={()=>setTransferDirection('account_to_wallet')} className={`w-full flex items-center gap-3 p-4 rounded-lg border-2 transition-colors ${transferDirection==='account_to_wallet'?'border-blue-700 bg-blue-50':'border-gray-200 bg-white hover:border-gray-300'}`}>
                <div className="flex-1 text-left">
                  <p className="text-gray-900">Trading Account → Wallet</p>
                  <p className="text-sm text-gray-500">Subject to free margin</p>
                </div>
              </button>
            </div>
          )}

          {transferStep===2 && (
            <div className="bg-white rounded-lg p-4 mb-4">
              <Label className="text-gray-700 mb-2 block">Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <Input type="number" value={transferAmount} onChange={(e)=>setTransferAmount(e.target.value)} placeholder="0.00" className="pl-7 h-12 text-lg font-mono" min="10" />
              </div>
              <p className="text-xs text-gray-500 mt-2">Minimum transfer: $10</p>
            </div>
          )}

          {transferStep===3 && (
            <div className="bg-white rounded-lg p-4 mb-6">
              <Label className="text-gray-700 mb-3 block">Select trading account</Label>
              <div className="space-y-2">
                {overviewLoading && (
                  <div className="space-y-2" aria-busy="true" aria-live="polite">
                    {Array.from({ length: 2 }).map((_, i) => (
                      <div key={i} className="p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-5 w-5" />
                          <div className="flex-1">
                            <Skeleton className="h-4 w-1/3 mb-2" />
                            <Skeleton className="h-3 w-1/4" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {!overviewLoading && accounts.length===0 && (
                  <EmptyState title="No accounts found" message="Create a trading account to transfer funds." />
                )}
                {!overviewLoading && accounts.map((a)=> (
                  <div
                    key={a._id}
                    role="button"
                    tabIndex={0}
                    onClick={()=>setSelectedAccountId(a._id)}
                    onKeyDown={(e)=>{ if (e.key==='Enter') setSelectedAccountId(a._id); }}
                    className={`w-full flex items-center justify-between p-3 border rounded-lg cursor-pointer ${selectedAccountId===a._id?'border-blue-700':'border-gray-200 hover:border-blue-700'}`}
                  >
                    <div className="text-left">
                      <p className="text-gray-900">{a.accountNumber} • {a.accountType.toUpperCase()}</p>
                      <p className="text-xs text-gray-500">Balance: {formatCurrency(a.balance)} • Leverage: {a.leverage} • {a.status}</p>
                    </div>
                    <span
                      className="text-xs text-blue-700 underline"
                      onClick={(e)=>{ e.stopPropagation(); navigator.clipboard.writeText(a.accountNumber); }}
                    >
                      Copy
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3">
                <Label className="text-gray-700 mb-2 block">Reason (optional)</Label>
                <Input placeholder="Reason" value={transferReason} onChange={(e)=>setTransferReason(e.target.value)} />
              </div>
            </div>
          )}

          {transferStep===4 && (
            <div className="bg-white rounded-lg p-4 mb-6 border">
              <p className="text-gray-900 mb-2">Confirm Transfer</p>
              <p className="text-sm text-gray-600">Direction: {transferDirection==='wallet_to_account'?'Wallet → Account':'Account → Wallet'}</p>
              <p className="text-sm text-gray-600">Amount: {transferAmount || '0.00'}</p>
              <p className="text-sm text-gray-600">Account: {accounts.find(a=>a._id===selectedAccountId)?.accountNumber || 'N/A'}</p>
              {transferError && (<div className="mt-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{transferError}</div>)}
              <div className="mt-3">
                <Button className="w-full bg-blue-700 hover:bg-blue-800 text-white" onClick={async()=>{
                  const amt = parseFloat(transferAmount || '0');
                  if (!selectedAccountId || !amt || amt < 10){ setTransferError('Please select account and enter a valid amount'); return; }
                  if (transferDirection==='wallet_to_account' && amt > wallet.availableToTransfer){ setTransferError('Insufficient wallet balance'); return; }
                  try{
                    setConfirmingTransfer(true);
                    if (transferDirection==='wallet_to_account'){
                      const payload: any = { accountId: selectedAccountId, amount: amt };
                      if (transferReason && transferReason.trim().length > 0) payload.reason = transferReason.trim();
                      await transferToAccount(payload);
                    } else {
                      const payload: any = { accountId: selectedAccountId, amount: amt };
                      if (transferReason && transferReason.trim().length > 0) payload.reason = transferReason.trim();
                      await transferFromAccount(payload);
                    }
                    setTransferError('');
                    setTransferStep(5);
                    const wb = await getWalletBalance();
                    setWallet({ balance: wb.balance, availableToTransfer: wb.availableToTransfer, pendingTransactions: wb.pendingTransactions });
                  }catch(e: any){
                    const msg = (e?.error?.message) || (e?.message) || 'Transfer failed';
                    setTransferError(msg);
                  } finally { setConfirmingTransfer(false); }
                }}>{confirmingTransfer ? (<span className="flex items-center gap-2"><Spinner size={14} /><span>Confirming...</span></span>) : 'Confirm Transfer'}</Button>
              </div>
            </div>
          )}

          {transferStep===5 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-900">Transfer completed</p>
              <div className="mt-3 flex gap-2">
                <Button className="bg-white text-gray-900 border" onClick={()=>setActiveView('overview')}>Back to Wallet</Button>
                <Button className="bg-gray-100 text-gray-900" onClick={()=>{ setTransferStep(1); setTransferAmount(''); setSelectedAccountId(''); setTransferReason(''); }}>New Transfer</Button>
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-between">
            {transferStep>1 && transferStep<5 && (
              <Button className="bg-white text-gray-900 border" onClick={()=>setTransferStep(transferStep-1)}>Back</Button>
            )}
            {transferStep===1 && (
              <Button className="bg-blue-700 hover:bg-blue-800 text-white" onClick={()=>setTransferStep(2)}>Next</Button>
            )}
            {transferStep===2 && (
              <Button className="bg-blue-700 hover:bg-blue-800 text-white" disabled={!transferAmount || parseFloat(transferAmount)<10} onClick={()=>setTransferStep(3)}>Next</Button>
            )}
            {transferStep===3 && (
              <Button className="bg-blue-700 hover:bg-blue-800 text-white" disabled={!selectedAccountId} onClick={()=>setTransferStep(4)}>Next</Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20 md:pb-8">
      {/* Balance Card */}
      <div className="p-4">
        <div className="bg-gradient-to-br from-blue-700 to-blue-900 rounded-xl p-6 text-white mb-4">
          <p className="text-blue-100 mb-2">Current Balance</p>
          {overviewLoading ? (
            <div>
              <Skeleton className="h-8 w-1/3 mb-4" />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Skeleton className="h-4 w-2/3 mb-1" />
                  <Skeleton className="h-5 w-1/2" />
                </div>
                <div>
                  <Skeleton className="h-4 w-2/3 mb-1" />
                  <Skeleton className="h-5 w-1/2" />
                </div>
              </div>
            </div>
          ) : (
            <>
              <h1 className="text-white mb-4">{formatCurrency(wallet.balance)}</h1>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-blue-200 mb-1">Available to Transfer</p>
                  <p className="text-white">{formatCurrency(wallet.availableToTransfer)}</p>
                </div>
                <div>
                  <p className="text-blue-200 mb-1">Pending Transactions</p>
                  <p className="text-white">{wallet.pendingTransactions}</p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <button
            onClick={() => setActiveView('deposit')}
            className="flex flex-col items-center justify-center bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-2">
              <ArrowDownRight className="w-6 h-6 text-green-700" />
            </div>
            <span className="text-gray-900">Deposit</span>
          </button>

          <button
            onClick={() => setActiveView('withdraw')}
            className="flex flex-col items-center justify-center bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-2">
              <ArrowUpRight className="w-6 h-6 text-blue-700" />
            </div>
            <span className="text-gray-900">Withdraw</span>
          </button>

          <button
            onClick={() => setActiveView('transfer')}
            className="flex flex-col items-center justify-center bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-2">
              <ArrowLeftRight className="w-6 h-6 text-purple-700" />
            </div>
            <span className="text-gray-900">Transfer</span>
          </button>
        </div>

        {/* Transaction History */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-gray-900">Transaction History</h3>
            <button onClick={() => onNavigate('transactions')} className="text-sm text-blue-700 hover:text-blue-800">
              View All
            </button>
          </div>

          <div className="space-y-2">
            {overviewLoading && (
              <div className="space-y-2" aria-busy="true" aria-live="polite">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-10 h-10 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-1/3 mb-2" />
                        <Skeleton className="h-3 w-1/4" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!overviewLoading && transactions.length === 0 && (
              <EmptyState title="No recent transactions" message="Your latest transactions will appear here" actionLabel="View All" onAction={() => onNavigate('transactions')} />
            )}
            {!overviewLoading && transactions.map((transaction) => (
              <div key={transaction.id} className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      transaction.type === 'deposit'
                        ? 'bg-green-100'
                        : transaction.type === 'withdrawal'
                        ? 'bg-blue-100'
                        : transaction.type === 'bonus'
                        ? 'bg-yellow-100'
                        : 'bg-purple-100'
                    }`}>
                      {transaction.type === 'deposit' && <ArrowDownRight className="w-5 h-5 text-green-700" />}
                      {transaction.type === 'withdrawal' && <ArrowUpRight className="w-5 h-5 text-blue-700" />}
                      {transaction.type === 'bonus' && <Gift className="w-5 h-5 text-yellow-700" />}
                      {transaction.type === 'fee' && <Percent className="w-5 h-5 text-purple-700" />}
                      {transaction.type === 'profit_loss' && <ArrowLeftRight className="w-5 h-5 text-purple-700" />}
                      {transaction.type === 'wallet_to_account' && <ArrowLeftRight className="w-5 h-5 text-purple-700" />}
                      {transaction.type === 'account_to_wallet' && <ArrowLeftRight className="w-5 h-5 text-purple-700" />}
                    </div>
                    <div>
                      <p className="text-gray-900">
                        {transaction.type === 'profit_loss'
                          ? `Trade ${transaction.symbol} • ${transaction.volume ?? 0} lots @ ${transaction.price ?? ''}`
                          : transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                      </p>
                      <p className="text-xs text-gray-500">{transaction.accountNumber ? `Account ${transaction.accountNumber}` : ''}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {(() => {
                      const isDebit = transaction.direction === 'debit' || transaction.type === 'fee' || transaction.netAmount < 0;
                      const sign = isDebit ? '-' : '+';
                      const amt = Math.abs(transaction.netAmount);
                      return (
                        <p className={isDebit ? 'text-red-600' : 'text-green-600'}>
                          {sign}{formatCurrency(amt, transaction.currency)}
                        </p>
                      );
                    })()}
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      transaction.status === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : transaction.status === 'pending'
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {transaction.status}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-500">{formatDateTime(transaction.createdAt)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
