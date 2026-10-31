import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AppStateResponse, SocialPlatform } from './types/smm';
import { apiFetch, setSessionToken } from './utils/api';
import { CustomerHomeView } from './components/CustomerHomeView';
import { NewOrderView } from './components/NewOrderView';
import { MassOrderView } from './components/MassOrderView';
import { OrderHistoryView } from './components/OrderHistoryView';
import { ServicesCatalogView } from './components/ServicesCatalogView';
import { WalletView } from './components/WalletView';
import { AdminProvidersView } from './components/AdminProvidersView';
import {
  Home,
  PlusCircle,
  Layers,
  ClipboardList,
  ListFilter,
  Wallet,
  Server,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  X,
  Menu,
  LogIn,
  LogOut,
  UserPlus,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';

type NavTab =
  | 'home'
  | 'new_order'
  | 'mass_order'
  | 'orders'
  | 'services'
  | 'wallet'
  | 'admin_providers';

const PLATFORM_MENU_ITEMS: {
  platform: SocialPlatform;
  label: string;
  dotColor: string;
}[] = [
  { platform: 'Facebook', label: 'Buff Facebook', dotColor: 'text-blue-400' },
  { platform: 'TikTok', label: 'Buff TikTok', dotColor: 'text-pink-400' },
  { platform: 'Instagram', label: 'Buff Instagram', dotColor: 'text-purple-400' },
  { platform: 'YouTube', label: 'Buff YouTube', dotColor: 'text-red-400' },
  { platform: 'Telegram', label: 'Buff Telegram', dotColor: 'text-sky-400' },
  { platform: 'Shopee', label: 'Buff Shopee', dotColor: 'text-orange-400' },
];

interface ToastNotification {
  id: number;
  type: 'success' | 'error';
  title: string;
  text: string;
}

export default function App() {
  const [appState, setAppState] = useState<AppStateResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatform | 'ALL'>('Facebook');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [preselectedServiceId, setPreselectedServiceId] = useState<number | null>(null);
  const [expandedPlatform, setExpandedPlatform] = useState<SocialPlatform | null>('Facebook');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [toast, setToast] = useState<ToastNotification | null>(null);

  // Auth Modal State (Login / Register)
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authUsername, setAuthUsername] = useState<string>('');
  const [authPassword, setAuthPassword] = useState<string>('');
  const [authFullName, setAuthFullName] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [authSubmitting, setAuthSubmitting] = useState<boolean>(false);
  const [authModalError, setAuthModalError] = useState<string | null>(null);
  const [authModalSuccess, setAuthModalSuccess] = useState<string | null>(null);

  const showToast = useCallback(
    (type: 'success' | 'error', text: string, customTitle?: string) => {
      if (!text) return;
      const id = Date.now();
      setToast({
        id,
        type,
        title: customTitle || (type === 'success' ? 'Thao tác thành công!' : 'Thông báo lỗi'),
        text,
      });
      setTimeout(() => {
        setToast((prev) => (prev?.id === id ? null : prev));
      }, 5000);
    },
    []
  );

  const fetchState = useCallback(async () => {
    try {
      const res = await apiFetch('/api/state');
      if (res.ok) {
        const data = await res.json();
        setAppState(data);
      }
    } catch (err) {
      console.error('Failed to load state:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  const handleStateUpdated = (nextState: AppStateResponse, message: string) => {
    setAppState(nextState);
    if (message) {
      showToast('success', message);
    }
  };

  const openAuthModal = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setAuthModalError(null);
    setAuthModalSuccess(null);
    setAuthModalOpen(true);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthSubmitting(true);
    setAuthModalError(null);
    setAuthModalSuccess(null);

    try {
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const res = await apiFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: authUsername,
          password: authPassword,
          fullName: authFullName,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        const errMsg = data.error || 'Tên đăng nhập hoặc mật khẩu không chính xác';
        setAuthModalError(errMsg);
        setAuthSubmitting(false);
      } else {
        setSessionToken(data.token);
        setAppState(data.state);

        const loggedUser = data.state.activeUser;
        const successBannerText =
          authMode === 'login'
            ? `Đăng nhập thành công! Xin chào ${loggedUser.fullName} (@${loggedUser.username}).`
            : `Đăng ký tài khoản thành công! Chào mừng ${loggedUser.fullName} đến với hệ thống.`;

        setAuthModalSuccess(successBannerText);

        setTimeout(() => {
          setAuthModalOpen(false);
          setAuthSubmitting(false);
          setAuthModalSuccess(null);
          setAuthUsername('');
          setAuthPassword('');
          setAuthFullName('');

          if (loggedUser.role === 'admin') {
            setActiveTab('admin_providers');
            showToast(
              'success',
              `Chào mừng Quản trị viên (${loggedUser.fullName})! Đã mở khóa bảng điều khiển Quản trị & Ngân hàng.`,
              'Đăng nhập Quản trị thành công!'
            );
          } else {
            setActiveTab('home');
            showToast(
              'success',
              `Xin chào ${loggedUser.fullName} (@${loggedUser.username}) · Số dư khả dụng: ${loggedUser.balance.toLocaleString('vi-VN')}đ`,
              authMode === 'login' ? 'Đăng nhập thành công!' : 'Đăng ký tài khoản thành công!'
            );
          }
        }, 650);
      }
    } catch (err: any) {
      setAuthModalError(err?.message || 'Lỗi kết nối máy chủ');
      setAuthSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      const res = await apiFetch('/api/auth/logout', { method: 'POST' });
      setSessionToken('');
      if (res.ok) {
        const data = await res.json();
        setAppState(data.state);
        setActiveTab('home');
        showToast(
          'success',
          'Đã đăng xuất khỏi tài khoản hiện tại và trở về trang chủ khách hàng.',
          'Đăng xuất thành công'
        );
      }
    } catch {
      setSessionToken('');
      fetchState();
    }
  };

  const categoriesByPlatform = useMemo(() => {
    const map = new Map<SocialPlatform, string[]>();
    if (!appState) return map;
    for (const svc of appState.services) {
      if (!svc.active) continue;
      const list = map.get(svc.platform) || [];
      if (!list.includes(svc.category)) {
        list.push(svc.category);
      }
      map.set(svc.platform, list);
    }
    return map;
  }, [appState]);

  const handleSelectPlatformFromMenu = (platform: SocialPlatform, category?: string) => {
    setSelectedPlatform(platform);
    setSelectedCategory(category || null);
    setPreselectedServiceId(null);
    setExpandedPlatform(platform);
    setActiveTab('new_order');
    setMobileMenuOpen(false);
  };

  if (loading || !appState) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="h-5 w-48 bg-slate-800 rounded animate-pulse" />
          <div className="h-3.5 w-full bg-slate-800/70 rounded animate-pulse" />
          <div className="h-3.5 w-3/4 bg-slate-800/70 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  const { activeUser, users, providers, bankConfig, services, orders, transactions } = appState;
  const isAdmin = activeUser.role === 'admin';
  const activeServicesCount = services.filter((s) => s.active).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Floating High-Visibility Toast Notification (Top-Right Overlay) */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-4 right-4 z-[60] max-w-md w-[calc(100vw-2rem)] sm:w-96 shadow-2xl rounded-xl border p-4 transition-all bg-slate-900/95 backdrop-blur border-slate-700"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              {toast.type === 'success' ? (
                <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              ) : (
                <div className="p-1.5 rounded-lg bg-red-500/20 text-red-400 shrink-0 mt-0.5">
                  <AlertCircle className="w-5 h-5" />
                </div>
              )}
              <div className="space-y-1">
                <div
                  className={`text-sm font-bold ${
                    toast.type === 'success' ? 'text-emerald-300' : 'text-red-300'
                  }`}
                >
                  {toast.title}
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">{toast.text}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="text-slate-400 hover:text-white p-1 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Top Bar Contract: Strictly 3 zones separated by gap-8 */}
      <header className="flex items-center justify-between gap-8 px-5 py-3 bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
        {/* Zone 1: Brand Title */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="sm:hidden p-1.5 text-slate-300 hover:text-white bg-slate-800 rounded-lg"
            aria-label="Mở menu"
          >
            <Menu className="w-4 h-4" />
          </button>
          <a
            href="#home"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('home');
            }}
            className="text-base font-bold tracking-tight text-slate-100 font-display whitespace-nowrap shrink-0"
          >
            SMM.VIN PRO
          </a>
        </div>

        {/* Zone 2: 5 Concise Single-Line Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-400">
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'home' ? 'text-slate-100 underline underline-offset-8 decoration-indigo-500' : ''
            }`}
          >
            Trang chủ
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('new_order')}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'new_order' ? 'text-slate-100 underline underline-offset-8 decoration-indigo-500' : ''
            }`}
          >
            Mua tương tác
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('mass_order')}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'mass_order' ? 'text-slate-100 underline underline-offset-8 decoration-indigo-500' : ''
            }`}
          >
            Đơn hàng loạt
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'orders' ? 'text-slate-100 underline underline-offset-8 decoration-indigo-500' : ''
            }`}
          >
            Lịch sử đơn ({orders.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('services')}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'services' ? 'text-slate-100 underline underline-offset-8 decoration-indigo-500' : ''
            }`}
          >
            Bảng giá dịch vụ
          </button>
        </nav>

        {/* Zone 3: 1 Primary Action Button */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('wallet')}
            className="px-3.5 py-1.5 text-xs font-semibold font-mono tabular-nums text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            Ví: {activeUser.balance.toLocaleString('vi-VN')} đ · Nạp tiền
          </button>
        </div>
      </header>

      {/* Main Workspace with Persistent Left Sidebar Menu */}
      <div className="flex-1 flex flex-row relative">
        {/* BẢNG MENU CHỌN BÊN TRÁI */}
        <aside
          className={`${
            mobileMenuOpen ? 'fixed inset-y-0 left-0 z-50 w-72 shadow-2xl' : 'hidden sm:flex sm:w-64 md:w-72'
          } shrink-0 bg-slate-900 border-r border-slate-800 flex-col justify-between overflow-y-auto select-none`}
        >
          <div className="p-4 space-y-5">
            {/* Customer Profile Summary Box inside Left Sidebar */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-100 truncate">{activeUser.fullName}</div>
                  <div className="text-xs text-slate-400 font-mono truncate">@{activeUser.username}</div>
                </div>
                {mobileMenuOpen && (
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    className="sm:hidden text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="flex items-baseline justify-between border-t border-slate-800/80 pt-2">
                <span className="text-xs text-slate-400">Số dư ví:</span>
                <span className="text-sm font-bold font-mono tabular-nums text-emerald-400">
                  {activeUser.balance.toLocaleString('vi-VN')} đ
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('wallet');
                  setMobileMenuOpen(false);
                }}
                className="w-full py-1.5 px-3 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                <Wallet className="w-3.5 h-3.5" />
                Nạp Tiền Tự Động
              </button>
            </div>

            {/* Section 1: Menu Chính Cho Khách */}
            <div className="space-y-1">
              <div className="px-2.5 pb-1 text-xs font-semibold text-slate-400">
                Menu Khách Hàng
              </div>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('home');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                  activeTab === 'home'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Home className="w-4 h-4 shrink-0" />
                <span>Trang chủ & Tổng quan</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('wallet');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                  activeTab === 'wallet'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Wallet className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>Nạp tiền Ngân hàng</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('orders');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                  activeTab === 'orders'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <ClipboardList className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>Lịch sử đơn & Bảo hành</span>
                </span>
                <span className="font-mono tabular-nums text-xs opacity-80">{orders.length}</span>
              </button>
            </div>

            {/* Section 2: Bảng Menu Chọn Dịch Vụ Buff Tương Tác */}
            <div className="space-y-1 pt-2 border-t border-slate-800">
              <div className="px-2.5 pb-1 text-xs font-semibold text-slate-400">
                Danh Mục Buff Tương Tác
              </div>

              {PLATFORM_MENU_ITEMS.map((item) => {
                const subCategories = categoriesByPlatform.get(item.platform) || [];
                const isExpanded = expandedPlatform === item.platform;
                const isPlatformSelected = activeTab === 'new_order' && selectedPlatform === item.platform;

                return (
                  <div key={item.platform} className="space-y-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        if (expandedPlatform === item.platform && activeTab === 'new_order') {
                          setExpandedPlatform(null);
                        } else {
                          handleSelectPlatformFromMenu(item.platform);
                        }
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                        isPlatformSelected
                          ? 'bg-slate-800 text-white border border-slate-700'
                          : 'text-slate-200 hover:bg-slate-800/70 hover:text-white'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <PlusCircle className={`w-4 h-4 shrink-0 ${item.dotColor}`} />
                        <span>{item.label}</span>
                      </span>
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                      )}
                    </button>

                    {isExpanded && subCategories.length > 0 && (
                      <div className="pl-5 pr-1 py-1 space-y-0.5 border-l border-slate-800 ml-4">
                        {subCategories.map((cat) => {
                          const isCatActive =
                            activeTab === 'new_order' &&
                            selectedPlatform === item.platform &&
                            selectedCategory === cat;
                          const shortCatName = cat.replace(`${item.platform} - `, '');
                          return (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => handleSelectPlatformFromMenu(item.platform, cat)}
                              className={`w-full text-left px-2.5 py-1.5 text-xs rounded-md transition-colors truncate ${
                                isCatActive
                                  ? 'bg-indigo-600 text-white font-medium'
                                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                              }`}
                            >
                              {shortCatName}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              <button
                type="button"
                onClick={() => {
                  setActiveTab('mass_order');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap mt-1 ${
                  activeTab === 'mass_order'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Layers className="w-4 h-4 shrink-0 text-indigo-400" />
                <span>Đặt đơn hàng loạt (Mass)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('services');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                  activeTab === 'services'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <ListFilter className="w-4 h-4 shrink-0" />
                  <span>Bảng giá dịch vụ</span>
                </span>
                <span className="font-mono tabular-nums text-xs opacity-80">{activeServicesCount}</span>
              </button>
            </div>

            {/* Section 3: Admin Menu — Strictly hidden from customers unless authenticated with Admin password */}
            {isAdmin && (
              <div className="space-y-1 pt-2 border-t border-slate-800">
                <div className="px-2.5 pb-1 text-xs font-semibold text-amber-400">
                  Quản Trị Chủ Web (Admin)
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('admin_providers');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                    activeTab === 'admin_providers'
                      ? 'bg-amber-600 text-white'
                      : 'text-amber-300 bg-amber-950/40 hover:bg-amber-900/50 border border-amber-800/50'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Server className="w-4 h-4 shrink-0" />
                    <span>Cấu hình API & STK Ngân hàng</span>
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Bottom Account Authentication Controls */}
          <div className="p-4 border-t border-slate-800 bg-slate-950/60 space-y-2.5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Phiên đăng nhập:</span>
              <span className="font-mono font-semibold text-slate-200">@{activeUser.username}</span>
            </div>

            {isAdmin ? (
              <button
                type="button"
                onClick={handleLogout}
                className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium text-red-300 bg-red-950/50 hover:bg-red-900/60 border border-red-800/60 rounded-lg transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Đăng xuất quyền Admin
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => openAuthModal('login')}
                  className="inline-flex items-center justify-center gap-1.5 py-2 px-2.5 text-xs font-medium text-slate-100 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors whitespace-nowrap"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Đăng nhập
                </button>
                <button
                  type="button"
                  onClick={() => openAuthModal('register')}
                  className="inline-flex items-center justify-center gap-1.5 py-2 px-2.5 text-xs font-medium text-indigo-300 bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-800/60 rounded-lg transition-colors whitespace-nowrap"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Đăng ký
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* Right Main Content Area */}
        <main className="flex-1 p-5 sm:p-6 space-y-6 min-w-0 max-w-6xl">
          {activeTab === 'home' && (
            <CustomerHomeView
              activeUser={activeUser}
              services={services}
              orders={orders}
              onSelectPlatform={(platform, category) => handleSelectPlatformFromMenu(platform, category)}
              onNavigateWallet={() => setActiveTab('wallet')}
              onNavigateOrders={() => setActiveTab('orders')}
              onNavigateMassOrder={() => setActiveTab('mass_order')}
            />
          )}

          {activeTab === 'new_order' && (
            <NewOrderView
              services={services}
              activeUser={activeUser}
              preselectedServiceId={preselectedServiceId}
              preselectedPlatform={selectedPlatform}
              preselectedCategory={selectedCategory}
              onOrderCreated={handleStateUpdated}
              onError={(msg) => showToast('error', msg)}
              onNavigateWallet={() => setActiveTab('wallet')}
              onNavigateOrders={() => setActiveTab('orders')}
            />
          )}

          {activeTab === 'mass_order' && (
            <MassOrderView
              services={services}
              activeUser={activeUser}
              onMassOrderCompleted={(nextState, msg) => {
                handleStateUpdated(nextState, msg);
                setActiveTab('orders');
              }}
              onError={(msg) => showToast('error', msg)}
            />
          )}

          {activeTab === 'orders' && (
            <OrderHistoryView
              orders={orders}
              onStateUpdated={handleStateUpdated}
              onError={(msg) => showToast('error', msg)}
              onNavigateNewOrder={() => setActiveTab('new_order')}
            />
          )}

          {activeTab === 'services' && (
            <ServicesCatalogView
              services={services}
              activeUser={activeUser}
              onSelectServiceForOrder={(serviceId) => {
                setPreselectedServiceId(serviceId);
                setActiveTab('new_order');
              }}
              onStateUpdated={handleStateUpdated}
              onError={(msg) => showToast('error', msg)}
            />
          )}

          {activeTab === 'wallet' && (
            <WalletView
              activeUser={activeUser}
              bankConfig={bankConfig}
              transactions={transactions}
              onStateUpdated={handleStateUpdated}
              onError={(msg) => showToast('error', msg)}
            />
          )}

          {activeTab === 'admin_providers' && isAdmin && (
            <AdminProvidersView
              providers={providers}
              bankConfig={bankConfig}
              users={users}
              onStateUpdated={handleStateUpdated}
              onError={(msg) => showToast('error', msg)}
            />
          )}
        </main>
      </div>

      {/* Login / Register Modal with In-Modal Success & Error Feedback */}
      {authModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-indigo-400" />
                <h3 className="text-base font-semibold text-slate-100">
                  {authMode === 'login' ? 'Đăng nhập Tài khoản Hệ thống' : 'Đăng ký Tài khoản Khách hàng'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAuthModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950 border border-slate-800 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setAuthModalError(null);
                  setAuthModalSuccess(null);
                }}
                className={`py-2 rounded font-medium transition-colors ${
                  authMode === 'login' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Đăng nhập
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('register');
                  setAuthModalError(null);
                  setAuthModalSuccess(null);
                }}
                className={`py-2 rounded font-medium transition-colors ${
                  authMode === 'register' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Đăng ký khách mới
              </button>
            </div>

            {authModalSuccess && (
              <div className="p-3.5 rounded-lg bg-emerald-950/80 border border-emerald-700 text-emerald-200 text-xs flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-emerald-300">Đăng nhập thành công!</div>
                  <div className="mt-0.5">{authModalSuccess}</div>
                </div>
              </div>
            )}

            {authModalError && (
              <div className="p-3.5 rounded-lg bg-red-950/80 border border-red-800 text-red-200 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-red-300">Không thể xác thực</div>
                  <div className="mt-0.5">{authModalError}</div>
                </div>
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-4 text-xs">
              {authMode === 'register' && (
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Họ và tên hiển thị</label>
                  <input
                    type="text"
                    required
                    value={authFullName}
                    onChange={(e) => setAuthFullName(e.target.value)}
                    placeholder="VD: Trần Văn An"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-medium mb-1">Tên đăng nhập (Username)</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={authUsername}
                  onChange={(e) => setAuthUsername(e.target.value)}
                  placeholder={authMode === 'login' ? 'Nhập tên đăng nhập...' : 'Tối thiểu 3 ký tự...'}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Mật khẩu (Password)</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="Nhập mật khẩu..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-3.5 pr-10 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={authSubmitting || Boolean(authModalSuccess)}
                className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 rounded-lg transition-colors"
              >
                {authModalSuccess
                  ? 'Đăng nhập thành công! Đang vào hệ thống...'
                  : authSubmitting
                  ? 'Đang kiểm tra thông tin...'
                  : authMode === 'login'
                  ? 'Đăng Nhập Ngay'
                  : 'Đăng Ký Tài Khoản Mới'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
