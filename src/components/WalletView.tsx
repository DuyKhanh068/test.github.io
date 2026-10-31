import React, { useState } from 'react';
import { BankConfig, UserAccount, WalletTransaction } from '../types/smm';
import { apiFetch } from '../utils/api';
import { Wallet, ArrowUpRight, ArrowDownLeft, Copy, Check, PlusCircle, Landmark, UserCheck } from 'lucide-react';

interface WalletViewProps {
  activeUser: UserAccount;
  bankConfig: BankConfig;
  transactions: WalletTransaction[];
  onStateUpdated: (state: any, message: string) => void;
  onError: (msg: string) => void;
}

export const WalletView: React.FC<WalletViewProps> = ({
  activeUser,
  bankConfig,
  transactions,
  onStateUpdated,
  onError,
}) => {
  const [depositAmount, setDepositAmount] = useState<number>(500000);
  const [copiedAccount, setCopiedAccount] = useState<boolean>(false);
  const [copiedSyntax, setCopiedSyntax] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Automatically generated transfer memo based on Admin prefix + logged-in user's username
  const transferSyntax = `${bankConfig.transferPrefix || 'NAPTIEN'} ${activeUser.username}`.trim();

  const handleCopyAccount = () => {
    navigator.clipboard.writeText(bankConfig.accountNumber);
    setCopiedAccount(true);
    setTimeout(() => setCopiedAccount(false), 2000);
  };

  const handleCopySyntax = () => {
    navigator.clipboard.writeText(transferSyntax);
    setCopiedSyntax(true);
    setTimeout(() => setCopiedSyntax(false), 2000);
  };

  const handleSimulateDeposit = async (amount: number) => {
    if (amount < (bankConfig.minDeposit || 10000)) {
      onError(`Số tiền nạp tối thiểu là ${(bankConfig.minDeposit || 10000).toLocaleString('vi-VN')}đ`);
      return;
    }
    setSubmitting(true);
    try {
      const response = await apiFetch('/api/users/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: activeUser.id,
          amount,
          note: `Nạp tiền tự động qua ${bankConfig.bankName} (Nội dung: ${transferSyntax})`,
        }),
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        onError(data.error || 'Không thể nạp tiền');
      } else {
        onStateUpdated(
          data,
          `Đã cộng thành công +${amount.toLocaleString('vi-VN')}đ vào ví tài khoản @${activeUser.username}!`
        );
      }
    } catch (err: any) {
      onError(err?.message || 'Lỗi kết nối máy chủ');
    } finally {
      setSubmitting(false);
    }
  };

  const userTransactions = transactions.filter((t) => t.userId === activeUser.id);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Bank Transfer Info & Auto-Dynamic Memo */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
          <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                <Landmark className="w-5 h-5 text-indigo-400" />
                Chuyển khoản Ngân hàng Tự động 24/7
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Hệ thống tự động nhận diện nội dung theo tên tài khoản của bạn và cộng tiền sau 10–30 giây
              </p>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between py-2.5 border-b border-slate-800/80">
              <span className="text-slate-400">Ngân hàng thụ hưởng</span>
              <span className="font-semibold text-slate-100">{bankConfig.bankName}</span>
            </div>

            <div className="flex items-center justify-between py-2.5 border-b border-slate-800/80">
              <span className="text-slate-400">Số tài khoản (STK)</span>
              <div className="flex items-center gap-2">
                <span className="font-mono tabular-nums font-bold text-base text-emerald-400">
                  {bankConfig.accountNumber}
                </span>
                <button
                  type="button"
                  onClick={handleCopyAccount}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded transition-colors"
                >
                  {copiedAccount ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedAccount ? 'Đã chép STK' : 'Sao chép'}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between py-2.5 border-b border-slate-800/80">
              <span className="text-slate-400">Chủ tài khoản</span>
              <span className="font-semibold text-slate-100 uppercase">{bankConfig.accountHolder}</span>
            </div>

            <div className="p-3.5 bg-indigo-950/30 border border-indigo-800/60 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-300 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                  Nội dung chuyển khoản (Tự động theo user <strong className="text-white">@{activeUser.username}</strong>)
                </span>
                <button
                  type="button"
                  onClick={handleCopySyntax}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded transition-colors"
                >
                  {copiedSyntax ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedSyntax ? 'Đã chép nội dung' : 'Sao chép nội dung'}
                </button>
              </div>
              <div className="font-mono text-base font-bold text-indigo-300 tracking-wide select-all">
                {transferSyntax}
              </div>
              <div className="text-xs text-slate-400">
                Lưu ý: Vui lòng giữ nguyên nội dung <code className="font-mono text-slate-200">{transferSyntax}</code> khi chuyển khoản để hệ thống cộng đúng vào tài khoản <strong className="text-slate-200">@{activeUser.username}</strong>.
              </div>
            </div>
          </div>

          {/* Instant Webhook Test / Topup Controls */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <label className="block text-xs font-medium text-slate-300">
              Xác nhận đã chuyển khoản (Kiểm tra & Cộng tiền tự động vào ví)
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {[50000, 100000, 500000, 1000000, 5000000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setDepositAmount(preset)}
                  className={`px-3 py-1.5 text-xs font-mono tabular-nums rounded-md border transition-colors ${
                    depositAmount === preset
                      ? 'bg-indigo-600 text-white border-indigo-500'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  +{preset.toLocaleString('vi-VN')}đ
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 pt-1">
              <input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(Number(e.target.value))}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm font-mono tabular-nums text-slate-100"
              />
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSimulateDeposit(depositAmount)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <PlusCircle className="w-4 h-4" />
                Nạp {depositAmount.toLocaleString('vi-VN')}đ Ngay
              </button>
            </div>
          </div>
        </div>

        {/* Right: Account Financial Summary & Ledger */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
          <div className="grid grid-cols-3 gap-4 border-b border-slate-800 pb-5">
            <div>
              <div className="text-xs text-slate-400">Số dư khả dụng</div>
              <div className="text-lg font-bold font-mono tabular-nums text-emerald-400 mt-1">
                {activeUser.balance.toLocaleString('vi-VN')} đ
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Tổng đã nạp</div>
              <div className="text-lg font-bold font-mono tabular-nums text-slate-100 mt-1">
                {activeUser.totalDeposited.toLocaleString('vi-VN')} đ
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Tổng đã chi tiêu</div>
              <div className="text-lg font-bold font-mono tabular-nums text-indigo-400 mt-1">
                {activeUser.totalSpent.toLocaleString('vi-VN')} đ
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-indigo-400" />
              Lịch sử nạp tiền & Biến động số dư (@{activeUser.username})
            </h3>
            <div className="divide-y divide-slate-800/70 max-h-[380px] overflow-y-auto pr-1">
              {userTransactions.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Chưa có giao dịch phát sinh trên tài khoản @{activeUser.username}.
                </div>
              ) : (
                userTransactions.map((tx) => (
                  <div key={tx.id} className="py-3 flex items-start justify-between gap-3 text-xs">
                    <div className="flex items-start gap-2.5">
                      {tx.amount >= 0 ? (
                        <ArrowDownLeft className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="text-slate-200 font-medium">{tx.note}</div>
                        <div className="text-slate-500 font-mono tabular-nums mt-0.5">
                          {new Date(tx.createdAt).toLocaleString('vi-VN')} · Số dư sau GD:{' '}
                          {tx.balanceAfter.toLocaleString('vi-VN')}đ
                        </div>
                      </div>
                    </div>
                    <div
                      className={`font-mono tabular-nums font-semibold whitespace-nowrap ${
                        tx.amount >= 0 ? 'text-emerald-400' : 'text-slate-200'
                      }`}
                    >
                      {tx.amount >= 0
                        ? `+${tx.amount.toLocaleString('vi-VN')}đ`
                        : `${tx.amount.toLocaleString('vi-VN')}đ`}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
