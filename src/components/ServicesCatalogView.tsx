import React, { useState, useMemo } from 'react';
import { SmmService, SocialPlatform, UserAccount } from '../types/smm';
import { apiFetch } from '../utils/api';
import { Search, ShieldCheck, RotateCcw, ShoppingCart, Edit3, Check, X } from 'lucide-react';

interface ServicesCatalogViewProps {
  services: SmmService[];
  activeUser: UserAccount;
  onSelectServiceForOrder: (serviceId: number) => void;
  onStateUpdated: (state: any, message: string) => void;
  onError: (msg: string) => void;
}

const PLATFORMS: { label: string; value: SocialPlatform | 'ALL' }[] = [
  { label: 'Tất cả', value: 'ALL' },
  { label: 'Facebook', value: 'Facebook' },
  { label: 'TikTok', value: 'TikTok' },
  { label: 'Instagram', value: 'Instagram' },
  { label: 'YouTube', value: 'YouTube' },
  { label: 'Telegram', value: 'Telegram' },
  { label: 'Shopee', value: 'Shopee' },
];

export const ServicesCatalogView: React.FC<ServicesCatalogViewProps> = ({
  services,
  activeUser,
  onSelectServiceForOrder,
  onStateUpdated,
  onError,
}) => {
  const [platformFilter, setPlatformFilter] = useState<SocialPlatform | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editRate, setEditRate] = useState<number>(0);

  const isAdmin = activeUser.role === 'admin';

  const filteredServices = useMemo(() => {
    return services.filter((svc) => {
      if (!isAdmin && !svc.active) return false;
      if (platformFilter !== 'ALL' && svc.platform !== platformFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          String(svc.service).includes(q) ||
          svc.name.toLowerCase().includes(q) ||
          svc.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [services, isAdmin, platformFilter, searchQuery]);

  const handleSaveRate = async (serviceId: number) => {
    try {
      const response = await apiFetch(`/api/services/${serviceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rate: editRate }),
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        onError(data.error || 'Không thể cập nhật giá');
      } else {
        setEditingId(null);
        onStateUpdated(data, `Đã cập nhật giá bán lẻ cho dịch vụ #${serviceId}!`);
      }
    } catch (err: any) {
      onError(err?.message || 'Lỗi máy chủ');
    }
  };

  const handleToggleActive = async (svc: SmmService) => {
    try {
      const response = await apiFetch(`/api/services/${svc.service}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !svc.active }),
      });
      const data = await response.json();
      if (response.ok) {
        onStateUpdated(data, `Đã ${!svc.active ? 'bật' : 'ẩn'} dịch vụ #${svc.service}`);
      }
    } catch (err: any) {
      onError(err?.message || 'Lỗi cập nhật trạng thái dịch vụ');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {PLATFORMS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPlatformFilter(p.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                platformFilter === p.value
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo ID dịch vụ, tên máy chủ..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-xs text-slate-400">
                <th className="py-3 pl-4 pr-2 font-medium">ID</th>
                <th className="py-3 px-3 font-medium">Tên dịch vụ & Danh mục</th>
                {isAdmin && <th className="py-3 px-3 font-medium text-right">Giá vốn API</th>}
                <th className="py-3 px-3 font-medium text-right">Giá bán / 1.000</th>
                <th className="py-3 px-3 font-medium text-right">Min / Max</th>
                <th className="py-3 px-3 font-medium">Tính năng API</th>
                <th className="py-3 pl-3 pr-4 font-medium text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-xs">
              {filteredServices.map((svc) => (
                <tr key={svc.service} className={`hover:bg-slate-800/40 ${!svc.active ? 'opacity-50' : ''}`}>
                  <td className="py-3 pl-4 pr-2 font-mono tabular-nums font-semibold text-indigo-400">
                    #{svc.service}
                  </td>
                  <td className="py-3 px-3 max-w-md">
                    <div className="font-medium text-slate-100">{svc.name}</div>
                    <div className="text-slate-400 mt-0.5">
                      {svc.category} · Loại: {svc.type} · TB: {svc.averageTime}
                    </div>
                  </td>
                  {isAdmin && (
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-400 whitespace-nowrap">
                      {svc.originalRate.toLocaleString('vi-VN')} đ
                    </td>
                  )}
                  <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-slate-100 whitespace-nowrap">
                    {editingId === svc.service ? (
                      <div className="inline-flex items-center gap-1">
                        <input
                          type="number"
                          value={editRate}
                          onChange={(e) => setEditRate(Number(e.target.value))}
                          className="w-24 bg-slate-950 border border-indigo-500 rounded px-2 py-1 text-right text-xs font-mono text-slate-100"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveRate(svc.service)}
                          className="p-1 text-emerald-400 hover:bg-slate-800 rounded"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="p-1 text-slate-400 hover:bg-slate-800 rounded"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span>{svc.rate.toLocaleString('vi-VN')} đ</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-300 whitespace-nowrap">
                    {svc.min.toLocaleString('vi-VN')} / {svc.max.toLocaleString('vi-VN')}
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap text-slate-300">
                    <div className="flex items-center gap-2">
                      {svc.refill ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400">
                          <ShieldCheck className="w-3.5 h-3.5" /> Refill
                        </span>
                      ) : (
                        <span className="text-slate-500">No Refill</span>
                      )}
                      <span aria-hidden="true">·</span>
                      {svc.cancel ? (
                        <span className="inline-flex items-center gap-1 text-sky-400">
                          <RotateCcw className="w-3.5 h-3.5" /> Cancel
                        </span>
                      ) : (
                        <span className="text-slate-500">No Cancel</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 pl-3 pr-4 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      {isAdmin && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(svc.service);
                              setEditRate(svc.rate);
                            }}
                            className="px-2 py-1 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 rounded transition-colors"
                            title="Sửa giá bán"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleActive(svc)}
                            className="px-2 py-1 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 rounded transition-colors"
                          >
                            {svc.active ? 'Ẩn' : 'Hiện'}
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => onSelectServiceForOrder(svc.service)}
                        className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded transition-colors whitespace-nowrap shrink-0"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        Đặt đơn
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
