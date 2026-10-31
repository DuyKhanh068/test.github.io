import React, { useState, useMemo } from 'react';
import { SmmService, UserAccount } from '../types/smm';
import { apiFetch } from '../utils/api';
import { Layers, Play, FileText, CheckCircle2, AlertTriangle } from 'lucide-react';

interface MassOrderViewProps {
  services: SmmService[];
  activeUser: UserAccount;
  onMassOrderCompleted: (state: any, message: string) => void;
  onError: (msg: string) => void;
}

export const MassOrderView: React.FC<MassOrderViewProps> = ({
  services,
  activeUser,
  onMassOrderCompleted,
  onError,
}) => {
  const [rawLines, setRawLines] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [lastErrors, setLastErrors] = useState<string[]>([]);

  const parsedPreview = useMemo(() => {
    const lines = rawLines
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    return lines.map((line, index) => {
      const parts = line.split('|').map((s) => s.trim());
      const serviceId = Number(parts[0]);
      const link = parts[1] || '';
      const quantity = Number(parts[2] || 0);
      const svc = services.find((s) => s.service === serviceId && s.active);

      if (parts.length < 3 || !svc || !link || !quantity) {
        return {
          lineNumber: index + 1,
          valid: false,
          serviceId,
          serviceName: svc ? svc.name : 'Không tìm thấy ID dịch vụ',
          link,
          quantity,
          charge: 0,
          reason: !svc ? 'ID dịch vụ không hợp lệ' : 'Sai cú pháp hoặc thiếu số lượng',
        };
      }

      if (quantity < svc.min || quantity > svc.max) {
        return {
          lineNumber: index + 1,
          valid: false,
          serviceId,
          serviceName: svc.name,
          link,
          quantity,
          charge: 0,
          reason: `Số lượng ngoài phạm vi (${svc.min} - ${svc.max})`,
        };
      }

      const charge = Math.round((quantity / 1000) * svc.rate);
      return {
        lineNumber: index + 1,
        valid: true,
        serviceId,
        serviceName: svc.name,
        link,
        quantity,
        charge,
        reason: 'Hợp lệ',
      };
    });
  }, [rawLines, services]);

  const validItems = parsedPreview.filter((i) => i.valid);
  const totalEstimatedCharge = validItems.reduce((sum, i) => sum + i.charge, 0);

  const insertSampleBatch = () => {
    const sample = [
      '1 | https://www.facebook.com/photo/?fbid=1092837412 | 1000',
      '5 | https://www.tiktok.com/@creator.vn/video/7391823019 | 2000',
      '6 | https://www.tiktok.com/@creator.vn/video/7391823019 | 5000',
      '9 | https://www.instagram.com/p/C9x812abc/ | 500',
    ].join('\n');
    setRawLines(sample);
    setLastErrors([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validItems.length === 0) {
      onError('Chưa có dòng đơn hàng hợp lệ nào để gửi.');
      return;
    }
    if (totalEstimatedCharge > activeUser.balance) {
      onError('Số dư ví không đủ để thanh toán toàn bộ lô đơn hàng này.');
      return;
    }

    setSubmitting(true);
    setLastErrors([]);
    try {
      const response = await apiFetch('/api/orders/mass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawLines }),
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        onError(data.error || 'Lỗi khi gửi đơn hàng loạt');
      } else {
        if (data.errors && data.errors.length > 0) {
          setLastErrors(data.errors);
        }
        if (data.createdCount > 0) {
          setRawLines('');
          onMassOrderCompleted(
            data.state,
            `Đã khởi tạo thành công ${data.createdCount} đơn hàng loạt qua SMM API v2!`
          );
        }
      }
    } catch (err: any) {
      onError(err?.message || 'Lỗi kết nối máy chủ');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <form
        onSubmit={handleSubmit}
        className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5"
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Đặt đơn hàng loạt (Mass Order)</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Nhập mỗi đơn hàng trên 1 dòng theo chuẩn: <code className="font-mono text-indigo-400">service_id | link | quantity</code>
            </p>
          </div>
          <button
            type="button"
            onClick={insertSampleBatch}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <FileText className="w-3.5 h-3.5" />
            Chèn mẫu 4 đơn
          </button>
        </div>

        <div className="space-y-2">
          <textarea
            rows={9}
            value={rawLines}
            onChange={(e) => setRawLines(e.target.value)}
            placeholder={
              '1 | https://www.facebook.com/post/123456 | 1000\n5 | https://www.tiktok.com/@user/video/987654 | 2500\n9 | https://www.instagram.com/brand/ | 500'
            }
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-4 text-sm font-mono text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {lastErrors.length > 0 && (
          <div className="p-3.5 bg-red-950/40 border border-red-900/60 rounded-lg space-y-1 text-xs text-red-300">
            <div className="font-semibold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" /> Một số dòng bị từ chối:
            </div>
            {lastErrors.map((err, i) => (
              <div key={i}>{err}</div>
            ))}
          </div>
        )}

        <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400">
              Hợp lệ: <span className="font-mono tabular-nums text-emerald-400">{validItems.length}</span> /{' '}
              <span className="font-mono tabular-nums">{parsedPreview.length}</span> dòng
            </div>
            <div className="text-xl font-bold font-mono tabular-nums text-slate-100 mt-0.5">
              Tổng chi phí: {totalEstimatedCharge.toLocaleString('vi-VN')} đ
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || validItems.length === 0}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Play className="w-4 h-4" />
            {submitting ? 'Đang xử lý lô đơn...' : `Đặt ${validItems.length} Đơn Hàng Loạt`}
          </button>
        </div>
      </form>

      {/* Right Column: Live Batch Validation Table */}
      <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            Kiểm tra cú pháp trực tiếp
          </h3>
          <span className="text-xs text-slate-400 font-mono tabular-nums">{parsedPreview.length} dòng</span>
        </div>

        {parsedPreview.length === 0 ? (
          <div className="py-10 text-center space-y-3">
            <p className="text-sm text-slate-400">
              Nhập danh sách đơn ở khung bên trái hoặc bấm nút chèn mẫu để xem bảng phân tích chi phí từng dòng.
            </p>
            <button
              type="button"
              onClick={insertSampleBatch}
              className="px-3.5 py-2 text-xs font-medium text-indigo-300 bg-indigo-950/60 border border-indigo-800/60 rounded-lg hover:bg-indigo-900/60 transition-colors"
            >
              Thử nghiệm với 4 đơn mẫu
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-xs text-slate-400">
                  <th className="py-2 pr-2 font-medium">#</th>
                  <th className="py-2 px-2 font-medium">Dịch vụ</th>
                  <th className="py-2 px-2 font-medium text-right">SL</th>
                  <th className="py-2 pl-2 font-medium text-right">Thành tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-xs">
                {parsedPreview.map((item) => (
                  <tr key={item.lineNumber} className="hover:bg-slate-800/30">
                    <td className="py-2.5 pr-2 font-mono tabular-nums text-slate-400">{item.lineNumber}</td>
                    <td className="py-2.5 px-2">
                      <div className="font-medium text-slate-200 truncate max-w-[180px]">{item.serviceName}</div>
                      <div className="text-slate-400 truncate max-w-[180px]">
                        {item.valid ? (
                          <span className="text-emerald-400 inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> {item.link}
                          </span>
                        ) : (
                          <span className="text-red-400">{item.reason}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono tabular-nums text-slate-300">
                      {item.quantity > 0 ? item.quantity.toLocaleString('vi-VN') : '--'}
                    </td>
                    <td className="py-2.5 pl-2 text-right font-mono tabular-nums font-medium text-slate-100">
                      {item.valid ? `${item.charge.toLocaleString('vi-VN')}đ` : '--'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
