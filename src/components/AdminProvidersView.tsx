import React, { useState, useEffect } from 'react';
import { ApiProvider, BankConfig, UserAccount } from '../types/smm';
import { apiFetch } from '../utils/api';
import {
  Server,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Percent,
  Users,
  DollarSign,
  Sliders,
  Lock,
  Landmark,
} from 'lucide-react';

interface AdminProvidersViewProps {
  providers: ApiProvider[];
  bankConfig: BankConfig;
  users: UserAccount[];
  onStateUpdated: (state: any, message: string) => void;
  onError: (msg: string) => void;
}

export const AdminProvidersView: React.FC<AdminProvidersViewProps> = ({
  providers,
  bankConfig,
  users,
  onStateUpdated,
  onError,
}) => {
  const [editingProvider, setEditingProvider] = useState<Partial<ApiProvider>>({
    id: providers[0]?.id || '',
    name: providers[0]?.name || 'SMM.VIN (Nguồn Chính SMM API v2)',
    url: providers[0]?.url || 'https://smm.vin/api/v2',
    apiKey: providers[0]?.apiKey || '',
    currency: providers[0]?.currency || 'VND',
    exchangeRate: providers[0]?.exchangeRate || 1,
    priceMarkupPercent: providers[0]?.priceMarkupPercent ?? 25,
    useSandbox: providers[0]?.useSandbox ?? true,
  });

  // Bank Account Config Form State
  const [bankForm, setBankForm] = useState<BankConfig>(bankConfig);
  const [savingBank, setSavingBank] = useState<boolean>(false);

  useEffect(() => {
    if (bankConfig) {
      setBankForm(bankConfig);
    }
  }, [bankConfig]);

  const [loadingProviderId, setLoadingProviderId] = useState<string | null>(null);
  const [bulkMarkup, setBulkMarkup] = useState<number>(providers[0]?.priceMarkupPercent ?? 25);
  const [adjustAmounts, setAdjustAmounts] = useState<Record<string, number>>({});

  // Admin password change state
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [changingPass, setChangingPass] = useState<boolean>(false);

  const selectProviderForEdit = (prov: ApiProvider) => {
    setEditingProvider({ ...prov });
    setBulkMarkup(prov.priceMarkupPercent);
  };

  const startNewProvider = () => {
    setEditingProvider({
      id: '',
      name: 'Nguồn SMM API v2 Mới',
      url: 'https://smm.vin/api/v2',
      apiKey: '',
      currency: 'VND',
      exchangeRate: 1,
      priceMarkupPercent: 25,
      useSandbox: false,
    });
  };

  const handleSaveBankConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBank(true);
    try {
      const response = await apiFetch('/api/bank-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bankForm),
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        onError(data.error || 'Không thể lưu cấu hình ngân hàng');
      } else {
        onStateUpdated(
          data,
          `Đã cập nhật Số tài khoản ngân hàng (${bankForm.bankName} - ${bankForm.accountNumber}) thành công!`
        );
      }
    } catch (err: any) {
      onError(err?.message || 'Lỗi máy chủ khi lưu cấu hình ngân hàng');
    } finally {
      setSavingBank(false);
    }
  };

  const handleSaveProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await apiFetch('/api/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingProvider),
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        onError(data.error || 'Không thể lưu nguồn API');
      } else {
        onStateUpdated(data, `Đã lưu cấu hình nguồn SMM API v2 (${editingProvider.name})!`);
      }
    } catch (err: any) {
      onError(err?.message || 'Lỗi máy chủ');
    }
  };

  const handleCheckBalance = async (provId: string) => {
    setLoadingProviderId(`bal_${provId}`);
    try {
      const response = await apiFetch(`/api/providers/${provId}/balance`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok || data.error) {
        if (data.state) onStateUpdated(data.state, '');
        onError(data.error || 'Lỗi kiểm tra số dư');
      } else {
        onStateUpdated(
          data.state,
          `Kết nối thành công! Số dư nguồn (action=balance): ${Number(data.balance).toLocaleString('vi-VN')} ${data.currency}`
        );
      }
    } catch (err: any) {
      onError(err?.message || 'Lỗi kết nối API');
    } finally {
      setLoadingProviderId(null);
    }
  };

  const handleSyncServices = async (provId: string) => {
    setLoadingProviderId(`sync_${provId}`);
    try {
      const response = await apiFetch(`/api/providers/${provId}/sync`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok || data.error) {
        if (data.state) onStateUpdated(data.state, '');
        onError(data.error || 'Không thể đồng bộ dịch vụ');
      } else {
        onStateUpdated(
          data.state,
          `Đồng bộ thành công ${data.syncedCount} dịch vụ từ lệnh action=services và tự động tính giá bán lẻ!`
        );
      }
    } catch (err: any) {
      onError(err?.message || 'Lỗi đồng bộ dịch vụ');
    } finally {
      setLoadingProviderId(null);
    }
  };

  const handleDeleteProvider = async (provId: string) => {
    try {
      const response = await apiFetch(`/api/providers/${provId}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok || data.error) {
        onError(data.error || 'Không thể xóa nguồn API');
      } else {
        onStateUpdated(data, 'Đã xóa nguồn API');
      }
    } catch (err: any) {
      onError(err?.message || 'Lỗi xóa nguồn API');
    }
  };

  const handleBulkMarkupUpdate = async () => {
    try {
      const response = await apiFetch('/api/services/bulk-markup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId: editingProvider.id || providers[0]?.id,
          markupPercent: bulkMarkup,
          exchangeRate: editingProvider.exchangeRate || 1,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        onStateUpdated(data, `Đã cập nhật biên lợi nhuận +${bulkMarkup}% cho toàn bộ bảng giá dịch vụ!`);
      }
    } catch (err: any) {
      onError(err?.message || 'Lỗi cập nhật bảng giá');
    }
  };

  const handleAdminAdjustUserBalance = async (userId: string, delta: number) => {
    if (!delta) return;
    try {
      const response = await apiFetch('/api/users/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          amount: delta,
          note: `Admin điều chỉnh số dư (${delta >= 0 ? '+' : ''}${delta.toLocaleString('vi-VN')}đ)`,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        onStateUpdated(data, `Đã cập nhật số dư thành viên thành công!`);
      }
    } catch (err: any) {
      onError(err?.message || 'Lỗi điều chỉnh số dư');
    }
  };

  const handleChangeAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangingPass(true);
    try {
      const response = await apiFetch('/api/auth/change-admin-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        onError(data.error || 'Không thể đổi mật khẩu Admin');
      } else {
        setCurrentPassword('');
        setNewPassword('');
        const stateRes = await apiFetch('/api/state');
        const nextState = await stateRes.json();
        onStateUpdated(nextState, data.message || 'Đã đổi mật khẩu Quản trị viên thành công!');
      }
    } catch (err: any) {
      onError(err?.message || 'Lỗi đổi mật khẩu');
    } finally {
      setChangingPass(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Bank Account Settings, Connected SMM API v2 Providers, User Balances (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Bank Account Configuration Card (Chỉnh sửa STK Ngân hàng & Cú pháp nạp tiền) */}
          <form
            onSubmit={handleSaveBankConfig}
            className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4"
          >
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                  <Landmark className="w-5 h-5 text-emerald-400" />
                  Cấu hình Tài khoản Ngân hàng Nhận tiền (Nạp tiền Khách hàng)
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Chỉnh sửa STK ngân hàng hiển thị ở trang Nạp tiền; nội dung chuyển khoản sẽ tự động ghép với tên user của khách
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-medium text-slate-300 mb-1">Tên Ngân hàng hiển thị</label>
                <input
                  type="text"
                  required
                  value={bankForm.bankName}
                  onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
                  placeholder="VD: MBBank (Ngân hàng Quân Đội)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Số tài khoản (STK nhận tiền)</label>
                <input
                  type="text"
                  required
                  value={bankForm.accountNumber}
                  onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })}
                  placeholder="VD: 999988886868"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm font-mono text-emerald-400 font-semibold focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Tên Chủ tài khoản</label>
                <input
                  type="text"
                  required
                  value={bankForm.accountHolder}
                  onChange={(e) => setBankForm({ ...bankForm, accountHolder: e.target.value.toUpperCase() })}
                  placeholder="VD: NGUYEN VAN A"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm uppercase text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Tiền tố nội dung chuyển khoản</label>
                <input
                  type="text"
                  required
                  value={bankForm.transferPrefix}
                  onChange={(e) => setBankForm({ ...bankForm, transferPrefix: e.target.value.toUpperCase() })}
                  placeholder="VD: NAPTIEN"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm font-mono uppercase text-indigo-400 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="text-slate-400">
                Xem trước nội dung chuyển tiền tự động của khách:
              </div>
              <div className="font-mono font-bold text-indigo-300">
                {bankForm.transferPrefix || 'NAPTIEN'} [tên_user_tài_khoản]
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingBank}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg transition-colors"
              >
                {savingBank ? 'Đang lưu...' : 'Lưu Thông Tin Ngân Hàng'}
              </button>
            </div>
          </form>

          {/* 2. SMM API v2 Providers List */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                  <Server className="w-5 h-5 text-indigo-400" />
                  Danh sách Nguồn SMM API v2 Đang Đấu Nối
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Chỉ Quản trị viên đã xác thực mật khẩu mới thấy và chỉnh sửa được thông tin nguồn API này
                </p>
              </div>
              <button
                type="button"
                onClick={startNewProvider}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4" />
                Thêm nguồn API mới
              </button>
            </div>

            <div className="divide-y divide-slate-800">
              {providers.map((prov) => (
                <div key={prov.id} className="py-4 first:pt-1 last:pb-1 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-100">{prov.name}</span>
                        <span className="text-xs text-slate-500">·</span>
                        {prov.status === 'Connected' ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Đã kết nối
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-400 font-medium">
                            <AlertCircle className="w-3.5 h-3.5" /> {prov.status}
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-mono text-slate-400 mt-0.5">
                        Endpoint: {prov.url} · Chế độ: {prov.useSandbox ? 'Giả lập SMM.VIN Sandbox' : 'Gọi HTTP POST Thực tế'}
                      </div>
                    </div>

                    <div className="text-left sm:text-right font-mono tabular-nums">
                      <div className="text-xs text-slate-400">Số dư API nguồn</div>
                      <div className="text-sm font-bold text-emerald-400">
                        {prov.balance.toLocaleString('vi-VN')} {prov.currency}
                      </div>
                    </div>
                  </div>

                  {prov.lastError && (
                    <div className="text-xs text-red-400 bg-red-950/30 border border-red-900/50 rounded px-3 py-1.5">
                      Chi tiết phản hồi: {prov.lastError}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="text-xs text-slate-400 font-mono tabular-nums">
                      Lợi nhuận cài đặt: <strong className="text-slate-200">+{prov.priceMarkupPercent}%</strong> · Tỷ giá:{' '}
                      <strong className="text-slate-200">{prov.exchangeRate}</strong>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => selectProviderForEdit(prov)}
                        className="px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
                      >
                        Cấu hình URL / Key
                      </button>
                      <button
                        type="button"
                        disabled={loadingProviderId === `bal_${prov.id}`}
                        onClick={() => handleCheckBalance(prov.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-sky-300 bg-sky-950/60 hover:bg-sky-900/60 border border-sky-800/60 rounded-lg transition-colors whitespace-nowrap shrink-0"
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                        {loadingProviderId === `bal_${prov.id}` ? 'Đang kiểm tra...' : 'Check Balance'}
                      </button>
                      <button
                        type="button"
                        disabled={loadingProviderId === `sync_${prov.id}`}
                        onClick={() => handleSyncServices(prov.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-800/60 rounded-lg transition-colors whitespace-nowrap shrink-0"
                      >
                        <RefreshCw
                          className={`w-3.5 h-3.5 ${loadingProviderId === `sync_${prov.id}` ? 'animate-spin' : ''}`}
                        />
                        {loadingProviderId === `sync_${prov.id}` ? 'Đang đồng bộ...' : 'Đồng bộ Dịch vụ (services)'}
                      </button>
                      {providers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteProvider(prov.id)}
                          className="p-1.5 text-red-400 hover:bg-red-950/50 rounded-lg transition-colors"
                          title="Xóa nguồn API"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. User Accounts & Balance Manager */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-400" />
                Quản lý Tài khoản Thành viên & Cộng/Trừ Số dư
              </h3>
            </div>

            <div className="divide-y divide-slate-800 text-xs">
              {users.map((u) => (
                <div key={u.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-100">
                      {u.fullName} (@{u.username}) · {u.role === 'admin' ? 'Quản trị viên' : 'Khách hàng'}
                    </div>
                    <div className="text-slate-400 font-mono tabular-nums mt-0.5">
                      Số dư hiện tại: <strong className="text-emerald-400">{u.balance.toLocaleString('vi-VN')}đ</strong> · Nội dung CK:{' '}
                      <span className="text-indigo-400">{bankForm.transferPrefix || 'NAPTIEN'} {u.username}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="Nhập số tiền..."
                      value={adjustAmounts[u.id] || ''}
                      onChange={(e) => setAdjustAmounts({ ...adjustAmounts, [u.id]: Number(e.target.value) })}
                      className="w-32 bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 font-mono text-slate-100"
                    />
                    <button
                      type="button"
                      onClick={() => handleAdminAdjustUserBalance(u.id, Math.abs(adjustAmounts[u.id] || 500000))}
                      className="px-2.5 py-1.5 font-medium text-emerald-300 bg-emerald-950/60 border border-emerald-800/60 rounded hover:bg-emerald-900/60 whitespace-nowrap shrink-0"
                    >
                      + Cộng tiền
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAdminAdjustUserBalance(u.id, -Math.abs(adjustAmounts[u.id] || 100000))}
                      className="px-2.5 py-1.5 font-medium text-amber-300 bg-amber-950/60 border border-amber-800/60 rounded hover:bg-amber-900/60 whitespace-nowrap shrink-0"
                    >
                      - Trừ tiền
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Provider Form, Bulk Markup & Change Admin Password (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <form
            onSubmit={handleSaveProvider}
            className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4"
          >
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-400" />
                {editingProvider.id ? 'Chỉnh sửa Đấu nối SMM API v2' : 'Thêm Nguồn SMM API v2 Mới'}
              </h3>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">Tên nhà cung cấp</label>
              <input
                type="text"
                value={editingProvider.name || ''}
                onChange={(e) => setEditingProvider({ ...editingProvider, name: e.target.value })}
                placeholder="VD: SMM.VIN Main Server"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">API URL (Chuẩn SMM API v2)</label>
              <input
                type="url"
                value={editingProvider.url || ''}
                onChange={(e) => setEditingProvider({ ...editingProvider, url: e.target.value })}
                placeholder="https://smm.vin/api/v2"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm font-mono text-slate-100"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">API Key từ Nhà cung cấp</label>
              <input
                type="text"
                value={editingProvider.apiKey || ''}
                onChange={(e) => setEditingProvider({ ...editingProvider, apiKey: e.target.value })}
                placeholder="Dán API Key lấy tại trang tài khoản smm.vin..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm font-mono text-slate-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">% Lợi nhuận cộng thêm</label>
                <input
                  type="number"
                  value={editingProvider.priceMarkupPercent ?? 25}
                  onChange={(e) =>
                    setEditingProvider({ ...editingProvider, priceMarkupPercent: Number(e.target.value) })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm font-mono tabular-nums text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Tỷ giá quy đổi (1 nếu VND)</label>
                <input
                  type="number"
                  value={editingProvider.exchangeRate ?? 1}
                  onChange={(e) => setEditingProvider({ ...editingProvider, exchangeRate: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm font-mono tabular-nums text-slate-100"
                />
              </div>
            </div>

            <div className="pt-2">
              <label className="inline-flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={Boolean(editingProvider.useSandbox)}
                  onChange={(e) => setEditingProvider({ ...editingProvider, useSandbox: e.target.checked })}
                  className="mt-0.5 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-0"
                />
                <span className="text-xs text-slate-300 leading-relaxed">
                  <strong>Bật chế độ Sandbox giả lập SMM.VIN:</strong> Cho phép chạy thử đầy đủ lệnh{' '}
                  <code className="font-mono text-indigo-400">services, add, status, refill, cancel, balance</code> khi chưa nạp tiền vào API Key thật.
                </span>
              </label>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
            >
              Lưu Cấu Hình Nguồn API
            </button>
          </form>

          {/* Bulk Price Markup Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <Percent className="w-4 h-4 text-emerald-400" />
              Cập nhật nhanh % Lợi nhuận Toàn bộ Dịch vụ
            </h3>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={bulkMarkup}
                onChange={(e) => setBulkMarkup(Number(e.target.value))}
                className="w-28 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm font-mono tabular-nums text-slate-100"
              />
              <button
                type="button"
                onClick={handleBulkMarkupUpdate}
                className="flex-1 py-2 px-4 text-xs font-semibold text-slate-100 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                Áp dụng +{bulkMarkup}% cho tất cả dịch vụ
              </button>
            </div>
          </div>

          {/* Change Admin Password Box */}
          <form
            onSubmit={handleChangeAdminPassword}
            className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4"
          >
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-400" />
              Đổi Mật Khẩu Quản Trị Viên (Bảo mật Admin)
            </h3>
            <p className="text-xs text-slate-400">
              Khách hàng không có mật khẩu này sẽ không thể đăng nhập vào tài khoản <code className="font-mono text-slate-200">admin</code> hoặc xem nguồn API của bạn.
            </p>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Mật khẩu Admin hiện tại</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Mặc định ban đầu: admin123456"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Mật khẩu Admin mới (tối thiểu 6 ký tự)</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nhập mật khẩu bảo mật mới..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100"
                />
              </div>
              <button
                type="submit"
                disabled={changingPass}
                className="w-full py-2 px-4 text-xs font-semibold text-amber-300 bg-amber-950/60 hover:bg-amber-900/60 border border-amber-800/60 rounded-lg transition-colors"
              >
                {changingPass ? 'Đang cập nhật...' : 'Cập Nhật Mật Khẩu Admin Mới'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
