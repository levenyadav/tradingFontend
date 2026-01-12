import { useEffect, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, ArrowLeftRight, Gift, CreditCard, Building2, Wallet as WalletIcon, Percent, Check, ChevronLeft, Copy, Info, AlertCircle, X } from 'lucide-react';
import { formatCurrency, formatDateTime } from '../lib/mockData';
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

// Modern Progress Indicator Component
const ProgressIndicator = ({ steps, currentStep }: { steps: string[], currentStep: number }) => (
  <div className="mb-6">
    <div className="flex items-center justify-between mb-2">
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isActive = stepNumber === currentStep;
        const isCompleted = stepNumber < currentStep;
        
        return (
          <div key={index} className="flex items-center flex-1">
            <div className="flex flex-col items-center relative">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                isCompleted ? 'bg-green-600 text-white' :
                isActive ? 'bg-blue-600 text-white' :
                'bg-gray-200 text-gray-500'
              }`}>
                {isCompleted ? <Check className="w-4 h-4" /> : stepNumber}
              </div>
              <span className={`text-xs mt-1 absolute top-9 whitespace-nowrap ${
                isActive ? 'text-blue-600 font-medium' : 'text-gray-500'
              }`}>
                {step}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 transition-colors ${
                stepNumber < currentStep ? 'bg-green-600' : 'bg-gray-200'
              }`} />
            )}
          </div>
        );
      })}
    </div>
  </div>
);

// Modern Header Component
const FlowHeader = ({ title, onBack, step, totalSteps }: { title: string, onBack: () => void, step?: number, totalSteps?: number }) => (
  <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg">
    <div className="flex items-center justify-between px-4 py-4">
      <button
        onClick={onBack}
        className="p-2 rounded-full hover:bg-white/10 active:bg-white/20 transition-colors"
        aria-label="Back"
      >
        <ChevronLeft className="w-6 h-6 text-white" />
      </button>
      <div className="flex-1 text-center">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {step && totalSteps && (
          <p className="text-xs text-blue-100 mt-0.5">Step {step} of {totalSteps}</p>
        )}
      </div>
      <div className="w-10" /> {/* Spacer */}
    </div>
  </div>
);

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

  // DEPOSIT FLOW
  if (activeView === 'deposit') {
    const depositSteps = ['Method', 'Amount', 'Pay', 'Verify', 'Done'];
    
    return (
      <div className="min-h-screen bg-gray-50 pb-20 md:pb-8">
        <FlowHeader
          title="Deposit Funds"
          onBack={() => {
            setActiveView('overview');
            setDepositStep(1);
            setDepositAmount('');
            setFeePreview(null);
          }}
          step={depositStep}
          totalSteps={5}
        />

        <div className="px-4 py-6">
          <ProgressIndicator steps={depositSteps} currentStep={depositStep} />

          {/* Step 1: Payment Method */}
          {depositStep === 1 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-blue-900">
                  Select your preferred payment method. Crypto deposits are instant, bank transfers may take 1-2 business days.
                </p>
              </div>

              <div className="space-y-3">
                {overviewLoading ? (
                  Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-xl p-4 shadow-sm">
                      <Skeleton className="h-16" />
                    </div>
                  ))
                ) : methods.length === 0 ? (
                  <EmptyState title="No payment methods" message="Please contact support to enable payment methods." />
                ) : (
                  methods.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setDepositMethod(m.id)}
                      className={`w-full bg-white rounded-xl p-4 shadow-sm border-2 transition-all ${
                        depositMethod === m.id
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-transparent hover:border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          depositMethod === m.id ? 'bg-blue-100' : 'bg-gray-100'
                        }`}>
                          {m.id === 'bank_transfer' ? (
                            <Building2 className={`w-6 h-6 ${depositMethod === m.id ? 'text-blue-600' : 'text-gray-600'}`} />
                          ) : m.id === 'crypto' ? (
                            <WalletIcon className={`w-6 h-6 ${depositMethod === m.id ? 'text-blue-600' : 'text-gray-600'}`} />
                          ) : (
                            <CreditCard className={`w-6 h-6 ${depositMethod === m.id ? 'text-blue-600' : 'text-gray-600'}`} />
                          )}
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-semibold text-gray-900">{m.name}</p>
                          <p className="text-sm text-gray-600">
                            {m.processingTime || 'Instant'} • Fee: {typeof m.fees?.deposit === 'string' ? m.fees.deposit : `${m.fees?.deposit || 0}%`}
                          </p>
                        </div>
                        {depositMethod === m.id && (
                          <Check className="w-6 h-6 text-blue-600" />
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>

              <Button
                onClick={() => setDepositStep(2)}
                disabled={!depositMethod}
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold"
              >
                Continue
              </Button>
            </div>
          )}

          {/* Step 2: Enter Amount */}
          {depositStep === 2 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <Label className="text-sm font-medium text-gray-700 mb-3 block">Enter Deposit Amount</Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-gray-400">$</span>
                  <Input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="0.00"
                    className="pl-10 h-16 text-2xl font-bold text-center rounded-xl border-2 focus:border-blue-600"
                    min="10"
                  />
                </div>
                <p className="text-xs text-gray-500 text-center mt-2">Minimum deposit: $10</p>
              </div>

              {/* Quick Amount Buttons */}
              <div className="grid grid-cols-4 gap-2">
                {[100, 500, 1000, 5000].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setDepositAmount(amount.toString())}
                    className="py-3 bg-white border-2 border-gray-200 hover:border-blue-600 hover:bg-blue-50 rounded-lg font-semibold text-gray-900 transition-all active:scale-95"
                  >
                    ${amount}
                  </button>
                ))}
              </div>

              {/* Fee Preview */}
              {feePreview && (
                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Amount</span>
                    <span className="font-semibold">${depositAmount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Fee</span>
                    <span className="font-semibold">${feePreview.fee}</span>
                  </div>
                  <div className="h-px bg-gray-200" />
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-900">Total</span>
                    <span className="font-bold text-blue-600">${feePreview.total}</span>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={async () => {
                    if (!depositAmount) return;
                    try {
                      setLoadingFees(true);
                      const fp = await calculateFees({ amount: parseFloat(depositAmount), type: 'deposit', method: depositMethod === 'crypto' ? 'crypto' : 'bank_transfer', currency: depositMethod === 'bank_transfer' ? 'INR' : 'USD' });
                      setFeePreview(fp);
                    } catch {}
                    finally { setLoadingFees(false); }
                  }}
                  variant="outline"
                  className="flex-1 h-12 rounded-xl"
                  disabled={!depositAmount || parseFloat(depositAmount) < 10}
                >
                  {loadingFees ? <Spinner size={16} /> : 'Preview Fees'}
                </Button>
                <Button
                  onClick={() => setDepositStep(3)}
                  disabled={!depositAmount || parseFloat(depositAmount) < 10}
                  className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold"
                >
                  Continue
                </Button>
              </div>

              <Button
                onClick={() => setDepositStep(1)}
                variant="ghost"
                className="w-full"
              >
                Back
              </Button>
            </div>
          )}

          {/* Add remaining steps here - continuing in next message due to length */}
        </div>

        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    );
  }

  // WALLET OVERVIEW (main screen)
  return (
    <div className="pb-20 md:pb-8 bg-gray-50 min-h-screen">
      {/* Balance Card */}
      <div className="p-4">
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6 text-white shadow-xl mb-6">
          <p className="text-blue-100 text-sm font-medium mb-2">Total Balance</p>
          {overviewLoading ? (
            <Skeleton className="h-10 w-40 mb-4" />
          ) : (
            <h1 className="text-4xl font-bold mb-6">{formatCurrency(wallet.balance)}</h1>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
              <p className="text-blue-100 text-xs mb-1">Available</p>
              <p className="text-white font-semibold">{formatCurrency(wallet.availableToTransfer)}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
              <p className="text-blue-100 text-xs mb-1">Pending</p>
              <p className="text-white font-semibold">{wallet.pendingTransactions}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <button
            onClick={() => setActiveView('deposit')}
            className="flex flex-col items-center justify-center bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all active:scale-95"
          >
            <div className="w-14 h-14 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center mb-3 shadow-lg">
              <ArrowDownRight className="w-7 h-7 text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-900">Deposit</span>
          </button>

          <button
            onClick={() => setActiveView('withdraw')}
            className="flex flex-col items-center justify-center bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all active:scale-95"
          >
            <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center mb-3 shadow-lg">
              <ArrowUpRight className="w-7 h-7 text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-900">Withdraw</span>
          </button>

          <button
            onClick={() => setActiveView('transfer')}
            className="flex flex-col items-center justify-center bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all active:scale-95"
          >
            <div className="w-14 h-14 bg-gradient-to-br from-purple-400 to-purple-600 rounded-2xl flex items-center justify-center mb-3 shadow-lg">
              <ArrowLeftRight className="w-7 h-7 text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-900">Transfer</span>
          </button>
        </div>

        {/* Transaction History */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Recent Transactions</h3>
            <button onClick={() => onNavigate('transactions')} className="text-sm font-medium text-blue-600 hover:text-blue-700">
              View All
            </button>
          </div>

          <div className="space-y-2">
            {overviewLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl p-4 shadow-sm">
                  <Skeleton className="h-16" />
                </div>
              ))
            ) : transactions.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <WalletIcon className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-600 mb-2">No transactions yet</p>
                <p className="text-sm text-gray-500">Your transaction history will appear here</p>
              </div>
            ) : (
              transactions.map((transaction) => (
                <div key={transaction.id} className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        transaction.type === 'deposit' ? 'bg-green-100' :
                        transaction.type === 'withdrawal' ? 'bg-blue-100' :
                        transaction.type === 'bonus' ? 'bg-yellow-100' :
                        'bg-purple-100'
                      }`}>
                        {transaction.type === 'deposit' && <ArrowDownRight className="w-6 h-6 text-green-600" />}
                        {transaction.type === 'withdrawal' && <ArrowUpRight className="w-6 h-6 text-blue-600" />}
                        {transaction.type === 'bonus' && <Gift className="w-6 h-6 text-yellow-600" />}
                        {(transaction.type === 'wallet_to_account' || transaction.type === 'account_to_wallet') && (
                          <ArrowLeftRight className="w-6 h-6 text-purple-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 capitalize">
                          {transaction.type.replace(/_/g, ' ')}
                        </p>
                        <p className="text-xs text-gray-500">{formatDateTime(transaction.createdAt)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${
                        transaction.direction === 'debit' || transaction.netAmount < 0
                          ? 'text-red-600'
                          : 'text-green-600'
                      }`}>
                        {transaction.direction === 'debit' || transaction.netAmount < 0 ? '-' : '+'}
                        {formatCurrency(Math.abs(transaction.netAmount), transaction.currency)}
                      </p>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        transaction.status === 'completed' ? 'bg-green-100 text-green-700' :
                        transaction.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {transaction.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
