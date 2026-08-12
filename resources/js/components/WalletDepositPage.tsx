import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Copy, Upload, Wallet as WalletIcon, AlertCircle } from 'lucide-react';
import { tradingService } from '../services/tradingService';
import { PaymentMethod } from '../types';

interface WalletDepositPageProps {
  user: any;
  basePath: '/app' | '/demo';
}

export default function WalletDepositPage({ user, basePath }: WalletDepositPageProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [amount, setAmount] = useState(searchParams.get('amount') || '');
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState<number | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [copied, setCopied] = useState(false);
  const [transactionReference, setTransactionReference] = useState('');
  const [notes, setNotes] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMethods, setLoadingMethods] = useState(true);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void tradingService.getPaymentMethods()
      .then((methods) => {
        if (!active) return;
        setPaymentMethods(methods);
        setSelectedWalletId(methods[0]?.id ?? null);
      })
      .catch((err: any) => {
        if (!active) return;
        setError(err.message || 'Unable to load payment methods.');
      })
      .finally(() => {
        if (active) {
          setLoadingMethods(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const selectedWallet = useMemo(
    () => paymentMethods.find((wallet) => wallet.id === selectedWalletId) ?? null,
    [paymentMethods, selectedWalletId]
  );

  const handleCopyAddress = async () => {
    if (!selectedWallet) {
      setError('No payment method is available yet.');
      return;
    }

    try {
      await navigator.clipboard.writeText(selectedWallet.address);
      setCopied(true);
      setError(null);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Unable to copy the wallet address. Please copy it manually.');
    }
  };

  const proceedToWalletStep = () => {
    const numericAmount = Number(amount);

    if (!numericAmount || numericAmount <= 0) {
      setError('Enter a valid amount before proceeding.');
      return;
    }
    if (!selectedWallet) {
      setError('No payment method is available yet.');
      return;
    }

    setError(null);
    setStep(2);
  };

  const proceedToProofStep = () => {
    setError(null);
    setStep(3);
  };

  const handleSubmitProof = async () => {
    const numericAmount = Number(amount);

    if (!user) return;
    if (!selectedWallet) {
      setError('No payment method is available yet.');
      return;
    }
    if (!numericAmount || numericAmount <= 0) {
      setError('Enter a valid amount before submitting.');
      return;
    }
    if (!proofFile) {
      setError('Upload your payment proof before submitting.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = new FormData();
      payload.append('amount', String(numericAmount));
      payload.append('payment_method_id', String(selectedWallet.id));
      payload.append('transaction_reference', transactionReference);
      payload.append('notes', notes);
      payload.append('proof_file', proofFile);

      await tradingService.submitDepositRequest(user.uid, payload);

      setSuccess('Deposit proof submitted successfully. Admin has been notified by email.');
      setStep(3);
    } catch (err: any) {
      setError(err.message || 'Unable to submit deposit proof.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-[#0F0F11] border border-zinc-800/50 rounded-3xl p-6 md:p-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => navigate(`${basePath}/wallet`)}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2 text-xs font-bold text-zinc-300 hover:border-zinc-700 hover:text-white transition-colors"
            >
              <ArrowLeft size={14} />
              Back to Wallet
            </button>
            <div className="inline-flex items-center gap-2 rounded-full border border-yellow-500/20 bg-yellow-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-yellow-300">
              <WalletIcon size={12} />
              Deposit Flow
            </div>
          </div>

          <div className="text-center">
            <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold">Wallet Deposit</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Complete deposit in steps</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Select wallet, copy the address, then upload your proof. Each step is completed separately.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((current) => {
              const active = step === current;
              const complete = step > current;

              return (
                <div
                  key={current}
                  className={`rounded-2xl border px-4 py-3 text-center ${
                    active
                      ? 'border-yellow-500/40 bg-yellow-500/10 text-yellow-300'
                      : complete
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                        : 'border-zinc-800 bg-zinc-900/50 text-zinc-500'
                  }`}
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider">Step {current}</p>
                  <p className="mt-1 text-xs">
                    {current === 1 ? 'Select Wallet' : current === 2 ? 'Copy Address' : 'Submit Proof'}
                  </p>
                </div>
              );
            })}
          </div>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex gap-3 text-rose-400">
              <AlertCircle size={18} className="shrink-0" />
              <p className="text-xs font-medium">{error}</p>
            </div>
          )}

          {success && (
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex gap-3 text-yellow-400">
              <CheckCircle2 size={18} className="shrink-0" />
              <p className="text-xs font-medium">{success}</p>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1.5 block">Amount ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 px-4 text-sm font-mono focus:outline-none focus:border-yellow-500/50 transition-all"
                  placeholder="1000"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-2 block">Choose Wallet</label>
                {loadingMethods ? (
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 text-sm text-zinc-400">Loading payment methods...</div>
                ) : paymentMethods.length === 0 ? (
                  <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300">
                    No active payment method is available yet. Contact admin.
                  </div>
                ) : (
                <div className="grid gap-3 md:grid-cols-3">
                  {paymentMethods.map((wallet) => {
                    const active = wallet.id === selectedWallet?.id;

                    return (
                      <button
                        key={wallet.id}
                        type="button"
                        onClick={() => setSelectedWalletId(wallet.id)}
                        className={`rounded-2xl border p-4 text-left transition-all ${
                          active
                            ? 'border-yellow-500/50 bg-yellow-500/10 text-yellow-300'
                            : 'border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-zinc-700'
                        }`}
                      >
                        <p className="text-sm font-bold">{wallet.name}</p>
                        <p className="mt-1 text-[10px] uppercase tracking-wider">{wallet.network || 'Default'}</p>
                      </button>
                    );
                  })}
                </div>
                )}
              </div>

              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={proceedToWalletStep}
                  className="inline-flex items-center justify-center rounded-2xl bg-yellow-500 px-8 py-3 text-sm font-bold text-black transition-all hover:bg-yellow-400"
                >
                  Deposit and Continue
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
                <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Selected Wallet</p>
                <p className="mt-2 text-lg font-bold text-white">{selectedWallet?.name}</p>
                <p className="text-xs text-zinc-500">{selectedWallet?.network || 'Default'}</p>
                <p className="mt-4 text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Wallet Address</p>
                <p className="mt-2 break-all font-mono text-sm text-white">{selectedWallet?.address}</p>
                {selectedWallet?.instructions && (
                  <p className="mt-3 text-xs text-zinc-400">{selectedWallet.instructions}</p>
                )}
              </div>

              <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-900 px-6 py-3 text-sm font-bold text-zinc-200 transition-all hover:border-zinc-600 hover:text-white"
                >
                  Change Wallet
                </button>
                <button
                  type="button"
                  onClick={handleCopyAddress}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-yellow-500 px-6 py-3 text-sm font-bold text-black transition-all hover:bg-yellow-400"
                >
                  <Copy size={15} />
                  {copied ? 'Copied' : 'Copy Selected Wallet'}
                </button>
                <button
                  type="button"
                  onClick={proceedToProofStep}
                  className="inline-flex items-center justify-center rounded-2xl border border-yellow-500/30 bg-yellow-500/10 px-6 py-3 text-sm font-bold text-yellow-300 transition-all hover:border-yellow-500/50"
                >
                  Proceed to Proof
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1.5 block">Transaction Reference</label>
                  <input
                    type="text"
                    value={transactionReference}
                    onChange={(event) => setTransactionReference(event.target.value)}
                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-yellow-500/50 transition-all"
                    placeholder="Optional hash or reference"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1.5 block">Payment Proof</label>
                  <label className="flex items-center gap-3 rounded-xl border border-dashed border-zinc-700 bg-zinc-900/40 px-4 py-3 text-sm text-zinc-300 cursor-pointer hover:border-yellow-500/40 transition-colors">
                    <Upload size={16} className="text-yellow-400" />
                    <span className="truncate">{proofFile ? proofFile.name : 'Upload JPG, PNG, or PDF'}</span>
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      className="hidden"
                      onChange={(event) => setProofFile(event.target.files?.[0] ?? null)}
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1.5 block">Notes</label>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className="w-full min-h-28 bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-yellow-500/50 transition-all resize-none"
                  placeholder="Add any extra payment details for admin review"
                />
              </div>

              <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="inline-flex items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-900 px-6 py-3 text-sm font-bold text-zinc-200 transition-all hover:border-zinc-600 hover:text-white"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleSubmitProof}
                  className="inline-flex items-center justify-center rounded-2xl bg-yellow-500 px-8 py-3 text-sm font-bold text-black transition-all hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? 'Submitting...' : 'Submit Deposit Proof'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
