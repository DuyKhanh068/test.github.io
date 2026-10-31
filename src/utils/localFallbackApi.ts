import {
  ApiProvider,
  AppStateResponse,
  BankConfig,
  SmmOrder,
  SmmService,
  SocialPlatform,
  UserAccount,
  WalletTransaction,
} from '../types/smm';

interface StoredUser extends UserAccount {
  passwordPlain: string;
}

interface LocalDatabase {
  activeUserId: string;
  nextOrderId: number;
  nextRefillId: number;
  bankConfig: BankConfig;
  users: StoredUser[];
  providers: ApiProvider[];
  services: SmmService[];
  orders: SmmOrder[];
  transactions: WalletTransaction[];
}

const DB_STORAGE_KEY = 'smmvin_static_db_v2';
const SESSION_MAP_KEY = 'smmvin_static_sessions_v2';

const DEFAULT_BANK_CONFIG: BankConfig = {
  bankName: 'MBBank (Ngân hàng Quân Đội)',
  bankShortCode: 'MB',
  accountNumber: '999988886868',
  accountHolder: 'NGUYEN MINH QUAN',
  transferPrefix: 'NAPTIEN',
  minDeposit: 10000,
};

const SANDBOX_UPSTREAM_SERVICES = [
  {
    service: '101',
    name: 'Facebook Tăng Like Bài Viết [Việt Nam Thật] - Lên Nhanh, Có Bảo Hành',
    type: 'Default',
    category: 'Facebook - Tăng Like Bài Viết',
    rate: '14000',
    min: '50',
    max: '50000',
    refill: true,
    cancel: true,
    dripfeed: true,
    average_time: '15 phút',
    desc: 'Tương tác từ tài khoản người dùng Việt Nam thật. Hỗ trợ bài viết công khai, ảnh đại diện, ảnh bìa. Tự động nhận diện UID từ URL.',
  },
  {
    service: '102',
    name: 'Facebook Tăng Follow Trang Cá Nhân / Fanpage [Max Speed - BH 30 Ngày]',
    type: 'Default',
    category: 'Facebook - Tăng Sub / Follow',
    rate: '22000',
    min: '100',
    max: '200000',
    refill: true,
    cancel: true,
    dripfeed: false,
    average_time: '32 phút',
    desc: 'Tăng người theo dõi thật cho Profile hoặc Fanpage mới lập. Có nút Bảo hành (Refill) tự động trong 30 ngày nếu tụt.',
  },
  {
    service: '103',
    name: 'Facebook Tăng Bình Luận Theo Nội Dung Tự Soạn [Nick Việt Có Avatar]',
    type: 'Custom Comments',
    category: 'Facebook - Bình Luận & Chia Sẻ',
    rate: '180000',
    min: '10',
    max: '2000',
    refill: false,
    cancel: true,
    dripfeed: false,
    average_time: '10 phút',
    desc: 'Nhập mỗi bình luận trên 1 dòng. Hệ thống tự động đếm số dòng để tính số lượng cần chạy.',
  },
  {
    service: '104',
    name: 'Facebook Tăng Mắt Xem Livestream [Ổn Định 30 Phút - Không Tụt]',
    type: 'Default',
    category: 'Facebook - Mắt Livestream & View Video',
    rate: '65000',
    min: '50',
    max: '10000',
    refill: false,
    cancel: true,
    dripfeed: false,
    average_time: '2 phút',
    desc: 'Tăng mắt xem trực tiếp ngay khi đang phát Livestream. Lên ngay sau 1-2 phút đặt đơn.',
  },
  {
    service: '201',
    name: 'TikTok Tăng Tim (Like) Video [Server VIP 1 - Lên Tức Thì, Không Tụt]',
    type: 'Default',
    category: 'TikTok - Tăng Tim & View Video',
    rate: '12000',
    min: '100',
    max: '500000',
    refill: true,
    cancel: true,
    dripfeed: true,
    average_time: '5 phút',
    desc: 'Tăng tim video TikTok tốc độ cao, giúp đẩy video lên xu hướng (For You Page). Bảo hành tự động 30 ngày.',
  },
  {
    service: '202',
    name: 'TikTok Tăng View Video [Đề Xuất Xu Hướng - Cực Rẻ]',
    type: 'Default',
    category: 'TikTok - Tăng Tim & View Video',
    rate: '800',
    min: '1000',
    max: '10000000',
    refill: true,
    cancel: false,
    dripfeed: true,
    average_time: '3 phút',
    desc: 'Tăng lượt xem video TikTok tốc độ cực nhanh, giá siêu rẻ phù hợp cày chỉ số kênh.',
  },
  {
    service: '203',
    name: 'TikTok Tăng Follow Kênh [Tài Khoản Việt Nam - Đủ Điều Kiện Mở Live & TikTok Shop]',
    type: 'Default',
    category: 'TikTok - Tăng Follow & Mắt Live',
    rate: '38000',
    min: '100',
    max: '100000',
    refill: true,
    cancel: true,
    dripfeed: false,
    average_time: '45 phút',
    desc: 'Hỗ trợ đủ 1.000 Follow để bật Livestream và gắn giỏ hàng TikTok Shop an toàn tuyệt đối.',
  },
  {
    service: '204',
    name: 'TikTok Bình Luận Seeding Video Theo Yêu Cầu [Tăng Chuyển Đổi Bán Hàng]',
    type: 'Custom Comments',
    category: 'TikTok - Bình Luận & Yêu Thích',
    rate: '210000',
    min: '10',
    max: '5000',
    refill: false,
    cancel: true,
    dripfeed: false,
    average_time: '12 phút',
    desc: 'Nhập danh sách câu bình luận seeding bán hàng (mỗi dòng 1 bình luận).',
  },
  {
    service: '301',
    name: 'Instagram Tăng Follow Tài Khoản [Real Global / VN - Bảo Hành 60 Ngày]',
    type: 'Default',
    category: 'Instagram - Tăng Follow & Like',
    rate: '26000',
    min: '50',
    max: '500000',
    refill: true,
    cancel: true,
    dripfeed: true,
    average_time: '20 phút',
    desc: 'Tăng người theo dõi Instagram chất lượng cao, có ảnh đại diện và bài đăng. Hỗ trợ nút Refill tự động.',
  },
  {
    service: '302',
    name: 'Instagram Tăng Like Ảnh / Reels [Tốc Độ Cao 10K/Giờ]',
    type: 'Default',
    category: 'Instagram - Tăng Follow & Like',
    rate: '9500',
    min: '50',
    max: '200000',
    refill: true,
    cancel: true,
    dripfeed: true,
    average_time: '6 phút',
    desc: 'Tăng lượt thích cho bài đăng ảnh hoặc Reels công khai trên Instagram.',
  },
  {
    service: '401',
    name: 'YouTube Tăng View Video [Nguồn Đề Xuất Tự Nhiên - Bảo Hành Trọn Đời]',
    type: 'Default',
    category: 'YouTube - View, Sub & Giờ Xem',
    rate: '34000',
    min: '500',
    max: '1000000',
    refill: true,
    cancel: true,
    dripfeed: false,
    average_time: '2 giờ',
    desc: 'Lượt xem thực từ tìm kiếm và đề xuất YouTube, thời gian giữ chân cao, an toàn bật kiếm tiền.',
  },
  {
    service: '402',
    name: 'YouTube Tăng Subscribe Kênh [Tốc Độ 200-500 Sub/Ngày - Bật Kiếm Tiền]',
    type: 'Default',
    category: 'YouTube - View, Sub & Giờ Xem',
    rate: '320000',
    min: '50',
    max: '50000',
    refill: true,
    cancel: true,
    dripfeed: false,
    average_time: '6 giờ',
    desc: 'Tăng người đăng ký kênh YouTube thật kèm lượt xem ngắn để chống quét.',
  },
  {
    service: '501',
    name: 'Telegram Tăng Member Group / Channel [Không Tụt 30 Ngày - Lên Nhanh]',
    type: 'Default',
    category: 'Telegram - Member & View Post',
    rate: '24000',
    min: '100',
    max: '200000',
    refill: true,
    cancel: true,
    dripfeed: false,
    average_time: '15 phút',
    desc: 'Tăng thành viên cho Channel hoặc Group công khai trên Telegram.',
  },
  {
    service: '601',
    name: 'Shopee Tăng Follow Gian Hàng & Tim Sản Phẩm [Tài Khoản Mua Hàng Thật]',
    type: 'Default',
    category: 'Shopee - Tăng Follow & Lượt Thích',
    rate: '42000',
    min: '100',
    max: '50000',
    refill: true,
    cancel: true,
    dripfeed: false,
    average_time: '40 phút',
    desc: 'Tăng độ uy tín cho Shop mới trên Shopee, đẩy thứ hạng tìm kiếm tự nhiên.',
  },
];

function detectPlatform(categoryAndName: string): SocialPlatform {
  const s = categoryAndName.toLowerCase();
  if (s.includes('facebook') || s.includes('fb ') || s.includes('fanpage')) return 'Facebook';
  if (s.includes('tiktok') || s.includes('tik tok') || s.includes('douyin')) return 'TikTok';
  if (s.includes('instagram') || s.includes('ig ') || s.includes('threads')) return 'Instagram';
  if (s.includes('youtube') || s.includes('ytb')) return 'YouTube';
  if (s.includes('telegram') || s.includes('tele')) return 'Telegram';
  if (s.includes('shopee') || s.includes('lazada')) return 'Shopee';
  if (s.includes('twitter') || s.includes(' x ')) return 'Twitter';
  return 'Other';
}

function createInitialDb(): LocalDatabase {
  const defaultProviderId = 'prov_smmvin_main';
  const markup = 25;
  const exchangeRate = 1;

  const services: SmmService[] = SANDBOX_UPSTREAM_SERVICES.map((raw, idx) => {
    const orig = Number(raw.rate);
    const retail = Math.round(orig * exchangeRate * (1 + markup / 100));
    return {
      service: idx + 1,
      providerId: defaultProviderId,
      providerServiceId: Number(raw.service),
      platform: detectPlatform(`${raw.category} ${raw.name}`),
      category: raw.category,
      name: raw.name,
      type: (raw.type as SmmService['type']) || 'Default',
      originalRate: orig,
      rate: retail,
      min: Number(raw.min),
      max: Number(raw.max),
      refill: Boolean(raw.refill),
      cancel: Boolean(raw.cancel),
      dripfeed: Boolean(raw.dripfeed),
      averageTime: raw.average_time || '15 phút',
      description: raw.desc || 'Dịch vụ chất lượng cao tự động 24/7 qua giao thức SMM API v2.',
      active: true,
    };
  });

  const now = new Date().toISOString();
  const oneHourAgo = new Date(Date.now() - 3600 * 1000).toISOString();
  const threeHoursAgo = new Date(Date.now() - 3 * 3600 * 1000).toISOString();

  return {
    activeUserId: 'usr_customer_1',
    nextOrderId: 10005,
    nextRefillId: 5002,
    bankConfig: { ...DEFAULT_BANK_CONFIG },
    users: [
      {
        id: 'usr_customer_1',
        username: 'khachhang',
        passwordPlain: '123456',
        fullName: 'Nguyễn Minh Quân (Khách hàng)',
        email: 'minhquan.agency@gmail.com',
        role: 'customer',
        tier: 'Agency',
        discountPercent: 0,
        balance: 2450000,
        totalDeposited: 5000000,
        totalSpent: 2550000,
        apiKey: 'smmpro_live_98f2a4c71e3b90d4a112bc89f01e',
      },
      {
        id: 'usr_admin_1',
        username: 'admin',
        passwordPlain: 'admin123456',
        fullName: 'Quản Trị Viên Hệ Thống (Root Admin)',
        email: 'admin@smmvin-panel.vn',
        role: 'admin',
        tier: 'Admin',
        discountPercent: 0,
        balance: 18500000,
        totalDeposited: 20000000,
        totalSpent: 1500000,
        apiKey: 'smmpro_admin_77d1e9a04c8b22f5e601ab34d99c',
      },
    ],
    providers: [
      {
        id: defaultProviderId,
        name: 'SMM.VIN (Nguồn Chính SMM API v2)',
        url: 'https://smm.vin/api/v2',
        apiKey: 'smmvin_sandbox_key_v2',
        currency: 'VND',
        balance: 14850000,
        exchangeRate: 1,
        priceMarkupPercent: markup,
        useSandbox: true,
        status: 'Connected',
        lastSyncedAt: now,
      },
    ],
    services,
    orders: [
      {
        id: 10001,
        userId: 'usr_customer_1',
        providerId: defaultProviderId,
        providerName: 'SMM.VIN (Nguồn Chính SMM API v2)',
        providerOrderId: 8849201,
        serviceId: 1,
        serviceName: services[0].name,
        platform: 'Facebook',
        link: 'https://www.facebook.com/photo/?fbid=9823412983412',
        quantity: 2000,
        charge: (2000 / 1000) * services[0].rate,
        originalCost: (2000 / 1000) * services[0].originalRate,
        start_count: 142,
        remains: 0,
        status: 'Completed',
        currency: 'VND',
        refillSupported: true,
        cancelSupported: true,
        refillId: 5001,
        refillStatus: 'Completed',
        createdAt: threeHoursAgo,
        updatedAt: oneHourAgo,
      },
      {
        id: 10002,
        userId: 'usr_customer_1',
        providerId: defaultProviderId,
        providerName: 'SMM.VIN (Nguồn Chính SMM API v2)',
        providerOrderId: 8849512,
        serviceId: 5,
        serviceName: services[4].name,
        platform: 'TikTok',
        link: 'https://www.tiktok.com/@channel.vn/video/73891204981234',
        quantity: 5000,
        charge: (5000 / 1000) * services[4].rate,
        originalCost: (5000 / 1000) * services[4].originalRate,
        start_count: 890,
        remains: 1450,
        status: 'In progress',
        currency: 'VND',
        refillSupported: true,
        cancelSupported: true,
        createdAt: oneHourAgo,
        updatedAt: now,
      },
    ],
    transactions: [
      {
        id: 'tx_101',
        userId: 'usr_customer_1',
        type: 'deposit',
        amount: 2500000,
        balanceAfter: 2450000,
        note: 'Nạp tiền tự động qua VietQR Ngân hàng MBBank (NAPTIEN KHACHHANG)',
        createdAt: threeHoursAgo,
      },
    ],
  };
}

function loadLocalDb(): LocalDatabase {
  try {
    const raw = localStorage.getItem(DB_STORAGE_KEY);
    if (!raw) {
      const initial = createInitialDb();
      localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw) as LocalDatabase;
    if (!parsed.bankConfig) {
      parsed.bankConfig = { ...DEFAULT_BANK_CONFIG };
    }
    return parsed;
  } catch {
    return createInitialDb();
  }
}

function saveLocalDb(db: LocalDatabase): void {
  try {
    localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(db));
  } catch (e) {
    console.error('Failed to save local DB:', e);
  }
}

function loadSessions(): Record<string, string> {
  try {
    const raw = localStorage.getItem(SESSION_MAP_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveSessions(sessions: Record<string, string>): void {
  try {
    localStorage.setItem(SESSION_MAP_KEY, JSON.stringify(sessions));
  } catch {
    // ignore
  }
}

function resolveUser(db: LocalDatabase, token: string): StoredUser {
  const sessions = loadSessions();
  if (token && sessions[token]) {
    const u = db.users.find((x) => x.id === sessions[token]);
    if (u) return u;
  }
  return db.users.find((u) => u.role === 'customer') || db.users[0];
}

function sanitizeUser(u: StoredUser): UserAccount {
  const { passwordPlain, ...rest } = u;
  return rest;
}

function getSanitizedState(db: LocalDatabase, user: StoredUser): AppStateResponse {
  const isAdmin = user.role === 'admin';
  return {
    activeUser: sanitizeUser(user),
    users: isAdmin ? db.users.map(sanitizeUser) : [sanitizeUser(user)],
    providers: isAdmin ? db.providers : [],
    bankConfig: db.bankConfig || DEFAULT_BANK_CONFIG,
    services: db.services.map((s) => ({
      ...s,
      originalRate: isAdmin ? s.originalRate : 0,
    })),
    orders: isAdmin ? db.orders : db.orders.filter((o) => o.userId === user.id),
    transactions: isAdmin
      ? db.transactions
      : db.transactions.filter((t) => t.userId === user.id),
  };
}

function jsonResponse(body: any, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function callUpstreamClientSide(
  provider: ApiProvider,
  params: Record<string, string | number | undefined>,
  db: LocalDatabase
): Promise<any> {
  const action = String(params.action || '');
  if (provider.useSandbox) {
    switch (action) {
      case 'balance':
        return { balance: String(provider.balance || 14850000), currency: provider.currency || 'VND' };
      case 'services':
        return SANDBOX_UPSTREAM_SERVICES;
      case 'add':
        return { order: Math.floor(8850000 + Math.random() * 90000) };
      case 'status': {
        if (params.orders) {
          const ids = String(params.orders).split(',').map((s) => s.trim());
          const out: Record<string, any> = {};
          for (const oid of ids) {
            const ord = db.orders.find((o) => String(o.providerOrderId) === oid || String(o.id) === oid);
            if (ord) {
              const nextRemains = ord.status === 'Completed' ? 0 : Math.max(0, Math.floor(ord.remains * 0.4));
              out[oid] = {
                charge: String(ord.originalCost),
                start_count: String(ord.start_count || 120),
                status: nextRemains === 0 ? 'Completed' : 'In progress',
                remains: String(nextRemains),
                currency: provider.currency || 'VND',
              };
            }
          }
          return out;
        }
        const ord = db.orders.find(
          (o) => String(o.providerOrderId) === String(params.order) || String(o.id) === String(params.order)
        );
        const nextRemains = ord && ord.status !== 'Completed' ? Math.max(0, Math.floor(ord.remains * 0.35)) : 0;
        return {
          charge: String(ord?.originalCost || 15000),
          start_count: String(ord?.start_count || 120),
          status: nextRemains === 0 ? 'Completed' : 'In progress',
          remains: String(nextRemains),
          currency: provider.currency || 'VND',
        };
      }
      case 'refill':
        return { refill: db.nextRefillId++ };
      case 'refill_status':
        return { status: 'Completed' };
      case 'cancel':
        return [{ order: Number(params.orders), cancel: 1 }];
      default:
        return {};
    }
  }

  const formBody = new URLSearchParams();
  formBody.set('key', provider.apiKey);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') {
      formBody.set(k, String(v));
    }
  }

  const res = await fetch(provider.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formBody.toString(),
  });
  return res.json();
}

export async function handleLocalFallbackRequest(
  url: string,
  options: RequestInit = {},
  token = ''
): Promise<Response> {
  const db = loadLocalDb();
  const caller = resolveUser(db, token);
  const method = (options.method || 'GET').toUpperCase();
  const body = options.body ? JSON.parse(String(options.body)) : {};

  if (url === '/api/state' && method === 'GET') {
    return jsonResponse(getSanitizedState(db, caller));
  }

  if (url === '/api/auth/login' && method === 'POST') {
    const cleanUser = String(body.username || '').trim().toLowerCase();
    const rawPass = String(body.password || '');
    const found = db.users.find((u) => u.username.toLowerCase() === cleanUser);
    if (!found || found.passwordPlain !== rawPass) {
      return jsonResponse({ error: 'Tên đăng nhập hoặc mật khẩu không chính xác!' }, 401);
    }
    const newToken = `tok_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const sessions = loadSessions();
    sessions[newToken] = found.id;
    saveSessions(sessions);
    return jsonResponse({
      token: newToken,
      state: getSanitizedState(db, found),
    });
  }

  if (url === '/api/auth/register' && method === 'POST') {
    const cleanUser = String(body.username || '').trim().toLowerCase();
    if (!cleanUser || cleanUser.length < 3) {
      return jsonResponse({ error: 'Tên đăng nhập cần ít nhất 3 ký tự' }, 400);
    }
    if (!body.password || String(body.password).length < 6) {
      return jsonResponse({ error: 'Mật khẩu cần ít nhất 6 ký tự' }, 400);
    }
    if (db.users.some((u) => u.username.toLowerCase() === cleanUser)) {
      return jsonResponse({ error: 'Tên đăng nhập này đã tồn tại' }, 400);
    }
    const newCustomer: StoredUser = {
      id: `usr_${Date.now()}`,
      username: cleanUser,
      passwordPlain: String(body.password),
      fullName: String(body.fullName || cleanUser).trim(),
      email: `${cleanUser}@gmail.com`,
      role: 'customer',
      tier: 'Member',
      discountPercent: 0,
      balance: 0,
      totalDeposited: 0,
      totalSpent: 0,
      apiKey: `smmpro_live_${Math.random().toString(36).slice(2, 14)}`,
    };
    db.users.push(newCustomer);
    saveLocalDb(db);

    const newToken = `tok_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const sessions = loadSessions();
    sessions[newToken] = newCustomer.id;
    saveSessions(sessions);

    return jsonResponse({
      token: newToken,
      state: getSanitizedState(db, newCustomer),
    });
  }

  if (url === '/api/auth/logout' && method === 'POST') {
    if (token) {
      const sessions = loadSessions();
      delete sessions[token];
      saveSessions(sessions);
    }
    const defaultCustomer = db.users.find((u) => u.role === 'customer') || db.users[0];
    return jsonResponse({ state: getSanitizedState(db, defaultCustomer) });
  }

  if (url === '/api/auth/change-admin-password' && method === 'POST') {
    if (caller.role !== 'admin') {
      return jsonResponse({ error: 'Không có quyền truy cập' }, 403);
    }
    if (caller.passwordPlain !== String(body.currentPassword || '')) {
      return jsonResponse({ error: 'Mật khẩu Admin hiện tại không đúng' }, 400);
    }
    if (!body.newPassword || String(body.newPassword).length < 6) {
      return jsonResponse({ error: 'Mật khẩu mới cần ít nhất 6 ký tự' }, 400);
    }
    caller.passwordPlain = String(body.newPassword);
    saveLocalDb(db);
    return jsonResponse({ message: 'Đã đổi mật khẩu Quản trị viên thành công!' });
  }

  if (url === '/api/bank-config' && method === 'POST') {
    if (caller.role !== 'admin') {
      return jsonResponse({ error: 'Chỉ Quản trị viên mới có quyền cấu hình STK Ngân hàng' }, 403);
    }
    const { bankName, bankShortCode, accountNumber, accountHolder, transferPrefix, minDeposit } = body;
    if (!bankName || !accountNumber || !accountHolder) {
      return jsonResponse(
        { error: 'Vui lòng nhập đầy đủ Tên ngân hàng, Số tài khoản và Tên chủ tài khoản' },
        400
      );
    }
    db.bankConfig = {
      bankName: String(bankName).trim(),
      bankShortCode: String(bankShortCode || 'MB').trim().toUpperCase(),
      accountNumber: String(accountNumber).trim(),
      accountHolder: String(accountHolder).trim().toUpperCase(),
      transferPrefix: String(transferPrefix || 'NAPTIEN').trim().toUpperCase(),
      minDeposit: Math.max(1000, Number(minDeposit) || 10000),
    };
    saveLocalDb(db);
    return jsonResponse(getSanitizedState(db, caller));
  }

  if (url === '/api/users/topup' && method === 'POST') {
    const numAmount = Number(body.amount);
    if (!numAmount || isNaN(numAmount)) {
      return jsonResponse({ error: 'Số tiền không hợp lệ' }, 400);
    }
    const targetUser = db.users.find((u) => u.id === (body.userId || caller.id)) || caller;
    targetUser.balance = Math.max(0, targetUser.balance + numAmount);
    if (numAmount > 0) targetUser.totalDeposited += numAmount;
    db.transactions.unshift({
      id: `tx_${Date.now()}`,
      userId: targetUser.id,
      type: numAmount > 0 ? 'deposit' : 'admin_adjust',
      amount: numAmount,
      balanceAfter: targetUser.balance,
      note: body.note || `Nạp tiền vào tài khoản (${numAmount.toLocaleString('vi-VN')}đ)`,
      createdAt: new Date().toISOString(),
    });
    saveLocalDb(db);
    return jsonResponse(getSanitizedState(db, caller));
  }

  if (url === '/api/providers' && method === 'POST') {
    if (caller.role !== 'admin') return jsonResponse({ error: 'Forbidden' }, 403);
    const { id, name, url: provUrl, apiKey, exchangeRate, priceMarkupPercent, useSandbox, currency } = body;
    const existing = db.providers.find((p) => p.id === id);
    if (existing) {
      existing.name = String(name).trim();
      existing.url = String(provUrl).trim();
      existing.apiKey = String(apiKey).trim();
      existing.exchangeRate = Number(exchangeRate) || 1;
      existing.priceMarkupPercent = Number(priceMarkupPercent) ?? 20;
      existing.useSandbox = Boolean(useSandbox);
      existing.currency = currency || existing.currency || 'VND';
    } else {
      db.providers.push({
        id: `prov_${Date.now()}`,
        name: String(name).trim(),
        url: String(provUrl).trim(),
        apiKey: String(apiKey).trim(),
        currency: currency || 'VND',
        balance: 0,
        exchangeRate: Number(exchangeRate) || 1,
        priceMarkupPercent: Number(priceMarkupPercent) ?? 25,
        useSandbox: Boolean(useSandbox),
        status: 'Untested',
      });
    }
    saveLocalDb(db);
    return jsonResponse(getSanitizedState(db, caller));
  }

  if (url.startsWith('/api/providers/') && method === 'DELETE') {
    const id = url.split('/')[3];
    if (db.providers.length <= 1) {
      return jsonResponse({ error: 'Hệ thống cần giữ lại ít nhất 1 nguồn SMM API v2' }, 400);
    }
    db.providers = db.providers.filter((p) => p.id !== id);
    saveLocalDb(db);
    return jsonResponse(getSanitizedState(db, caller));
  }

  if (url.endsWith('/balance') && url.startsWith('/api/providers/') && method === 'POST') {
    const id = url.split('/')[3];
    const provider = db.providers.find((p) => p.id === id);
    if (!provider) return jsonResponse({ error: 'Không tìm thấy nguồn API' }, 404);
    try {
      const data = await callUpstreamClientSide(provider, { action: 'balance' }, db);
      provider.balance = Number(data?.balance ?? 0);
      provider.currency = String(data?.currency || provider.currency || 'VND');
      provider.status = 'Connected';
      saveLocalDb(db);
      return jsonResponse({
        balance: provider.balance,
        currency: provider.currency,
        state: getSanitizedState(db, caller),
      });
    } catch (err: any) {
      provider.status = 'Error';
      saveLocalDb(db);
      return jsonResponse({ error: err?.message || 'Lỗi kết nối API', state: getSanitizedState(db, caller) }, 400);
    }
  }

  if (url.endsWith('/sync') && url.startsWith('/api/providers/') && method === 'POST') {
    const id = url.split('/')[3];
    const provider = db.providers.find((p) => p.id === id);
    if (!provider) return jsonResponse({ error: 'Không tìm thấy nguồn API' }, 404);
    try {
      const rawList = await callUpstreamClientSide(provider, { action: 'services' }, db);
      if (!Array.isArray(rawList)) {
        return jsonResponse({ error: 'Dữ liệu trả về không hợp lệ', state: getSanitizedState(db, caller) }, 400);
      }
      let maxServiceId = db.services.reduce((max, s) => Math.max(max, s.service), 0);
      for (const item of rawList.slice(0, 250)) {
        const provSvcId = Number(item.service);
        const origRate = Number(item.rate) || 0;
        const retailRate = Math.round(
          origRate * (provider.exchangeRate || 1) * (1 + (provider.priceMarkupPercent || 0) / 100)
        );
        const category = String(item.category || 'Dịch vụ chung');
        const name = String(item.name || `Service #${provSvcId}`);
        const platform = detectPlatform(`${category} ${name}`);
        const existing = db.services.find(
          (s) => s.providerId === provider.id && s.providerServiceId === provSvcId
        );
        if (existing) {
          existing.name = name;
          existing.category = category;
          existing.platform = platform;
          existing.originalRate = origRate;
          existing.rate = retailRate;
        } else {
          maxServiceId += 1;
          db.services.push({
            service: maxServiceId,
            providerId: provider.id,
            providerServiceId: provSvcId,
            platform,
            category,
            name,
            type: (item.type as SmmService['type']) || 'Default',
            originalRate: origRate,
            rate: retailRate,
            min: Number(item.min) || 50,
            max: Number(item.max) || 100000,
            refill: Boolean(item.refill),
            cancel: Boolean(item.cancel),
            dripfeed: Boolean(item.dripfeed),
            averageTime: String(item.average_time || '15 - 30 phút'),
            description: String(item.desc || `Đồng bộ từ ${provider.name}`),
            active: true,
          });
        }
      }
      provider.status = 'Connected';
      provider.lastSyncedAt = new Date().toISOString();
      saveLocalDb(db);
      return jsonResponse({
        syncedCount: rawList.length,
        totalFromProvider: rawList.length,
        state: getSanitizedState(db, caller),
      });
    } catch (err: any) {
      return jsonResponse({ error: err?.message || 'Lỗi đồng bộ', state: getSanitizedState(db, caller) }, 400);
    }
  }

  if (url === '/api/services/bulk-markup' && method === 'POST') {
    const { providerId, markupPercent, exchangeRate } = body;
    for (const svc of db.services) {
      if (!providerId || svc.providerId === providerId) {
        const p = db.providers.find((x) => x.id === svc.providerId);
        const ex = Number(exchangeRate ?? p?.exchangeRate ?? 1);
        const mk = Number(markupPercent ?? p?.priceMarkupPercent ?? 25);
        svc.rate = Math.round(svc.originalRate * ex * (1 + mk / 100));
      }
    }
    saveLocalDb(db);
    return jsonResponse(getSanitizedState(db, caller));
  }

  if (url.startsWith('/api/services/') && method === 'PATCH') {
    const serviceId = Number(url.split('/')[3]);
    const svc = db.services.find((s) => s.service === serviceId);
    if (!svc) return jsonResponse({ error: 'Không tìm thấy dịch vụ' }, 404);
    if (body.rate !== undefined) svc.rate = Math.max(1, Number(body.rate));
    if (body.active !== undefined) svc.active = Boolean(body.active);
    saveLocalDb(db);
    return jsonResponse(getSanitizedState(db, caller));
  }

  if (url === '/api/orders' && method === 'POST') {
    const { serviceId, link, quantity, comments, runs, interval } = body;
    const svc = db.services.find((s) => s.service === Number(serviceId) && s.active);
    if (!svc) return jsonResponse({ error: 'Dịch vụ không tồn tại hoặc đang bảo trì' }, 400);
    if (!link || !String(link).trim()) {
      return jsonResponse({ error: 'Vui lòng nhập đường dẫn (Link) hoặc UID cần chạy' }, 400);
    }
    let baseQty = Number(quantity || 0);
    if (svc.type === 'Custom Comments') {
      const lines = String(comments || '')
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      if (lines.length === 0) {
        return jsonResponse({ error: 'Vui lòng nhập danh sách bình luận' }, 400);
      }
      baseQty = lines.length;
    } else if (svc.type === 'Package') {
      baseQty = 1000;
    }
    const numRuns = runs && Number(runs) > 1 ? Number(runs) : undefined;
    const numInterval = interval && Number(interval) > 0 ? Number(interval) : undefined;
    const effectiveQty = numRuns ? baseQty * numRuns : baseQty;
    if (effectiveQty < svc.min || effectiveQty > svc.max) {
      return jsonResponse(
        { error: `Số lượng phải từ ${svc.min.toLocaleString('vi-VN')} đến ${svc.max.toLocaleString('vi-VN')}` },
        400
      );
    }
    const totalCharge = Math.round((effectiveQty / 1000) * svc.rate);
    if (caller.balance < totalCharge) {
      return jsonResponse({ error: 'Số dư không đủ. Vui lòng nạp thêm tiền vào ví.' }, 400);
    }
    const provider = db.providers.find((p) => p.id === svc.providerId) || db.providers[0];
    const newOrderId = db.nextOrderId++;
    const now = new Date().toISOString();
    caller.balance -= totalCharge;
    caller.totalSpent += totalCharge;

    const newOrder: SmmOrder = {
      id: newOrderId,
      userId: caller.id,
      providerId: provider?.id || 'prov_smmvin_main',
      providerName: provider?.name || 'SMM.VIN',
      providerOrderId: Math.floor(8850000 + Math.random() * 90000),
      serviceId: svc.service,
      serviceName: svc.name,
      platform: svc.platform,
      link: String(link).trim(),
      quantity: effectiveQty,
      charge: totalCharge,
      originalCost: Math.round((effectiveQty / 1000) * svc.originalRate),
      start_count: Math.floor(20 + Math.random() * 450),
      remains: effectiveQty,
      status: 'In progress',
      currency: 'VND',
      comments: comments ? String(comments) : undefined,
      runs: numRuns,
      interval: numInterval,
      refillSupported: svc.refill,
      cancelSupported: svc.cancel,
      createdAt: now,
      updatedAt: now,
    };
    db.orders.unshift(newOrder);
    db.transactions.unshift({
      id: `tx_${Date.now()}`,
      userId: caller.id,
      type: 'order_spend',
      amount: -totalCharge,
      balanceAfter: caller.balance,
      note: `Thanh toán đơn hàng #${newOrderId} - ${svc.name}`,
      createdAt: now,
    });
    saveLocalDb(db);
    return jsonResponse({ order: newOrder, state: getSanitizedState(db, caller) });
  }

  if (url === '/api/orders/mass' && method === 'POST') {
    const lines = String(body.rawLines || '')
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const createdOrders: SmmOrder[] = [];
    const errors: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      const parts = lines[i].split('|').map((s) => s.trim());
      if (parts.length < 3) {
        errors.push(`Dòng ${i + 1}: Sai cú pháp`);
        continue;
      }
      const svc = db.services.find((s) => s.service === Number(parts[0]) && s.active);
      const qty = Number(parts[2]);
      if (!svc || !qty || qty < svc.min || qty > svc.max) {
        errors.push(`Dòng ${i + 1}: Dịch vụ hoặc số lượng không hợp lệ`);
        continue;
      }
      const charge = Math.round((qty / 1000) * svc.rate);
      if (caller.balance < charge) {
        errors.push(`Dòng ${i + 1}: Số dư không đủ`);
        continue;
      }
      caller.balance -= charge;
      caller.totalSpent += charge;
      const now = new Date().toISOString();
      const ord: SmmOrder = {
        id: db.nextOrderId++,
        userId: caller.id,
        providerId: svc.providerId,
        providerName: 'SMM.VIN',
        providerOrderId: Math.floor(8850000 + Math.random() * 90000),
        serviceId: svc.service,
        serviceName: svc.name,
        platform: svc.platform,
        link: parts[1],
        quantity: qty,
        charge,
        originalCost: Math.round((qty / 1000) * svc.originalRate),
        start_count: 50,
        remains: qty,
        status: 'In progress',
        currency: 'VND',
        refillSupported: svc.refill,
        cancelSupported: svc.cancel,
        createdAt: now,
        updatedAt: now,
      };
      db.orders.unshift(ord);
      createdOrders.push(ord);
    }
    saveLocalDb(db);
    return jsonResponse({
      createdCount: createdOrders.length,
      errors,
      state: getSanitizedState(db, caller),
    });
  }

  if (url === '/api/orders/sync-status' && method === 'POST') {
    const now = new Date().toISOString();
    let updatedCount = 0;
    for (const ord of db.orders) {
      if (ord.status === 'In progress' || ord.status === 'Pending') {
        ord.remains = Math.max(0, Math.floor(ord.remains * 0.4));
        ord.status = ord.remains === 0 ? 'Completed' : 'In progress';
        ord.updatedAt = now;
        updatedCount++;
      }
    }
    saveLocalDb(db);
    return jsonResponse({ updatedCount, state: getSanitizedState(db, caller) });
  }

  if (url === '/api/orders/refill' && method === 'POST') {
    const ids: number[] = Array.isArray(body.orderIds) ? body.orderIds.map(Number) : [Number(body.orderId)];
    let refilledCount = 0;
    for (const ord of db.orders) {
      if (ids.includes(ord.id) && ord.refillSupported) {
        ord.refillId = db.nextRefillId++;
        ord.refillStatus = 'In progress';
        refilledCount++;
      }
    }
    saveLocalDb(db);
    return jsonResponse({ refilledCount, state: getSanitizedState(db, caller) });
  }

  if (url === '/api/orders/refill-status' && method === 'POST') {
    for (const ord of db.orders) {
      if (ord.refillId) {
        ord.refillStatus = 'Completed';
        ord.remains = 0;
        ord.status = 'Completed';
      }
    }
    saveLocalDb(db);
    return jsonResponse({ state: getSanitizedState(db, caller) });
  }

  if (url === '/api/orders/cancel' && method === 'POST') {
    const ids: number[] = Array.isArray(body.orderIds) ? body.orderIds.map(Number) : [Number(body.orderId)];
    let canceledCount = 0;
    for (const ord of db.orders) {
      if (ids.includes(ord.id) && ord.cancelSupported && ord.status !== 'Completed' && ord.status !== 'Canceled') {
        ord.status = 'Canceled';
        ord.remains = ord.quantity;
        const owner = db.users.find((u) => u.id === ord.userId);
        if (owner) {
          owner.balance += ord.charge;
        }
        canceledCount++;
      }
    }
    saveLocalDb(db);
    return jsonResponse({ canceledCount, state: getSanitizedState(db, caller) });
  }

  return jsonResponse(getSanitizedState(db, caller));
}
