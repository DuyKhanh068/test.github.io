import React, { useState, useMemo } from 'react';
import { SmmOrder, OrderStatus } from '../types/smm';
import { apiFetch } from '../utils/api';
import {
  RefreshCw,
  ShieldCheck,
  XCircle,
  Search,
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  Copy,
  Check,
} from 'lucide-react';

interface OrderHistoryViewProps {
  orders: SmmOrder[];
  onStateUpdated: (state: any, message: string) => void;
  onError: (msg: string) => void;
  onNavigateNewOrder: () => void;
}

const STATUS_FILTERS: { label: string; value: OrderStatus | 'ALL' }[] = [
  { label: 'Tất cả đơn', value: 'ALL' },
  { label: 'Đang chạy', value: 'In progress' },
  { label: 'Chờ xử lý', value: 'Pending' },
  { label: 'Hoàn thành', value: 'Completed' },
  { label: 'Đã hủy', value: 'Canceled' },
];

export const OrderHistoryView: React.FC<OrderHistoryViewProps> = ({
  orders,
  onStateUpdated,
  onError,
  onNavigateNewOrder,
}) => {
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const filteredOrders = useMemo(() => {
    return orders.filter((ord) => {
      if (statusFilter !== 'ALL' && ord.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchId = String(ord.id).includes(q) || String(ord.providerOrderId).includes(q);
        const matchLink = ord.link.toLowerCase().includes(q);
        const matchName = ord.serviceName.toLowerCase().includes(q);
        return matchId || matchLink || matchName;
      }
      return true;
    });
  }, [orders, statusFilter, searchQuery]);

  const toggleSelectOrder = (id: number) => {
    setSelectedOrderIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    if (selectedOrderIds.length === filteredOrders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(filteredOrders.map((o) => o.id));
    }
  };

  const handleCopyId = (id: number) => {
    navigator.clipboard.writeText(String(id));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleSyncStatus = async (ids?: number[]) => {
    setLoadingAction('status');
    try {
      const response = await apiFetch('/api/orders/sync-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: ids && ids.length > 0 ? ids : selectedOrderIds }),
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        onError(data.error || 'Không thể đồng bộ trạng thái');
      } else {
        onStateUpdated(
          data.state,
          `Đã cập nhật tiến độ mới nhất cho ${data.updatedCount} đơn hàng!`
        );
      }
    } catch (err: any) {
      onError(err?.message || 'Lỗi kết nối khi đồng bộ trạng thái');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleRefill = async (ids: number[]) => {
    setLoadingAction(`refill_${ids.join('_')}`);
    try {
      const response = await apiFetch('/api/orders/refill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: ids }),
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        onError(data.error || 'Đơn hàng không đủ điều kiện bảo hành');
      } else {
        onStateUpdated(
          data.state,
          `Đã gửi yêu cầu bảo hành bù tụt (Refill) cho ${data.refilledCount} đơn hàng!`
        );
      }
    } catch (err: any) {
      onError(err?.message || 'Lỗi khi gửi lệnh Refill');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleCheckRefillStatus = async (orderId?: number) => {
    setLoadingAction(`refill_status_${orderId || 'all'}`);
    try {
      const response = await apiFetch('/api/orders/refill-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        onError(data.error || 'Không thể kiểm tra trạng thái bảo hành');
      } else {
        onStateUpdated(data.state, 'Đã đồng bộ trạng thái bảo hành hoàn tất!');
      }
    } catch (err: any) {
      onError(err?.message || 'Lỗi kết nối máy chủ');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleCancelOrder = async (ids: number[]) => {
    setLoadingAction(`cancel_${ids.join('_')}`);
    try {
      const response = await apiFetch('/api/orders/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: ids }),
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        onError(data.error || 'Không thể hủy đơn hàng này');
      } else {
        setSelectedOrderIds([]);
        onStateUpdated(
          data.state,
          `Đã hủy và hoàn tiền tự động về ví cho ${data.canceledCount} đơn hàng!`
        );
      }
    } catch (err: any) {
      onError(err?.message || 'Lỗi khi hủy đơn hàng');
    } finally {
      setLoadingAction(null);
    }
  };

  const renderStatusText = (status: OrderStatus) => {
    switch (status) {
      case 'Completed':
        return (
          <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" /> Hoàn thành
          </span>
        );
      case 'In progress':
      case 'Processing':
        return (
          <span className="inline-flex items-center gap-1.5 text-amber-400 font-medium">
            <Clock className="w-3.5 h-3.5" /> Đang chạy
          </span>
        );
      case 'Pending':
        return (
          <span className="inline-flex items-center gap-1.5 text-sky-400 font-medium">
            <Clock className="w-3.5 h-3.5" /> Chờ xử lý
          </span>
        );
      case 'Canceled':
      case 'Refunded':
        return (
          <span className="inline-flex items-center gap-1.5 text-red-400 font-medium">
            <XCircle className="w-3.5 h-3.5" /> Đã hủy & Hoàn tiền
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-slate-300 font-medium">
            <AlertTriangle className="w-3.5 h-3.5" /> {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-5">
      {/* Toolbar: Segmented Filter + Search + Batch API Actions */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {STATUS_FILTERS.map((sf) => {
            const count =
              sf.value === 'ALL'
                ? orders.length
                : orders.filter((o) => o.status === sf.value).length;
            return (
              <button
                key={sf.value}
                type="button"
                onClick={() => setStatusFilter(sf.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  statusFilter === sf.value
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
                }`}
              >
                {sf.label} ({count})
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm mã đơn, link bài viết..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button
            type="button"
            onClick={() => handleSyncStatus(selectedOrderIds)}
            disabled={loadingAction === 'status'}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-slate-100 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingAction === 'status' ? 'animate-spin' : ''}`} />
            {selectedOrderIds.length > 0
              ? `Cập nhật ${selectedOrderIds.length} đơn đã chọn`
              : 'Cập nhật tiến độ tất cả đơn'}
          </button>

          {selectedOrderIds.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => handleRefill(selectedOrderIds)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-800/70 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Bảo hành ({selectedOrderIds.length})
              </button>
              <button
                type="button"
                onClick={() => handleCancelOrder(selectedOrderIds)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-300 bg-red-950/60 hover:bg-red-900/60 border border-red-800/70 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <XCircle className="w-3.5 h-3.5" />
                Hủy đơn ({selectedOrderIds.length})
              </button>
            </>
          )}
        </div>
      </div>

      {/* High-Density Data Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        {filteredOrders.length === 0 ? (
          <div className="py-14 px-6 text-center space-y-3">
            <div className="text-base font-medium text-slate-200">Không tìm thấy đơn hàng nào khớp bộ lọc</div>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Tất cả đơn hàng đặt qua giao diện web hoặc qua cổng API v2 của bạn sẽ hiển thị chi tiết tiến độ và phần trăm hoàn thành tại đây.
            </p>
            <button
              type="button"
              onClick={onNavigateNewOrder}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
            >
              Tạo đơn hàng đầu tiên
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-xs text-slate-400">
                  <th className="py-3 pl-4 pr-2 w-8">
                    <input
                      type="checkbox"
                      checked={selectedOrderIds.length === filteredOrders.length && filteredOrders.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0"
                    />
                  </th>
                  <th className="py-3 px-3 font-medium">Mã đơn</th>
                  <th className="py-3 px-3 font-medium">Dịch vụ & Đường dẫn (Link)</th>
                  <th className="py-3 px-3 font-medium text-right">Bắt đầu</th>
                  <th className="py-3 px-3 font-medium text-right">Tiến độ chạy</th>
                  <th className="py-3 px-3 font-medium text-right">Chi phí</th>
                  <th className="py-3 px-3 font-medium">Trạng thái</th>
                  <th className="py-3 pl-3 pr-4 font-medium text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-xs">
                {filteredOrders.map((ord) => {
                  const isSelected = selectedOrderIds.includes(ord.id);
                  const delivered = Math.max(0, ord.quantity - ord.remains);
                  const progressPercent =
                    ord.status === 'Canceled'
                      ? 0
                      : ord.quantity > 0
                      ? Math.min(100, Math.round((delivered / ord.quantity) * 100))
                      : 100;

                  return (
                    <tr
                      key={ord.id}
                      className={`transition-colors ${
                        isSelected ? 'bg-indigo-950/20' : 'hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-3 pl-4 pr-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOrder(ord.id)}
                          className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-0"
                        />
                      </td>
                      <td className="py-3 px-3 font-mono tabular-nums whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-100">#{ord.id}</span>
                          <button
                            type="button"
                            onClick={() => handleCopyId(ord.id)}
                            className="text-slate-500 hover:text-slate-200"
                            title="Sao chép mã đơn"
                          >
                            {copiedId === ord.id ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                        <div className="text-slate-500 mt-0.5">
                          {new Date(ord.createdAt).toLocaleTimeString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>
                      <td className="py-3 px-3 max-w-md">
                        <div className="font-medium text-slate-200 line-clamp-1">{ord.serviceName}</div>
                        <div className="flex items-center gap-2 text-slate-400 mt-0.5">
                          <span>{ord.platform}</span>
                          <span aria-hidden="true">·</span>
                          <a
                            href={ord.link}
                            target="_blank"
                            rel="noreferrer"
                            className="text-indigo-400 hover:underline inline-flex items-center gap-1 truncate max-w-[240px]"
                          >
                            <span className="truncate">{ord.link}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        </div>
                        {ord.refillId && (
                          <div className="text-slate-400 mt-1 font-mono tabular-nums">
                            Mã bảo hành #{ord.refillId} · Trạng thái: {ord.refillStatus || 'Đang xử lý'}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-300">
                        {ord.start_count.toLocaleString('vi-VN')}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                        <div className="text-slate-200 font-medium">
                          {delivered.toLocaleString('vi-VN')} / {ord.quantity.toLocaleString('vi-VN')}{' '}
                          <span className="text-slate-400">({progressPercent}%)</span>
                        </div>
                        <div className="w-28 ml-auto h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1">
                          <div
                            className={`h-full transition-all ${
                              ord.status === 'Completed'
                                ? 'bg-emerald-500'
                                : ord.status === 'Canceled'
                                ? 'bg-red-500'
                                : 'bg-indigo-500'
                            }`}
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-slate-100 whitespace-nowrap">
                        {ord.charge.toLocaleString('vi-VN')} đ
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">{renderStatusText(ord.status)}</td>
                      <td className="py-3 pl-3 pr-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSyncStatus([ord.id])}
                            title="Cập nhật tiến độ đơn hàng"
                            className="px-2.5 py-1 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded transition-colors whitespace-nowrap shrink-0"
                          >
                            Cập nhật
                          </button>

                          {ord.refillSupported && (
                            <button
                              type="button"
                              onClick={() => handleRefill([ord.id])}
                              disabled={loadingAction === `refill_${ord.id}`}
                              title="Yêu cầu bảo hành bù tụt"
                              className="px-2.5 py-1 text-xs font-medium text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-800/60 rounded transition-colors whitespace-nowrap shrink-0"
                            >
                              Bảo hành
                            </button>
                          )}

                          {ord.refillId && (
                            <button
                              type="button"
                              onClick={() => handleCheckRefillStatus(ord.id)}
                              title="Kiểm tra trạng thái bảo hành"
                              className="px-2 py-1 text-xs font-medium text-sky-300 bg-sky-950/60 hover:bg-sky-900/60 border border-sky-800/60 rounded transition-colors whitespace-nowrap shrink-0"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {ord.cancelSupported &&
                            ord.status !== 'Completed' &&
                            ord.status !== 'Canceled' &&
                            ord.status !== 'Refunded' && (
                              <button
                                type="button"
                                onClick={() => handleCancelOrder([ord.id])}
                                disabled={loadingAction === `cancel_${ord.id}`}
                                title="Hủy đơn và hoàn tiền tự động"
                                className="px-2.5 py-1 text-xs font-medium text-red-300 bg-red-950/60 hover:bg-red-900/60 border border-red-800/60 rounded transition-colors whitespace-nowrap shrink-0"
                              >
                                Hủy
                              </button>
                            )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
