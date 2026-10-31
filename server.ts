import express from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';

const PORT = 3000;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'smm-db.json');

interface ApiProvider {
  id: string;
  name: string;
  url: string;
  apiKey: string;
  currency: string;
  balance: number;
  exchangeRate: number;
  priceMarkupPercent: number;
  useSandbox: boolean;
  status: 'Connected' | 'Error' | 'Untested';
  lastSyncedAt?: string;
  lastError?: string;
}

interface BankConfig {
  bankName: string;
  bankShortCode: string;
  accountNumber: string;
  accountHolder: string;
  transferPrefix: string;
  minDeposit: number;
}

interface SmmService {
  service: number;
  providerId: string;
  providerServiceId: number;
  platform: 'Facebook' | 'TikTok' | 'Instagram' | 'YouTube' | 'Telegram' | 'Shopee' | 'Twitter' | 'Other';
  category: string;
  name: string;
  type: 'Default' | 'Custom Comments' | 'Package' | 'Subscriptions';
  originalRate: number;
  rate: number;
  min: number;
  max: number;
  refill: boolean;
  cancel: boolean;
  dripfeed: boolean;
  averageTime: string;
  description: string;
  active: boolean;
}

interface SmmOrder {
  id: number;
  userId: string;
  providerId: string;
  providerName: string;
  providerOrderId: number;
  serviceId: number;
  serviceName: string;
  platform: SmmService['platform'];
  link: string;
  quantity: number;
  charge: number;
  originalCost: number;
  start_count: number;
  remains: number;
  status: 'Pending' | 'Processing' | 'In progress' | 'Completed' | 'Partial' | 'Canceled' | 'Refunded';
  currency: string;
  comments?: string;
  runs?: number;
  interval?: number;
  refillSupported: boolean;
  cancelSupported: boolean;
  refillId?: number;
  refillStatus?: 'Pending' | 'In progress' | 'Completed' | 'Rejected';
  createdAt: string;
  updatedAt: string;
}

interface WalletTransaction {
  id: string;
  userId: string;
  type: 'deposit' | 'order_spend' | 'order_refund' | 'admin_adjust';
  amount: number;
  balanceAfter: number;
  note: string;
  createdAt: string;
}

interface UserAccount {
  id: string;
  username: string;
  passwordHash: string;
  fullName: string;
  email: string;
  role: 'customer' | 'admin';
  tier: 'Member' | 'Collaborator' | 'Agency' | 'Admin';
  discountPercent: number;
  balance: number;
  totalDeposited: number;
  totalSpent: number;
  apiKey: string;
}

interface DatabaseSchema {
  activeUserId: string;
  nextOrderId: number;
  nextRefillId: number;
  bankConfig: BankConfig;
  users: UserAccount[];
  providers: ApiProvider[];
  services: SmmService[];
  orders: SmmOrder[];
  transactions: WalletTransaction[];
}

function hashPassword(rawPassword: string): string {
  return crypto.createHash('sha256').update(`smmvin_salt_${rawPassword}`).digest('hex');
}

const sessionTokens = new Map<string, string>();

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
    desc: 'Tương tác từ tài khoản người dùng Việt Nam thật. Hỗ trợ bài viết công khai, ảnh đại diện, ảnh bìa. Tự động nhận diện UID từ URL.'
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
    desc: 'Tăng người theo dõi thật cho Profile hoặc Fanpage mới lập. Có nút Bảo hành (Refill) tự động trong 30 ngày nếu tụt.'
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
    desc: 'Nhập mỗi bình luận trên 1 dòng. Hệ thống tự động đếm số dòng để tính số lượng cần chạy.'
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
    desc: 'Tăng mắt xem trực tiếp ngay khi đang phát Livestream. Lên ngay sau 1-2 phút đặt đơn.'
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
    desc: 'Tăng tim video TikTok tốc độ cao, giúp đẩy video lên xu hướng (For You Page). Bảo hành tự động 30 ngày.'
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
    desc: 'Tăng lượt xem video TikTok tốc độ cực nhanh, giá siêu rẻ phù hợp cày chỉ số kênh.'
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
    desc: 'Hỗ trợ đủ 1.000 Follow để bật Livestream và gắn giỏ hàng TikTok Shop an toàn tuyệt đối.'
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
    desc: 'Nhập danh sách câu bình luận seeding bán hàng (mỗi dòng 1 bình luận).'
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
    desc: 'Tăng người theo dõi Instagram chất lượng cao, có ảnh đại diện và bài đăng. Hỗ trợ nút Refill tự động.'
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
    desc: 'Tăng lượt thích cho bài đăng ảnh hoặc Reels công khai trên Instagram.'
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
    desc: 'Lượt xem thực từ tìm kiếm và đề xuất YouTube, thời gian giữ chân cao, an toàn bật kiếm tiền.'
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
    desc: 'Tăng người đăng ký kênh YouTube thật kèm lượt xem ngắn để chống quét.'
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
    desc: 'Tăng thành viên cho Channel hoặc Group công khai trên Telegram.'
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
    desc: 'Tăng độ uy tín cho Shop mới trên Shopee, đẩy thứ hạng tìm kiếm tự nhiên.'
  }
];

function detectPlatform(categoryAndName: string): SmmService['platform'] {
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

function buildInitialDatabase(): DatabaseSchema {
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
        passwordHash: hashPassword('123456'),
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
        passwordHash: hashPassword('admin123456'),
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
      {
        id: 10003,
        userId: 'usr_customer_1',
        providerId: defaultProviderId,
        providerName: 'SMM.VIN (Nguồn Chính SMM API v2)',
        providerOrderId: 8849690,
        serviceId: 7,
        serviceName: services[6].name,
        platform: 'TikTok',
        link: 'https://www.tiktok.com/@shop.official.vn',
        quantity: 1000,
        charge: (1000 / 1000) * services[6].rate,
        originalCost: (1000 / 1000) * services[6].originalRate,
        start_count: 35,
        remains: 1000,
        status: 'Pending',
        currency: 'VND',
        refillSupported: true,
        cancelSupported: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 10004,
        userId: 'usr_customer_1',
        providerId: defaultProviderId,
        providerName: 'SMM.VIN (Nguồn Chính SMM API v2)',
        providerOrderId: 8849711,
        serviceId: 9,
        serviceName: services[8].name,
        platform: 'Instagram',
        link: 'https://www.instagram.com/brand.studio.vn/',
        quantity: 1500,
        charge: (1500 / 1000) * services[8].rate,
        originalCost: (1500 / 1000) * services[8].originalRate,
        start_count: 1200,
        remains: 320,
        status: 'In progress',
        currency: 'VND',
        refillSupported: true,
        cancelSupported: true,
        createdAt: now,
        updatedAt: now,
      },
    ],
    transactions: [
      {
        id: 'tx_101',
        userId: 'usr_customer_1',
        type: 'deposit',
        amount: 2500000,
        balanceAfter: 2635500,
        note: 'Nạp tiền tự động qua VietQR Ngân hàng MBBank (NAPTIEN KHACHHANG)',
        createdAt: threeHoursAgo,
      },
      {
        id: 'tx_102',
        userId: 'usr_customer_1',
        type: 'order_spend',
        amount: -((2000 / 1000) * services[0].rate),
        balanceAfter: 2600500,
        note: 'Thanh toán đơn hàng #10001 (Facebook Tăng Like Bài Viết - 2,000 lượng)',
        createdAt: threeHoursAgo,
      },
      {
        id: 'tx_103',
        userId: 'usr_customer_1',
        type: 'order_spend',
        amount: -((5000 / 1000) * services[4].rate),
        balanceAfter: 2525500,
        note: 'Thanh toán đơn hàng #10002 (TikTok Tăng Tim Video - 5,000 lượng)',
        createdAt: oneHourAgo,
      },
      {
        id: 'tx_104',
        userId: 'usr_customer_1',
        type: 'order_spend',
        amount: -((1000 / 1000) * services[6].rate + (1500 / 1000) * services[8].rate),
        balanceAfter: 2450000,
        note: 'Thanh toán cụm đơn hàng #10003 & #10004 (TikTok & Instagram)',
        createdAt: now,
      },
    ],
  };
}

function loadDb(): DatabaseSchema {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      const initial = buildInitialDatabase();
      fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
      return initial;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as DatabaseSchema;
    if (!parsed.bankConfig) {
      parsed.bankConfig = { ...DEFAULT_BANK_CONFIG };
    }
    for (const u of parsed.users) {
      if (!u.passwordHash) {
        u.passwordHash = u.role === 'admin' ? hashPassword('admin123456') : hashPassword('123456');
        if (u.role === 'admin') u.username = 'admin';
      }
    }
    return parsed;
  } catch {
    return buildInitialDatabase();
  }
}

function saveDb(db: DatabaseSchema): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist DB:', err);
  }
}

let db = loadDb();

async function callUpstreamSmmApi(
  provider: ApiProvider,
  params: Record<string, string | number | undefined>
): Promise<any> {
  const action = String(params.action || '');

  if (provider.useSandbox) {
    switch (action) {
      case 'balance':
        return {
          balance: String(provider.balance || 14850000),
          currency: provider.currency || 'VND',
        };
      case 'services':
        return SANDBOX_UPSTREAM_SERVICES;
      case 'add': {
        const fakeOrderId = Math.floor(8850000 + Math.random() * 90000);
        return { order: fakeOrderId };
      }
      case 'status': {
        if (params.orders) {
          const ids = String(params.orders)
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
          const result: Record<string, any> = {};
          for (const oid of ids) {
            const localOrder = db.orders.find((o) => String(o.providerOrderId) === oid || String(o.id) === oid);
            if (!localOrder) {
              result[oid] = { error: 'Incorrect order ID' };
            } else {
              const nextRemains =
                localOrder.status === 'Completed' || localOrder.status === 'Canceled'
                  ? localOrder.remains
                  : Math.max(0, Math.floor(localOrder.remains * 0.4));
              const nextStatus =
                localOrder.status === 'Canceled'
                  ? 'Canceled'
                  : nextRemains === 0
                  ? 'Completed'
                  : 'In progress';
              result[oid] = {
                charge: String(localOrder.originalCost),
                start_count: String(localOrder.start_count || 120),
                status: nextStatus,
                remains: String(nextRemains),
                currency: provider.currency || 'VND',
              };
            }
          }
          return result;
        }
        const singleOid = String(params.order || '');
        const localOrder = db.orders.find(
          (o) => String(o.providerOrderId) === singleOid || String(o.id) === singleOid
        );
        if (!localOrder) {
          return { error: 'Incorrect order ID' };
        }
        const nextRemains =
          localOrder.status === 'Completed' || localOrder.status === 'Canceled'
            ? localOrder.remains
            : Math.max(0, Math.floor(localOrder.remains * 0.35));
        const nextStatus =
          localOrder.status === 'Canceled'
            ? 'Canceled'
            : nextRemains === 0
            ? 'Completed'
            : 'In progress';
        return {
          charge: String(localOrder.originalCost),
          start_count: String(localOrder.start_count || 150),
          status: nextStatus,
          remains: String(nextRemains),
          currency: provider.currency || 'VND',
        };
      }
      case 'refill': {
        if (params.orders) {
          const ids = String(params.orders)
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
          return ids.map((id) => ({
            order: Number(id),
            refill: db.nextRefillId++,
          }));
        }
        return {
          refill: db.nextRefillId++,
        };
      }
      case 'refill_status': {
        if (params.refills) {
          const rIds = String(params.refills)
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
          return rIds.map((rId) => ({
            refill: Number(rId),
            status: 'Completed',
          }));
        }
        return {
          status: 'Completed',
        };
      }
      case 'cancel': {
        if (params.orders) {
          const ids = String(params.orders)
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
          return ids.map((id) => ({
            order: Number(id),
            cancel: 1,
          }));
        }
        return {
          order: Number(params.order),
          cancel: 1,
        };
      }
      default:
        return { error: `Unknown action: ${action}` };
    }
  }

  const formBody = new URLSearchParams();
  formBody.append('key', provider.apiKey);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') {
      formBody.append(k, String(v));
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(provider.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        'User-Agent': 'SMM-Panel-v2-Client/2.0',
      },
      body: formBody.toString(),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`Phản hồi từ ${provider.url} không phải JSON hợp lệ (HTTP ${response.status}): ${text.slice(0, 140)}`);
    }
  } catch (err: any) {
    clearTimeout(timeout);
    throw new Error(err?.message || `Không thể kết nối tới ${provider.url}`);
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  const resolveSessionUser = (req: express.Request): UserAccount => {
    const token = String(req.headers['x-session-token'] || '').trim();
    if (token && sessionTokens.has(token)) {
      const uid = sessionTokens.get(token)!;
      const found = db.users.find((u) => u.id === uid);
      if (found) return found;
    }
    return db.users.find((u) => u.role === 'customer') || db.users[0];
  };

  const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const user = resolveSessionUser(req);
    if (user.role !== 'admin') {
      res.status(403).json({
        error: 'Truy cập bị từ chối: Chức năng này chỉ dành cho Quản trị viên đã đăng nhập bằng mật khẩu Admin.',
      });
      return;
    }
    next();
  };

  const getSanitizedStateForUser = (user: UserAccount) => {
    const isAdmin = user.role === 'admin';
    const { passwordHash: _ph, ...safeActiveUser } = user;

    return {
      activeUser: safeActiveUser,
      users: isAdmin ? db.users.map(({ passwordHash: _p, ...u }) => u) : [],
      providers: isAdmin ? db.providers : [],
      bankConfig: db.bankConfig || DEFAULT_BANK_CONFIG,
      services: db.services.map((svc) => ({
        ...svc,
        originalRate: isAdmin ? svc.originalRate : 0,
      })),
      orders: isAdmin ? db.orders : db.orders.filter((o) => o.userId === user.id),
      transactions: isAdmin
        ? db.transactions
        : db.transactions.filter((t) => t.userId === user.id),
    };
  };

  app.get('/api/state', (req, res) => {
    const user = resolveSessionUser(req);
    res.json(getSanitizedStateForUser(user));
  });

  // Login with username & password
  app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    const cleanUser = String(username || '').trim().toLowerCase();
    const rawPass = String(password || '');

    const found = db.users.find((u) => u.username.toLowerCase() === cleanUser);
    if (!found || found.passwordHash !== hashPassword(rawPass)) {
      res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không chính xác!' });
      return;
    }

    const token = crypto.randomBytes(24).toString('hex');
    sessionTokens.set(token, found.id);
    res.json({
      token,
      state: getSanitizedStateForUser(found),
    });
  });

  // Register a new Customer account
  app.post('/api/auth/register', (req, res) => {
    const { username, password, fullName, email } = req.body;
    const cleanUser = String(username || '').trim().toLowerCase();
    if (!cleanUser || cleanUser.length < 3) {
      res.status(400).json({ error: 'Tên đăng nhập cần ít nhất 3 ký tự' });
      return;
    }
    if (!password || String(password).length < 6) {
      res.status(400).json({ error: 'Mật khẩu cần ít nhất 6 ký tự' });
      return;
    }
    if (db.users.some((u) => u.username.toLowerCase() === cleanUser)) {
      res.status(400).json({ error: 'Tên đăng nhập này đã tồn tại' });
      return;
    }

    const randomHex = crypto.randomBytes(12).toString('hex');
    const newCustomer: UserAccount = {
      id: `usr_${Date.now()}`,
      username: cleanUser,
      passwordHash: hashPassword(String(password)),
      fullName: String(fullName || cleanUser).trim(),
      email: String(email || `${cleanUser}@gmail.com`).trim(),
      role: 'customer',
      tier: 'Member',
      discountPercent: 0,
      balance: 0,
      totalDeposited: 0,
      totalSpent: 0,
      apiKey: `smmpro_live_${randomHex}`,
    };

    db.users.push(newCustomer);
    saveDb(db);

    const token = crypto.randomBytes(24).toString('hex');
    sessionTokens.set(token, newCustomer.id);

    res.json({
      token,
      state: getSanitizedStateForUser(newCustomer),
    });
  });

  // Logout
  app.post('/api/auth/logout', (req, res) => {
    const token = String(req.headers['x-session-token'] || '').trim();
    if (token) {
      sessionTokens.delete(token);
    }
    const defaultCustomer = db.users.find((u) => u.role === 'customer') || db.users[0];
    res.json({
      state: getSanitizedStateForUser(defaultCustomer),
    });
  });

  // Admin: Change Admin Password
  app.post('/api/auth/change-admin-password', requireAdmin, (req, res) => {
    const adminUser = resolveSessionUser(req);
    const { currentPassword, newPassword } = req.body;
    if (adminUser.passwordHash !== hashPassword(String(currentPassword || ''))) {
      res.status(400).json({ error: 'Mật khẩu Admin hiện tại không đúng' });
      return;
    }
    if (!newPassword || String(newPassword).length < 6) {
      res.status(400).json({ error: 'Mật khẩu mới cần ít nhất 6 ký tự' });
      return;
    }
    adminUser.passwordHash = hashPassword(String(newPassword));
    saveDb(db);
    res.json({ message: 'Đã đổi mật khẩu Quản trị viên thành công!' });
  });

  // ADMIN ONLY: Update Bank Account Configuration
  app.post('/api/bank-config', requireAdmin, (req, res) => {
    const caller = resolveSessionUser(req);
    const { bankName, bankShortCode, accountNumber, accountHolder, transferPrefix, minDeposit } = req.body;
    if (!bankName || !accountNumber || !accountHolder) {
      res.status(400).json({ error: 'Vui lòng nhập đầy đủ Tên ngân hàng, Số tài khoản và Tên chủ tài khoản' });
      return;
    }

    db.bankConfig = {
      bankName: String(bankName).trim(),
      bankShortCode: String(bankShortCode || 'MB').trim().toUpperCase(),
      accountNumber: String(accountNumber).trim(),
      accountHolder: String(accountHolder).trim().toUpperCase(),
      transferPrefix: String(transferPrefix || 'NAPTIEN').trim().toUpperCase(),
      minDeposit: Math.max(1000, Number(minDeposit) || 10000),
    };

    saveDb(db);
    res.json(getSanitizedStateForUser(caller));
  });

  // Top-up or Admin balance adjustment
  app.post('/api/users/topup', (req, res) => {
    const caller = resolveSessionUser(req);
    const { userId, amount, note } = req.body;
    const numAmount = Number(amount);

    if (!numAmount || isNaN(numAmount)) {
      res.status(400).json({ error: 'Số tiền không hợp lệ' });
      return;
    }

    if ((userId && userId !== caller.id) || numAmount < 0) {
      if (caller.role !== 'admin') {
        res.status(403).json({ error: 'Chỉ Quản trị viên mới có quyền điều chỉnh số dư thành viên khác' });
        return;
      }
    }

    const targetUser = db.users.find((u) => u.id === (userId || caller.id)) || caller;
    targetUser.balance = Math.max(0, targetUser.balance + numAmount);
    if (numAmount > 0) {
      targetUser.totalDeposited += numAmount;
    }
    db.transactions.unshift({
      id: `tx_${Date.now()}`,
      userId: targetUser.id,
      type: numAmount > 0 ? 'deposit' : 'admin_adjust',
      amount: numAmount,
      balanceAfter: targetUser.balance,
      note: note || `Nạp tiền vào tài khoản (${numAmount.toLocaleString('vi-VN')}đ)`,
      createdAt: new Date().toISOString(),
    });
    saveDb(db);
    res.json(getSanitizedStateForUser(caller));
  });

  // ADMIN ONLY: Add or Update SMM API v2 Provider
  app.post('/api/providers', requireAdmin, (req, res) => {
    const caller = resolveSessionUser(req);
    const { id, name, url, apiKey, exchangeRate, priceMarkupPercent, useSandbox, currency } = req.body;
    if (!name || !url || !apiKey) {
      res.status(400).json({ error: 'Vui lòng nhập đầy đủ Tên nguồn, API URL và API Key' });
      return;
    }

    const existing = db.providers.find((p) => p.id === id);
    if (existing) {
      existing.name = String(name).trim();
      existing.url = String(url).trim();
      existing.apiKey = String(apiKey).trim();
      existing.exchangeRate = Number(exchangeRate) || 1;
      existing.priceMarkupPercent = Number(priceMarkupPercent) ?? 20;
      existing.useSandbox = Boolean(useSandbox);
      existing.currency = currency || existing.currency || 'VND';
    } else {
      db.providers.push({
        id: `prov_${Date.now()}`,
        name: String(name).trim(),
        url: String(url).trim(),
        apiKey: String(apiKey).trim(),
        currency: currency || 'VND',
        balance: 0,
        exchangeRate: Number(exchangeRate) || 1,
        priceMarkupPercent: Number(priceMarkupPercent) ?? 25,
        useSandbox: Boolean(useSandbox),
        status: 'Untested',
      });
    }
    saveDb(db);
    res.json(getSanitizedStateForUser(caller));
  });

  // ADMIN ONLY: Delete Provider
  app.delete('/api/providers/:id', requireAdmin, (req, res) => {
    const caller = resolveSessionUser(req);
    const { id } = req.params;
    if (db.providers.length <= 1) {
      res.status(400).json({ error: 'Hệ thống cần giữ lại ít nhất 1 nguồn SMM API v2' });
      return;
    }
    db.providers = db.providers.filter((p) => p.id !== id);
    saveDb(db);
    res.json(getSanitizedStateForUser(caller));
  });

  // ADMIN ONLY: Check Provider Balance (action=balance)
  app.post('/api/providers/:id/balance', requireAdmin, async (req, res) => {
    const caller = resolveSessionUser(req);
    const provider = db.providers.find((p) => p.id === req.params.id);
    if (!provider) {
      res.status(404).json({ error: 'Không tìm thấy nguồn API' });
      return;
    }
    try {
      const data = await callUpstreamSmmApi(provider, { action: 'balance' });
      if (data?.error) {
        provider.status = 'Error';
        provider.lastError = String(data.error);
        saveDb(db);
        res.status(400).json({ error: `Lỗi từ nguồn API: ${data.error}`, state: getSanitizedStateForUser(caller) });
        return;
      }
      provider.balance = Number(data?.balance ?? 0);
      provider.currency = String(data?.currency || provider.currency || 'VND');
      provider.status = 'Connected';
      provider.lastError = undefined;
      saveDb(db);
      res.json({
        balance: provider.balance,
        currency: provider.currency,
        rawResponse: data,
        state: getSanitizedStateForUser(caller),
      });
    } catch (err: any) {
      provider.status = 'Error';
      provider.lastError = err?.message || 'Lỗi kết nối';
      saveDb(db);
      res.status(400).json({
        error: `${err?.message || 'Lỗi kết nối'}. Bạn có thể bật chế độ Sandbox trên nguồn này nếu chưa có API Key thật.`,
        state: getSanitizedStateForUser(caller),
      });
    }
  });

  // ADMIN ONLY: Sync Services from Provider (action=services)
  app.post('/api/providers/:id/sync', requireAdmin, async (req, res) => {
    const caller = resolveSessionUser(req);
    const provider = db.providers.find((p) => p.id === req.params.id);
    if (!provider) {
      res.status(404).json({ error: 'Không tìm thấy nguồn API' });
      return;
    }
    try {
      const rawList = await callUpstreamSmmApi(provider, { action: 'services' });
      if (!Array.isArray(rawList)) {
        const errMsg = rawList?.error || 'Dữ liệu trả về từ action=services không phải mảng dịch vụ hợp lệ';
        provider.status = 'Error';
        provider.lastError = String(errMsg);
        saveDb(db);
        res.status(400).json({ error: errMsg, state: getSanitizedStateForUser(caller) });
        return;
      }

      let syncedCount = 0;
      let maxServiceId = db.services.reduce((max, s) => Math.max(max, s.service), 0);
      const sliceList = rawList.slice(0, 250);

      for (const item of sliceList) {
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
          existing.min = Number(item.min) || 50;
          existing.max = Number(item.max) || 100000;
          existing.refill = Boolean(item.refill);
          existing.cancel = Boolean(item.cancel);
          existing.dripfeed = Boolean(item.dripfeed);
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
            description: String(
              item.desc ||
                item.description ||
                `Đồng bộ trực tiếp từ ${provider.name} (ID gốc #${provSvcId}). Tự động xử lý 24/7.`
            ),
            active: true,
          });
        }
        syncedCount++;
      }

      provider.status = 'Connected';
      provider.lastSyncedAt = new Date().toISOString();
      provider.lastError = undefined;
      saveDb(db);

      res.json({
        syncedCount,
        totalFromProvider: rawList.length,
        state: getSanitizedStateForUser(caller),
      });
    } catch (err: any) {
      provider.status = 'Error';
      provider.lastError = err?.message || 'Không thể đồng bộ dịch vụ';
      saveDb(db);
      res.status(400).json({
        error: err?.message || 'Không thể đồng bộ dịch vụ',
        state: getSanitizedStateForUser(caller),
      });
    }
  });

  // ADMIN ONLY: Update a single service
  app.patch('/api/services/:serviceId', requireAdmin, (req, res) => {
    const caller = resolveSessionUser(req);
    const serviceId = Number(req.params.serviceId);
    const svc = db.services.find((s) => s.service === serviceId);
    if (!svc) {
      res.status(404).json({ error: 'Không tìm thấy dịch vụ' });
      return;
    }
    const { rate, name, min, max, active, refill, cancel } = req.body;
    if (rate !== undefined) svc.rate = Math.max(1, Number(rate));
    if (name !== undefined) svc.name = String(name);
    if (min !== undefined) svc.min = Math.max(1, Number(min));
    if (max !== undefined) svc.max = Math.max(svc.min, Number(max));
    if (active !== undefined) svc.active = Boolean(active);
    if (refill !== undefined) svc.refill = Boolean(refill);
    if (cancel !== undefined) svc.cancel = Boolean(cancel);

    saveDb(db);
    res.json(getSanitizedStateForUser(caller));
  });

  // ADMIN ONLY: Bulk recalculate retail rates by markup percentage
  app.post('/api/services/bulk-markup', requireAdmin, (req, res) => {
    const caller = resolveSessionUser(req);
    const { providerId, markupPercent, exchangeRate } = req.body;
    const prov = db.providers.find((p) => p.id === providerId);
    if (prov) {
      prov.priceMarkupPercent = Number(markupPercent) ?? prov.priceMarkupPercent;
      if (exchangeRate !== undefined) {
        prov.exchangeRate = Number(exchangeRate) || 1;
      }
    }

    for (const svc of db.services) {
      if (!providerId || svc.providerId === providerId) {
        const p = db.providers.find((x) => x.id === svc.providerId);
        const ex = p?.exchangeRate || 1;
        const mk = Number(markupPercent ?? p?.priceMarkupPercent ?? 25);
        svc.rate = Math.round(svc.originalRate * ex * (1 + mk / 100));
      }
    }

    saveDb(db);
    res.json(getSanitizedStateForUser(caller));
  });

  // Place Single Order (action=add)
  app.post('/api/orders', async (req, res) => {
    try {
      const activeUser = resolveSessionUser(req);
      const { serviceId, link, quantity, comments, runs, interval } = req.body;

      const svc = db.services.find((s) => s.service === Number(serviceId) && s.active);
      if (!svc) {
        res.status(400).json({ error: 'Dịch vụ không tồn tại hoặc đang bảo trì' });
        return;
      }
      if (!link || !String(link).trim()) {
        res.status(400).json({ error: 'Vui lòng nhập đường dẫn (Link) hoặc UID cần chạy' });
        return;
      }

      let baseQty = Number(quantity || 0);
      if (svc.type === 'Custom Comments') {
        const lines = String(comments || '')
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter(Boolean);
        if (lines.length === 0) {
          res.status(400).json({ error: 'Vui lòng nhập danh sách bình luận (mỗi dòng 1 bình luận)' });
          return;
        }
        baseQty = lines.length;
      } else if (svc.type === 'Package') {
        baseQty = 1000;
      }

      const numRuns = runs && Number(runs) > 1 ? Number(runs) : undefined;
      const numInterval = interval && Number(interval) > 0 ? Number(interval) : undefined;
      const effectiveQty = numRuns ? baseQty * numRuns : baseQty;

      if (effectiveQty < svc.min || effectiveQty > svc.max) {
        res.status(400).json({
          error: `Số lượng yêu cầu (${effectiveQty.toLocaleString('vi-VN')}) phải nằm trong khoảng từ ${svc.min.toLocaleString('vi-VN')} đến ${svc.max.toLocaleString('vi-VN')}`,
        });
        return;
      }

      const discountMultiplier = 1 - (activeUser.discountPercent || 0) / 100;
      const totalCharge = Math.round((effectiveQty / 1000) * svc.rate * discountMultiplier);

      if (activeUser.balance < totalCharge) {
        res.status(400).json({
          error: `Số dư không đủ (${activeUser.balance.toLocaleString('vi-VN')}đ < ${totalCharge.toLocaleString('vi-VN')}đ). Vui lòng nạp thêm tiền vào ví.`,
        });
        return;
      }

      const provider = db.providers.find((p) => p.id === svc.providerId) || db.providers[0];
      let providerOrderId = Math.floor(8850000 + Math.random() * 90000);

      if (provider) {
        const upstreamRes = await callUpstreamSmmApi(provider, {
          action: 'add',
          service: svc.providerServiceId,
          link: String(link).trim(),
          quantity: baseQty,
          comments: comments ? String(comments) : undefined,
          runs: numRuns,
          interval: numInterval,
        });
        if (upstreamRes?.error) {
          res.status(400).json({ error: `Lỗi từ hệ thống máy chủ: ${upstreamRes.error}` });
          return;
        }
        if (upstreamRes?.order) {
          providerOrderId = Number(upstreamRes.order);
        }
      }

      const newOrderId = db.nextOrderId++;
      const now = new Date().toISOString();
      const originalCost = Math.round((effectiveQty / 1000) * svc.originalRate * (provider?.exchangeRate || 1));

      activeUser.balance -= totalCharge;
      activeUser.totalSpent += totalCharge;

      const newOrder: SmmOrder = {
        id: newOrderId,
        userId: activeUser.id,
        providerId: provider?.id || 'prov_smmvin_main',
        providerName: provider?.name || 'SMM.VIN',
        providerOrderId,
        serviceId: svc.service,
        serviceName: svc.name,
        platform: svc.platform,
        link: String(link).trim(),
        quantity: effectiveQty,
        charge: totalCharge,
        originalCost,
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
        userId: activeUser.id,
        type: 'order_spend',
        amount: -totalCharge,
        balanceAfter: activeUser.balance,
        note: `Thanh toán đơn hàng #${newOrderId} - ${svc.name}`,
        createdAt: now,
      });

      saveDb(db);
      res.json({
        order: newOrder,
        state: getSanitizedStateForUser(activeUser),
      });
    } catch (err: any) {
      res.status(400).json({ error: err?.message || 'Không thể khởi tạo đơn hàng' });
    }
  });

  // Place Mass Orders (action=add batch)
  app.post('/api/orders/mass', async (req, res) => {
    try {
      const activeUser = resolveSessionUser(req);
      const { rawLines } = req.body;
      const lines = String(rawLines || '')
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);

      if (lines.length === 0) {
        res.status(400).json({ error: 'Vui lòng nhập ít nhất 1 dòng theo cú pháp: service_id | link | quantity' });
        return;
      }

      const createdOrders: SmmOrder[] = [];
      const errors: string[] = [];

      for (let i = 0; i < lines.length; i++) {
        const parts = lines[i].split('|').map((s) => s.trim());
        if (parts.length < 3) {
          errors.push(`Dòng ${i + 1}: Sai cú pháp (cần: service_id | link | quantity)`);
          continue;
        }
        const serviceId = Number(parts[0]);
        const link = parts[1];
        const qty = Number(parts[2]);

        const svc = db.services.find((s) => s.service === serviceId && s.active);
        if (!svc) {
          errors.push(`Dòng ${i + 1}: Không tìm thấy mã dịch vụ #${serviceId}`);
          continue;
        }
        if (!qty || qty < svc.min || qty > svc.max) {
          errors.push(`Dòng ${i + 1}: Số lượng ${qty} nằm ngoài giới hạn (${svc.min} - ${svc.max})`);
          continue;
        }

        const charge = Math.round((qty / 1000) * svc.rate);
        if (activeUser.balance < charge) {
          errors.push(`Dòng ${i + 1}: Số dư ví không đủ để thanh toán (${charge.toLocaleString('vi-VN')}đ)`);
          continue;
        }

        const provider = db.providers.find((p) => p.id === svc.providerId) || db.providers[0];
        let providerOrderId = Math.floor(8850000 + Math.random() * 90000);

        if (provider) {
          try {
            const upstream = await callUpstreamSmmApi(provider, {
              action: 'add',
              service: svc.providerServiceId,
              link,
              quantity: qty,
            });
            if (upstream?.order) providerOrderId = Number(upstream.order);
          } catch {
            // Continue local tracking
          }
        }

        const newOrderId = db.nextOrderId++;
        const now = new Date().toISOString();
        const originalCost = Math.round((qty / 1000) * svc.originalRate * (provider?.exchangeRate || 1));

        activeUser.balance -= charge;
        activeUser.totalSpent += charge;

        const ord: SmmOrder = {
          id: newOrderId,
          userId: activeUser.id,
          providerId: provider?.id || 'prov_smmvin_main',
          providerName: provider?.name || 'SMM.VIN',
          providerOrderId,
          serviceId: svc.service,
          serviceName: svc.name,
          platform: svc.platform,
          link,
          quantity: qty,
          charge,
          originalCost,
          start_count: Math.floor(30 + Math.random() * 250),
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

      if (createdOrders.length > 0) {
        const totalMassCharge = createdOrders.reduce((acc, o) => acc + o.charge, 0);
        db.transactions.unshift({
          id: `tx_${Date.now()}`,
          userId: activeUser.id,
          type: 'order_spend',
          amount: -totalMassCharge,
          balanceAfter: activeUser.balance,
          note: `Đặt đơn hàng loạt (${createdOrders.length} đơn thành công)`,
          createdAt: new Date().toISOString(),
        });
        saveDb(db);
      }

      res.json({
        createdCount: createdOrders.length,
        errors,
        state: getSanitizedStateForUser(activeUser),
      });
    } catch (err: any) {
      res.status(400).json({ error: err?.message || 'Lỗi xử lý đơn hàng loạt' });
    }
  });

  // Sync Order Statuses (action=status)
  app.post('/api/orders/sync-status', async (req, res) => {
    try {
      const caller = resolveSessionUser(req);
      const { orderIds } = req.body;
      const accessibleOrders = caller.role === 'admin'
        ? db.orders
        : db.orders.filter((o) => o.userId === caller.id);

      const targetOrders = Array.isArray(orderIds) && orderIds.length > 0
        ? accessibleOrders.filter((o) => orderIds.includes(o.id))
        : accessibleOrders.filter((o) => o.status !== 'Completed' && o.status !== 'Canceled' && o.status !== 'Refunded');

      if (targetOrders.length === 0) {
        res.json({ updatedCount: 0, state: getSanitizedStateForUser(caller) });
        return;
      }

      const byProvider = new Map<string, SmmOrder[]>();
      for (const ord of targetOrders) {
        const list = byProvider.get(ord.providerId) || [];
        list.push(ord);
        byProvider.set(ord.providerId, list);
      }

      let updatedCount = 0;
      const now = new Date().toISOString();

      for (const [provId, ordersGroup] of byProvider.entries()) {
        const provider = db.providers.find((p) => p.id === provId) || db.providers[0];
        if (!provider) continue;

        if (ordersGroup.length === 1) {
          const single = ordersGroup[0];
          const resData = await callUpstreamSmmApi(provider, {
            action: 'status',
            order: single.providerOrderId,
          });
          if (resData && !resData.error) {
            single.start_count = Number(resData.start_count ?? single.start_count);
            single.remains = Number(resData.remains ?? single.remains);
            if (resData.status) single.status = resData.status;
            single.updatedAt = now;
            updatedCount++;
          }
        } else {
          const commaIds = ordersGroup.map((o) => o.providerOrderId).join(',');
          const batchData = await callUpstreamSmmApi(provider, {
            action: 'status',
            orders: commaIds,
          });
          if (batchData && typeof batchData === 'object') {
            for (const ord of ordersGroup) {
              const itemStatus = batchData[String(ord.providerOrderId)] || batchData[String(ord.id)];
              if (itemStatus && !itemStatus.error) {
                ord.start_count = Number(itemStatus.start_count ?? ord.start_count);
                ord.remains = Number(itemStatus.remains ?? ord.remains);
                if (itemStatus.status) ord.status = itemStatus.status;
                ord.updatedAt = now;
                updatedCount++;
              }
            }
          }
        }
      }

      saveDb(db);
      res.json({
        updatedCount,
        state: getSanitizedStateForUser(caller),
      });
    } catch (err: any) {
      res.status(400).json({ error: err?.message || 'Không thể đồng bộ trạng thái đơn hàng' });
    }
  });

  // Trigger Refill (action=refill)
  app.post('/api/orders/refill', async (req, res) => {
    try {
      const caller = resolveSessionUser(req);
      const { orderIds } = req.body;
      const ids: number[] = Array.isArray(orderIds) ? orderIds.map(Number) : [Number(req.body.orderId)];
      const eligible = db.orders.filter(
        (o) => ids.includes(o.id) && o.refillSupported && (caller.role === 'admin' || o.userId === caller.id)
      );

      if (eligible.length === 0) {
        res.status(400).json({ error: 'Đơn hàng đã chọn không hỗ trợ bảo hành (Refill)' });
        return;
      }

      const now = new Date().toISOString();
      for (const ord of eligible) {
        const provider = db.providers.find((p) => p.id === ord.providerId) || db.providers[0];
        if (provider) {
          const rData = await callUpstreamSmmApi(provider, {
            action: 'refill',
            order: ord.providerOrderId,
          });
          ord.refillId = Number(rData?.refill || db.nextRefillId++);
        } else {
          ord.refillId = db.nextRefillId++;
        }
        ord.refillStatus = 'In progress';
        ord.updatedAt = now;
      }

      saveDb(db);
      res.json({
        refilledCount: eligible.length,
        state: getSanitizedStateForUser(caller),
      });
    } catch (err: any) {
      res.status(400).json({ error: err?.message || 'Không thể gửi yêu cầu bảo hành (Refill)' });
    }
  });

  // Check Refill Status (action=refill_status)
  app.post('/api/orders/refill-status', async (req, res) => {
    try {
      const caller = resolveSessionUser(req);
      const { orderId } = req.body;
      const targets = orderId
        ? db.orders.filter(
            (o) => o.id === Number(orderId) && o.refillId && (caller.role === 'admin' || o.userId === caller.id)
          )
        : db.orders.filter((o) => Boolean(o.refillId) && (caller.role === 'admin' || o.userId === caller.id));

      for (const ord of targets) {
        const provider = db.providers.find((p) => p.id === ord.providerId) || db.providers[0];
        if (provider && ord.refillId) {
          const rs = await callUpstreamSmmApi(provider, {
            action: 'refill_status',
            refill: ord.refillId,
          });
          ord.refillStatus = (rs?.status as SmmOrder['refillStatus']) || 'Completed';
          if (ord.refillStatus === 'Completed') {
            ord.remains = 0;
            ord.status = 'Completed';
          }
          ord.updatedAt = new Date().toISOString();
        }
      }

      saveDb(db);
      res.json({ state: getSanitizedStateForUser(caller) });
    } catch (err: any) {
      res.status(400).json({ error: err?.message || 'Lỗi kiểm tra trạng thái bảo hành' });
    }
  });

  // Cancel Orders (action=cancel) & Auto-refund balance
  app.post('/api/orders/cancel', async (req, res) => {
    try {
      const caller = resolveSessionUser(req);
      const { orderIds } = req.body;
      const ids: number[] = Array.isArray(orderIds) ? orderIds.map(Number) : [Number(req.body.orderId)];
      const targets = db.orders.filter(
        (o) =>
          ids.includes(o.id) &&
          (caller.role === 'admin' || o.userId === caller.id) &&
          o.cancelSupported &&
          o.status !== 'Completed' &&
          o.status !== 'Canceled' &&
          o.status !== 'Refunded'
      );

      if (targets.length === 0) {
        res.status(400).json({ error: 'Đơn hàng đã hoàn thành hoặc không hỗ trợ hủy' });
        return;
      }

      const now = new Date().toISOString();
      for (const ord of targets) {
        const provider = db.providers.find((p) => p.id === ord.providerId) || db.providers[0];
        if (provider) {
          await callUpstreamSmmApi(provider, {
            action: 'cancel',
            orders: String(ord.providerOrderId),
          });
        }

        ord.status = 'Canceled';
        ord.remains = ord.quantity;
        ord.updatedAt = now;

        const user = db.users.find((u) => u.id === ord.userId);
        if (user) {
          user.balance += ord.charge;
          user.totalSpent = Math.max(0, ownerTotalSpent(user.totalSpent, ord.charge));
          db.transactions.unshift({
            id: `tx_${Date.now()}_${ord.id}`,
            userId: user.id,
            type: 'order_refund',
            amount: ord.charge,
            balanceAfter: user.balance,
            note: `Hoàn tiền hủy đơn #${ord.id} (${ord.serviceName})`,
            createdAt: now,
          });
        }
      }

      saveDb(db);
      res.json({
        canceledCount: targets.length,
        state: getSanitizedStateForUser(caller),
      });
    } catch (err: any) {
      res.status(400).json({ error: err?.message || 'Không thể hủy đơn hàng' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SMM.VIN Pro Panel Server listening on http://0.0.0.0:${PORT}`);
  });
}

function ownerTotalSpent(current: number, refund: number): number {
  return Math.max(0, current - refund);
}

startServer();
