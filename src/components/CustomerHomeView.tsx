import React from 'react';
import { SmmOrder, SmmService, SocialPlatform, UserAccount } from '../types/smm';
import {
  PlusCircle,
  Wallet,
  ClipboardList,
  ShieldCheck,
  Zap,
  ArrowRight,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';

interface CustomerHomeViewProps {
  activeUser: UserAccount;
  services: SmmService[];
  orders: SmmOrder[];
  onSelectPlatform: (platform: SocialPlatform, category?: string) => void;
  onNavigateWallet: () => void;
  onNavigateOrders: () => void;
  onNavigateMassOrder: () => void;
}

const PLATFORM_CARDS: {
  platform: SocialPlatform;
  title: string;
  subtitle: string;
  startingPrice: string;
  accentClass: string;
}[] = [
  {
    platform: 'Facebook',
    title: 'Buff Tương Tác Facebook',
    subtitle: 'Tăng Like bài viết, Follow cá nhân/Fanpage, Bình luận seeding, Mắt Livestream',
    startingPrice: 'Từ 14đ / lượt',
    accentClass: 'border-blue-500/30 hover:border-blue-500/70',
  },
  {
    platform: 'TikTok',
    title: 'Buff Xu Hướng TikTok',
    subtitle: 'Tăng Tim video, View đề xuất xu hướng, Follow mở Live & TikTok Shop',
    startingPrice: 'Từ 1đ / view',
    accentClass: 'border-pink-500/30 hover:border-pink-500/70',
  },
  {
    platform: 'Instagram',
    title: 'Buff Tương Tác Instagram',
    subtitle: 'Tăng Follow tài khoản Việt/Ngoại, Tăng Tim ảnh & Reels tốc độ cao',
    startingPrice: 'Từ 10đ / lượt',
    accentClass: 'border-purple-500/30 hover:border-purple-500/70',
  },
  {
    platform: 'YouTube',
    title: 'Buff Kênh YouTube',
    subtitle: 'Tăng View đề xuất tự nhiên, Tăng Subscribe bật kiếm tiền an toàn',
    startingPrice: 'Từ 34đ / view',
    accentClass: 'border-red-500/30 hover:border-red-500/70',
  },
  {
    platform: 'Telegram',
    title: 'Buff Member Telegram',
    subtitle: 'Tăng thành viên Group / Channel, Tăng lượt xem bài đăng tự động',
    startingPrice: 'Từ 24đ / member',
    accentClass: 'border-sky-500/30 hover:border-sky-500/70',
  },
  {
    platform: 'Shopee',
    title: 'Buff Gian Hàng Shopee',
    subtitle: 'Tăng Follow Shop & Lượt thích sản phẩm đẩy top tìm kiếm tự nhiên',
    startingPrice: 'Từ 42đ / lượt',
    accentClass: 'border-orange-500/30 hover:border-orange-500/70',
  },
];

export const CustomerHomeView: React.FC<CustomerHomeViewProps> = ({
  activeUser,
  services,
  orders,
  onSelectPlatform,
  onNavigateWallet,
  onNavigateOrders,
  onNavigateMassOrder,
}) => {
  const userOrders = orders.filter((o) => o.userId === activeUser.id || activeUser.role === 'admin');
  const runningCount = userOrders.filter(
    (o) => o.status === 'In progress' || o.status === 'Pending' || o.status === 'Processing'
  ).length;
  const completedCount = userOrders.filter((o) => o.status === 'Completed').length;

  return (
    <div className="space-y-6">
      {/* Welcome Banner & Quick Actions for Customer */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="text-xs font-medium text-indigo-400">
            Hệ thống tăng tương tác mạng xã hội tự động 24/7
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-100">
            Xin chào, {activeUser.fullName}
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Chọn dịch vụ mạng xã hội ở <strong className="text-slate-200">Bảng menu bên trái</strong> hoặc bấm trực tiếp vào các danh mục bên dưới để khởi tạo đơn hàng. Mọi đơn hàng đều được xử lý tự động qua máy chủ tốc độ cao.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => onSelectPlatform('Facebook')}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            Tạo đơn mới ngay
          </button>
          <button
            type="button"
            onClick={onNavigateWallet}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-800/70 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Wallet className="w-4 h-4" />
            Nạp tiền vào ví
          </button>
          <button
            type="button"
            onClick={onNavigateMassOrder}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            Đặt đơn hàng loạt
          </button>
        </div>
      </div>

      {/* 4-Column Customer Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400">Số dư hiện có</div>
          <div className="text-xl font-bold font-mono tabular-nums text-emerald-400 mt-1">
            {activeUser.balance.toLocaleString('vi-VN')} đ
          </div>
          <div className="text-xs text-slate-500 mt-1">Cấp bậc: {activeUser.tier}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400">Đơn đang chạy</div>
          <div className="text-xl font-bold font-mono tabular-nums text-amber-400 mt-1">
            {runningCount} đơn
          </div>
          <div className="text-xs text-slate-500 mt-1">Tự động cập nhật tiến độ</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400">Đơn đã hoàn thành</div>
          <div className="text-xl font-bold font-mono tabular-nums text-slate-100 mt-1">
            {completedCount} đơn
          </div>
          <div className="text-xs text-slate-500 mt-1">Hỗ trợ bảo hành (Refill)</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400">Tổng chi tiêu</div>
          <div className="text-xl font-bold font-mono tabular-nums text-indigo-400 mt-1">
            {activeUser.totalSpent.toLocaleString('vi-VN')} đ
          </div>
          <div className="text-xs text-slate-500 mt-1">Đã nạp: {activeUser.totalDeposited.toLocaleString('vi-VN')}đ</div>
        </div>
      </div>

      {/* Service Categories Grid for Customer */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-100">
            Chọn nhanh nền tảng cần tăng tương tác
          </h3>
          <span className="text-xs text-slate-400 font-mono tabular-nums">
            {services.filter((s) => s.active).length} máy chủ đang hoạt động
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {PLATFORM_CARDS.map((card) => {
            const count = services.filter((s) => s.active && s.platform === card.platform).length;
            return (
              <button
                key={card.platform}
                type="button"
                onClick={() => onSelectPlatform(card.platform)}
                className={`text-left bg-slate-900 border ${card.accentClass} rounded-xl p-5 transition-colors flex flex-col justify-between gap-4 group`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-semibold text-slate-200">{card.platform}</span>
                    <span className="font-mono tabular-nums text-indigo-400">{count} gói dịch vụ</span>
                  </div>
                  <h4 className="text-base font-semibold text-slate-100 group-hover:text-indigo-400 transition-colors">
                    {card.title}
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">{card.subtitle}</p>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="font-mono tabular-nums text-emerald-400 font-medium">
                    {card.startingPrice}
                  </span>
                  <span className="inline-flex items-center gap-1 font-medium text-slate-200 group-hover:text-white">
                    Chọn dịch vụ <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Split: Recent Orders + System Announcements */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-indigo-400" />
              Đơn hàng vừa đặt gần đây
            </h3>
            <button
              type="button"
              onClick={onNavigateOrders}
              className="text-xs text-indigo-400 hover:underline font-medium"
            >
              Xem tất cả ({userOrders.length})
            </button>
          </div>

          <div className="divide-y divide-slate-800/70 text-xs">
            {userOrders.slice(0, 4).map((ord) => (
              <div key={ord.id} className="py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-medium text-slate-200 truncate">
                    #{ord.id} · {ord.serviceName}
                  </div>
                  <div className="text-slate-400 truncate mt-0.5 font-mono tabular-nums">
                    SL: {ord.quantity.toLocaleString('vi-VN')} · Bắt đầu: {ord.start_count} · Còn lại: {ord.remains}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono tabular-nums font-semibold text-slate-100">
                    {ord.charge.toLocaleString('vi-VN')} đ
                  </div>
                  <div className="mt-0.5">
                    {ord.status === 'Completed' ? (
                      <span className="text-emerald-400 inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Hoàn thành
                      </span>
                    ) : (
                      <span className="text-amber-400 inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {ord.status}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Thông báo & Cam kết dịch vụ
            </h3>
          </div>

          <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
            <div className="pb-3 border-b border-slate-800/70">
              <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-emerald-400" /> Xử lý đơn tự động 100% (24/7)
              </div>
              <p className="text-slate-400 mt-1">
                Ngay sau khi bấm tạo đơn, hệ thống lập tức gửi lệnh tới máy chủ mà không cần chờ duyệt thủ công.
              </p>
            </div>

            <div className="pb-3 border-b border-slate-800/70">
              <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" /> Bảo hành tự động & Hoàn tiền đơn hủy
              </div>
              <p className="text-slate-400 mt-1">
                Các máy chủ có nhãn Refill hỗ trợ bấm nút Bảo hành bù tụt trực tiếp trong mục Lịch sử đơn hàng.
              </p>
            </div>

            <div>
              <div className="font-semibold text-slate-100">Nạp tiền tự động theo tên tài khoản</div>
              <p className="text-slate-400 mt-1">
                Nội dung chuyển khoản ngân hàng được cá nhân hóa tự động theo tên đăng nhập (@{activeUser.username}) giúp cộng số dư chính xác 24/7.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
