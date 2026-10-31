import React, { useState, useMemo, useEffect } from 'react';
import { SmmService, SocialPlatform, UserAccount, SmmOrder } from '../types/smm';
import { apiFetch } from '../utils/api';
import {
  Send,
  Layers,
  Clock,
  ShieldCheck,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Search,
  ClipboardCheck,
  ArrowRight,
} from 'lucide-react';

interface NewOrderViewProps {
  services: SmmService[];
  activeUser: UserAccount;
  preselectedServiceId?: number | null;
  preselectedPlatform?: SocialPlatform | 'ALL';
  preselectedCategory?: string | null;
  onOrderCreated: (state: any, message: string) => void;
  onError: (msg: string) => void;
  onNavigateWallet: () => void;
  onNavigateOrders?: () => void;
}

const PLATFORMS: { label: string; value: SocialPlatform | 'ALL' }[] = [
  { label: 'Tất cả nền tảng', value: 'ALL' },
  { label: 'Facebook', value: 'Facebook' },
  { label: 'TikTok', value: 'TikTok' },
  { label: 'Instagram', value: 'Instagram' },
  { label: 'YouTube', value: 'YouTube' },
  { label: 'Telegram', value: 'Telegram' },
  { label: 'Shopee', value: 'Shopee' },
];

export const NewOrderView: React.FC<NewOrderViewProps> = ({
  services,
  activeUser,
  preselectedServiceId,
  preselectedPlatform,
  preselectedCategory,
  onOrderCreated,
  onError,
  onNavigateWallet,
  onNavigateOrders,
}) => {
  const activeServices = useMemo(() => services.filter((s) => s.active), [services]);

  const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatform | 'ALL'>(
    preselectedPlatform || 'ALL'
  );
  const [selectedCategory, setSelectedCategory] = useState<string>(preselectedCategory || '');
  const [selectedServiceId, setSelectedServiceId] = useState<number>(
    preselectedServiceId || (activeServices[0]?.service ?? 1)
  );
  const [quickSearch, setQuickSearch] = useState<string>('');

  const [link, setLink] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1000);
  const [comments, setComments] = useState<string>('');
  const [dripfeedEnabled, setDripfeedEnabled] = useState<boolean>(false);
  const [runs, setRuns] = useState<number>(2);
  const [interval, setIntervalVal] = useState<number>(30);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [lastCreatedOrder, setLastCreatedOrder] = useState<SmmOrder | null>(null);

  // Sync when user selects a platform or category from the Left Sidebar Menu
  useEffect(() => {
    if (preselectedPlatform) {
      setSelectedPlatform(preselectedPlatform);
    }
  }, [preselectedPlatform]);

  useEffect(() => {
    if (preselectedCategory) {
      setSelectedCategory(preselectedCategory);
    }
  }, [preselectedCategory]);

  // Sync preselected service when jumping from catalog
  useEffect(() => {
    if (preselectedServiceId) {
      const target = activeServices.find((s) => s.service === preselectedServiceId);
      if (target) {
        setSelectedPlatform(target.platform);
        setSelectedCategory(target.category);
        setSelectedServiceId(target.service);
        setQuantity(Math.max(target.min, 500));
      }
    }
  }, [preselectedServiceId, activeServices]);

  const filteredByPlatform = useMemo(() => {
    let list = activeServices;
    if (selectedPlatform !== 'ALL') {
      list = list.filter((s) => s.platform === selectedPlatform);
    }
    if (quickSearch.trim()) {
      const q = quickSearch.toLowerCase();
      list = list.filter(
        (s) =>
          String(s.service).includes(q) ||
          s.name.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q)
      );
    }
    return list;
  }, [activeServices, selectedPlatform, quickSearch]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    filteredByPlatform.forEach((s) => set.add(s.category));
    return Array.from(set);
  }, [filteredByPlatform]);

  useEffect(() => {
    if (!categories.includes(selectedCategory)) {
      const nextCat = categories[0] || '';
      setSelectedCategory(nextCat);
    }
  }, [categories, selectedCategory]);

  const servicesInCategory = useMemo(() => {
    if (quickSearch.trim()) return filteredByPlatform;
    if (!selectedCategory) return filteredByPlatform;
    return filteredByPlatform.filter((s) => s.category === selectedCategory);
  }, [filteredByPlatform, selectedCategory, quickSearch]);

  useEffect(() => {
    if (!servicesInCategory.some((s) => s.service === selectedServiceId)) {
      const first = servicesInCategory[0];
      if (first) {
        setSelectedServiceId(first.service);
        setQuantity(Math.max(first.min, Math.min(1000, first.max)));
        setDripfeedEnabled(false);
      }
    }
  }, [servicesInCategory, selectedServiceId]);

  const currentService = useMemo(
    () => activeServices.find((s) => s.service === selectedServiceId) || activeServices[0],
    [activeServices, selectedServiceId]
  );

  const commentLinesCount = useMemo(() => {
    if (!comments.trim()) return 0;
    return comments
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean).length;
  }, [comments]);

  const baseQuantity = useMemo(() => {
    if (!currentService) return 0;
    if (currentService.type === 'Custom Comments') return commentLinesCount;
    if (currentService.type === 'Package') return 1000;
    return Number(quantity) || 0;
  }, [currentService, commentLinesCount, quantity]);

  const effectiveQuantity = useMemo(() => {
    if (dripfeedEnabled && currentService?.dripfeed && runs > 1) {
      return baseQuantity * runs;
    }
    return baseQuantity;
  }, [baseQuantity, dripfeedEnabled, currentService, runs]);

  const totalCharge = useMemo(() => {
    if (!currentService) return 0;
    const discount = 1 - (activeUser.discountPercent || 0) / 100;
    return Math.round((effectiveQuantity / 1000) * currentService.rate * discount);
  }, [currentService, effectiveQuantity, activeUser.discountPercent]);

  const isInsufficientBalance = totalCharge > activeUser.balance;
  const isOutOfBounds =
    currentService && (effectiveQuantity < currentService.min || effectiveQuantity > currentService.max);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentService) return;
    if (!link.trim()) {
      onError('Vui lòng nhập đường dẫn (URL) bài viết, video hoặc trang cá nhân cần tăng tương tác.');
      return;
    }
    if (isOutOfBounds) {
      onError(
        `Số lượng cần nằm trong giới hạn từ ${currentService.min.toLocaleString('vi-VN')} đến ${currentService.max.toLocaleString('vi-VN')}.`
      );
      return;
    }
    if (isInsufficientBalance) {
      onError('Số dư ví không đủ để thanh toán đơn hàng này. Vui lòng nạp thêm tiền.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await apiFetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: currentService.service,
          link: link.trim(),
          quantity: baseQuantity,
          comments: currentService.type === 'Custom Comments' ? comments : undefined,
          runs: dripfeedEnabled && currentService.dripfeed ? runs : undefined,
          interval: dripfeedEnabled && currentService.dripfeed ? interval : undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        onError(data.error || 'Lỗi khi tạo đơn hàng qua SMM API v2');
      } else {
        setLink('');
        setComments('');
        setLastCreatedOrder(data.order);
        onOrderCreated(
          data.state,
          `Khởi tạo đơn hàng #${data.order.id} thành công! Hệ thống đang chạy tự động.`
        );
      }
    } catch (err: any) {
      onError(err?.message || 'Không thể kết nối máy chủ');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Instant Order Receipt Banner when an order was just placed */}
      {lastCreatedOrder && (
        <div className="bg-emerald-950/40 border border-emerald-800/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <ClipboardCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5 text-xs">
              <div className="font-semibold text-emerald-200 text-sm">
                Đặt đơn thành công · Mã đơn hàng #{lastCreatedOrder.id}
              </div>
              <div className="text-slate-300">
                {lastCreatedOrder.serviceName} · Số lượng:{' '}
                <strong className="font-mono">{lastCreatedOrder.quantity.toLocaleString('vi-VN')}</strong> · Chi phí:{' '}
                <strong className="font-mono text-emerald-400">
                  {lastCreatedOrder.charge.toLocaleString('vi-VN')}đ
                </strong>
              </div>
              <div className="text-slate-400 truncate max-w-xl">Link: {lastCreatedOrder.link}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onNavigateOrders && (
              <button
                type="button"
                onClick={onNavigateOrders}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors whitespace-nowrap"
              >
                Theo dõi tiến độ <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setLastCreatedOrder(null)}
              className="px-3 py-2 text-xs text-slate-300 hover:text-white bg-slate-800/80 rounded-lg"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* Segmented Platform Selector + Quick Search Input */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-2 bg-slate-900 border border-slate-800 rounded-xl">
        <div className="flex flex-wrap items-center gap-1">
          {PLATFORMS.map((p) => {
            const active = selectedPlatform === p.value;
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => {
                  setSelectedPlatform(p.value);
                  setQuickSearch('');
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        <div className="relative w-full md:w-64 shrink-0">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={quickSearch}
            onChange={(e) => setQuickSearch(e.target.value)}
            placeholder="Tìm nhanh gói (VD: like, view, sub)..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Column: Order Form (7 cols) */}
        <form
          onSubmit={handleSubmit}
          className="xl:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5"
        >
          <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-100">
                {selectedPlatform === 'ALL'
                  ? 'Tạo đơn tăng tương tác mới'
                  : `Buff Tương Tác ${selectedPlatform}`}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Chọn gói dịch vụ, dán đường link cần chạy và nhập số lượng
              </p>
            </div>
            <span className="text-xs font-mono tabular-nums text-indigo-400">
              Mã gói: #{currentService?.service ?? '--'}
            </span>
          </div>

          {/* Category Select */}
          {!quickSearch.trim() && (
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">Danh mục dịch vụ</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Service Select */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-slate-300">Chọn máy chủ (Server)</label>
              <span className="text-xs text-slate-400 font-mono tabular-nums">
                {servicesInCategory.length} máy chủ phù hợp
              </span>
            </div>
            <select
              value={selectedServiceId}
              onChange={(e) => {
                const id = Number(e.target.value);
                setSelectedServiceId(id);
                const s = activeServices.find((x) => x.service === id);
                if (s) {
                  setQuantity(Math.max(s.min, Math.min(1000, s.max)));
                }
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              {servicesInCategory.map((svc) => (
                <option key={svc.service} value={svc.service}>
                  [Server #{svc.service}] {svc.name} — {svc.rate.toLocaleString('vi-VN')}đ / 1.000 lượt
                </option>
              ))}
            </select>
          </div>

          {/* Link Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300">
              Đường dẫn (Link bài viết / Video / Trang cá nhân cần buff)
            </label>
            <input
              type="text"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://www.facebook.com/... hoặc https://www.tiktok.com/@user/video/..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Conditional Custom Comments or Standard Quantity */}
          {currentService?.type === 'Custom Comments' ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-slate-300">
                  Nội dung bình luận (Mỗi dòng 1 câu bình luận)
                </label>
                <span className="text-xs font-mono tabular-nums text-indigo-400">
                  Số lượng đếm tự động: {commentLinesCount} bình luận
                </span>
              </div>
              <textarea
                rows={5}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder={'Sản phẩm chất lượng quá shop ơi!\nGiá bao nhiêu vậy ạ?\nĐã nhận hàng, giao siêu nhanh nhé.'}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-slate-300">Số lượng cần mua</label>
                {currentService && (
                  <span className="text-xs font-mono tabular-nums text-slate-400">
                    Tối thiểu: {currentService.min.toLocaleString('vi-VN')} · Tối đa:{' '}
                    {currentService.max.toLocaleString('vi-VN')}
                  </span>
                )}
              </div>
              <input
                type="number"
                min={currentService?.min || 10}
                max={currentService?.max || 1000000}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                disabled={currentService?.type === 'Package'}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm font-mono tabular-nums text-slate-100 focus:outline-none focus:border-indigo-500"
              />
              {/* Quick Quantity Presets */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {[100, 500, 1000, 2000, 5000, 10000].map((preset) => {
                  const isActivePreset = quantity === preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setQuantity(preset)}
                      className={`px-2.5 py-1 text-xs font-mono tabular-nums border rounded transition-colors whitespace-nowrap shrink-0 ${
                        isActivePreset
                          ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200 font-semibold'
                          : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800'
                      }`}
                    >
                      {preset.toLocaleString('vi-VN')}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Optional Drip-Feed Automation (runs / interval) */}
          {currentService?.dripfeed && (
            <div className="pt-2 border-t border-slate-800 space-y-3">
              <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={dripfeedEnabled}
                  onChange={(e) => setDripfeedEnabled(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-0"
                />
                <span className="text-xs font-medium text-slate-200">
                  Bật chế độ chia nhỏ tự động (Drip-feed: chia làm nhiều đợt tăng tự nhiên)
                </span>
              </label>

              {dripfeedEnabled && (
                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Số đợt chạy (Runs)</label>
                    <input
                      type="number"
                      min={2}
                      max={100}
                      value={runs}
                      onChange={(e) => setRuns(Math.max(2, Number(e.target.value)))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm font-mono tabular-nums text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Khoảng cách mỗi đợt (Phút)</label>
                    <input
                      type="number"
                      min={5}
                      max={1440}
                      value={interval}
                      onChange={(e) => setIntervalVal(Math.max(1, Number(e.target.value)))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm font-mono tabular-nums text-slate-100"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Live Charge Summary & Action */}
          <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs text-slate-400">Tổng thanh toán</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-emerald-400 mt-0.5">
                {totalCharge.toLocaleString('vi-VN')} <span className="text-sm font-normal text-slate-400">VND</span>
              </div>
              <div className="text-xs text-slate-400 font-mono tabular-nums mt-0.5">
                Số lượng: {effectiveQuantity.toLocaleString('vi-VN')} · Đơn giá:{' '}
                {currentService?.rate.toLocaleString('vi-VN')}đ/1.000
              </div>
            </div>

            <div className="flex items-center gap-3">
              {isInsufficientBalance && (
                <button
                  type="button"
                  onClick={onNavigateWallet}
                  className="px-4 py-2.5 text-xs font-medium text-amber-300 bg-amber-950/60 border border-amber-800/70 rounded-lg hover:bg-amber-900/60 transition-colors whitespace-nowrap shrink-0"
                >
                  Nạp thêm tiền
                </button>
              )}
              <button
                type="submit"
                disabled={submitting || isInsufficientBalance || Boolean(isOutOfBounds)}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:pointer-events-none rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <Send className="w-4 h-4" />
                {submitting ? 'Đang xử lý đơn...' : 'Thanh Toán & Tạo Đơn'}
              </button>
            </div>
          </div>
        </form>

        {/* Right Column: Service Technical Spec & Guidelines (5 cols) */}
        <div className="xl:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
          {currentService ? (
            <>
              <div className="border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>{currentService.platform}</span>
                  <span aria-hidden="true">·</span>
                  <span>Server #{currentService.service}</span>
                  <span aria-hidden="true">·</span>
                  <span>Loại: {currentService.type}</span>
                </div>
                <h3 className="text-base font-semibold text-slate-100 mt-1.5">{currentService.name}</h3>
              </div>

              {/* Clean unboxed metadata specifications */}
              <div className="grid grid-cols-2 gap-4 py-1 border-b border-slate-800 pb-5">
                <div>
                  <div className="text-xs text-slate-400">Đơn giá / 1.000 lượt</div>
                  <div className="text-base font-semibold font-mono tabular-nums text-slate-100 mt-1">
                    {currentService.rate.toLocaleString('vi-VN')} đ
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Thời gian lên trung bình</div>
                  <div className="text-base font-semibold text-slate-100 mt-1 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span>{currentService.averageTime}</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Mua tối thiểu / Tối đa</div>
                  <div className="text-sm font-mono tabular-nums text-slate-200 mt-1">
                    {currentService.min.toLocaleString('vi-VN')} — {currentService.max.toLocaleString('vi-VN')}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Chế độ bảo hành</div>
                  <div className="text-xs text-slate-200 mt-1.5 flex items-center gap-2">
                    {currentService.refill ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400">
                        <ShieldCheck className="w-3.5 h-3.5" /> Có Bảo hành
                      </span>
                    ) : (
                      <span className="text-slate-400">Không BH</span>
                    )}
                    <span aria-hidden="true">·</span>
                    {currentService.cancel ? (
                      <span className="inline-flex items-center gap-1 text-sky-400">
                        <RotateCcw className="w-3.5 h-3.5" /> Hỗ trợ Hủy
                      </span>
                    ) : (
                      <span className="text-slate-400">Không Hủy</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Detailed service notes */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-300">Thông tin máy chủ & Hướng dẫn</div>
                <p className="text-sm text-slate-300 leading-relaxed">{currentService.description}</p>
              </div>

              <div className="pt-3 border-t border-slate-800 space-y-2 text-xs text-slate-400">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    Bài viết, video hoặc tài khoản cần bật chế độ <strong className="text-slate-200">Công khai (Public)</strong> trước khi đặt đơn.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    Vui lòng không mua cùng lúc nhiều đơn cho 1 link khi đơn cũ chưa chạy xong.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Layers className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span>
                    Theo dõi số lượng bắt đầu và tiến độ hoàn thành trong mục <strong className="text-slate-200">Lịch sử đơn hàng</strong> ở menu bên trái.
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="text-sm text-slate-400">Đang tải thông tin dịch vụ...</div>
          )}
        </div>
      </div>
    </div>
  );
};
