# Hệ Thống Web SMM Panel Hoàn Chỉnh (Chuẩn SMM API v2)

Nền tảng dịch vụ tăng tương tác mạng xã hội (Facebook, TikTok, Instagram, YouTube, Telegram, Shopee...) hoạt động theo mô hình đại lý hoàn chỉnh, cho phép Quản trị viên đấu nối trực tiếp URL và API Key của nhà cung cấp gốc (như `https://smm.vin/api/v2` hoặc bất kỳ nguồn SMM API v2 nào), tự động đồng bộ dịch vụ, thiết lập biên lợi nhuận và phục vụ khách hàng đặt đơn tự động 24/7.

## User Review & Critical Decisions

> [!IMPORTANT]
> Dưới đây là các quyết định cốt lõi đã được chốt từ yêu cầu của bạn cùng cấu hình mặc định tối ưu trước khi tiến hành xây dựng hệ thống:

- **Mô hình vận hành đã xác nhận**: Hệ thống SMM Panel hoàn chỉnh gồm cả **Giao diện Khách hàng** (đăng nhập/chuyển đổi tài khoản, nạp tiền, tạo đơn lẻ, tạo đơn hàng loạt, quản lý lịch sử đơn, yêu cầu bảo hành/hủy đơn, tài liệu API cho đại lý cấp dưới) và **Bảng điều khiển Quản trị viên (Admin Panel)** (đấu nối nhiều nguồn SMM API v2, kiểm tra số dư nguồn, đồng bộ danh mục dịch vụ, chỉnh giá cộng thêm `%` lợi nhuận, quản lý thành viên & cộng/trừ tiền).
- **Tích hợp toàn diện chuẩn SMM API v2 (`smm.vin/api-docs`)**: Hỗ trợ đầy đủ 100% các phương thức chuẩn SMM v2 qua Backend Proxy chống lỗi CORS và bảo mật API Key gốc:
  - `action=services`: Lấy và đồng bộ toàn bộ danh sách dịch vụ, phân loại nền tảng, hạn mức `min`/`max`, trạng thái hỗ trợ `refill`/`cancel`.
  - `action=add`: Đặt đơn tiêu chuẩn, đơn bình luận tùy chỉnh (`comments`), đơn chia đợt (`runs`, `interval` - Drip-feed).
  - `action=status`: Kiểm tra tiến độ 1 đơn (`order`) hoặc nhiều đơn cùng lúc (`orders` cách nhau bằng dấu phẩy: `start_count`, `remains`, `status`, `charge`).
  - `action=refill` & `action=refill_status`: Gửi yêu cầu bảo hành bù tụt cho 1 hoặc nhiều đơn và tra cứu trạng thái bảo hành.
  - `action=cancel`: Gửi lệnh hủy và hoàn tiền cho các đơn hỗ trợ hủy.
  - `action=balance`: Kiểm tra số dư thực tế và đơn vị tiền tệ (`VND`/`USD`) của tài khoản nhà cung cấp API.
- **Chế độ Dự phòng & Kiểm thử thông minh (Sandbox Fallback)**: Khi Admin nhập API Key thực tế của `smm.vin` (hoặc nhà cung cấp bất kỳ), hệ thống sẽ gọi trực tiếp đến máy chủ nguồn. Ngoài ra, hệ thống tích hợp sẵn một bộ giả lập SMM API v2 chuẩn xác ngay trên máy chủ để bạn và khách hàng có thể trải nghiệm luồng đồng bộ dịch vụ, đặt đơn, kiểm tra trạng thái, bảo hành và hủy đơn ngay lập tức ngay cả khi chưa nạp tiền vào API gốc.

---

## 1. Overview & Core Concept

- **What It Does**: Cung cấp một cổng dịch vụ tăng tương tác mạng xã hội chuyên nghiệp, nơi chủ web chỉ cần dán API URL (mặc định cấu hình sẵn `https://smm.vin/api/v2`) và API Key nhà cung cấp để tự động nhập hàng trăm dịch vụ Facebook, TikTok, Instagram, YouTube... kèm cơ chế tự động tính giá bán lẻ theo tỷ lệ chiết khấu/lợi nhuận cài đặt sẵn.
- **Target Audience / Persona**:
  - **Chủ hệ thống (Admin)**: Người quản lý nguồn API, theo dõi số dư gốc, điều chỉnh giá bán, quản lý đơn hàng toàn hệ thống và số dư của khách.
  - **Khách hàng / CTV / Đại lý (Users)**: Người dùng cuối cần mua tương tác nhanh chóng hoặc đấu nối lại qua cổng API v2 của chính website.
- **Key Value**: Loại bỏ hoàn toàn thao tác thủ công; bảo mật tuyệt đối API Key nhà cung cấp ở tầng máy chủ (khách hàng không thể thấy nguồn gốc hay giá gốc); giao diện chuẩn SaaS tốc độ cao giúp đặt đơn trong vài giây.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Luồng Đặt Đơn Nhanh (Khách hàng)**: Chọn Nền tảng (Tất cả, Facebook, TikTok, Instagram, YouTube, Telegram...) $\rightarrow$ Chọn Danh mục (Tăng Like, Tăng Follow, Tăng View, Bình luận...) $\rightarrow$ Chọn Máy chủ dịch vụ (hiển thị rõ tốc độ, bảo hành, min/max, đơn giá/1000) $\rightarrow$ Nhập Link/UID và Số lượng (hoặc danh sách bình luận / thông số Drip-feed) $\rightarrow$ Hệ thống tự động tính Tổng thanh toán tức thời $\rightarrow$ Bấm **"Tạo Đơn Ngay"** $\rightarrow$ Trừ số dư ví và đẩy lệnh `action=add` sang nhà cung cấp.
  2. **Luồng Đặt Đơn Hàng Loạt (Mass Order)**: Nhập nhiều đơn hàng trên từng dòng theo cú pháp chuẩn `service_id | link | quantity` $\rightarrow$ Hệ thống kiểm tra tính hợp lệ, tính tổng chi phí và gửi hàng loạt lệnh tạo đơn.
  3. **Luồng Quản Lý & Đồng Bộ Đơn Hàng**: Xem bảng lịch sử đơn hàng với bộ lọc trạng thái (`Pending`, `In progress`, `Completed`, `Partial`, `Canceled`), tìm kiếm theo mã đơn hoặc link, bấm **"Đồng bộ trạng thái"** (`action=status`), **"Bảo hành / Refill"** (`action=refill`), hoặc **"Hủy đơn"** (`action=cancel`).
  4. **Luồng Quản Trị Đấu Nối API (Admin)**: Truy cập mục **Cấu hình Nguồn API (Providers)** $\rightarrow$ Nhập tên nhà cung cấp, API URL (`https://smm.vin/api/v2`), API Key, tỷ giá quy đổi và `%` lợi nhuận tăng thêm $\rightarrow$ Bấm **"Kiểm tra kết nối & Số dư"** (`action=balance`) $\rightarrow$ Bấm **"Đồng bộ Dịch vụ"** (`action=services`) để cập nhật toàn bộ bảng giá về web.

- **Visual Identity & Theme**:
  - *Aesthetic Direction*: **Dark SaaS Dashboard** hiện đại, sắc nét, mật độ thông tin cao nhưng thoáng đãng, tập trung vào tốc độ thao tác và độ tin cậy tài chính.
  - *Color Palette & Mood*:
    - Nền chính (60% Dominant Canvas): Slate đen sâu (`#0B0F19` / `bg-slate-950`).
    - Bề mặt cấu trúc (30% Structural Surfaces): Khung bảng và thẻ phẳng (`#111827` / `bg-slate-900`) với đường viền mảnh 1px (`border-slate-800`), tuân thủ nguyên tắc **Single-Elevation Depth** (không lồng nhiều lớp thẻ rối mắt).
    - Điểm nhấn (10% Accent Budget): Indigo/Cyan sắc nét (`#6366F1` / `bg-indigo-600`) cho các nút hành động chính; màu ngữ nghĩa chuẩn xác đi kèm nhãn văn bản rõ ràng: Xanh lá (`#10B981` - Hoàn thành/Hoạt động), Vàng hổ phách (`#F59E0B` - Đang chạy/Chờ xử lý), Đỏ (`#EF4444` - Đã hủy/Lỗi).
  - *Typography & Hierarchy*:
    - Tiêu đề & Điều hướng: `Plus Jakarta Sans` (SemiBold/Bold) tạo cảm giác hiện đại, rõ ràng.
    - Văn bản & Bảng dịch vụ: `DM Sans` giúp đọc lướt danh sách hàng trăm dịch vụ không mỏi mắt.
    - Con số, ID đơn hàng, Số dư & Giá tiền: `JetBrains Mono` kết hợp `tabular-nums` để mọi cột số tiền, số lượng `start_count` / `remains` thẳng hàng tuyệt đối.
  - *Component Styling & Layout*:
    - Bố cục chuẩn Workspace 1440px: Thanh điều hướng bên trái cố định (`260px` Sidebar), Thanh Header trên cùng tuân thủ nghiêm ngặt **Top Bar Contract** (Breadcrumb ngữ cảnh bên trái — Các liên kết điều hướng nhanh ở giữa — Nút hiển thị Số dư / Nạp tiền ở bên phải), và Khung nội dung chính rộng rãi.
    - Bảng dữ liệu mật độ cao (High-Density Data Grids) với chiều cao dòng gọn gàng (`40px`), căn lề trái cho tên dịch vụ/link và căn lề phải cho số lượng/chi phí.

- **Interactive Feedback & Motion**:
  - Phản hồi vi tương tác dưới `150ms` khi chuyển đổi nền tảng mạng xã hội hoặc tính toán giá tiền theo thời gian thực.
  - Hiệu ứng Skeleton mượt mà khi đang tải danh sách dịch vụ từ API nguồn; thông báo Toast rõ ràng cho từng kết quả đặt đơn, bảo hành hoặc lỗi từ API nhà cung cấp.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Kiến trúc Backend Proxy xử lý SMM API v2**
  - *Chosen Approach*: Toàn bộ yêu cầu gọi đến `https://smm.vin/api/v2` (hoặc các SMM Panel khác) đều đi qua máy chủ Express ở tầng Backend với định dạng chuẩn `application/x-www-form-urlencoded` (và hỗ trợ cả JSON).
  - *Why*: Các trang SMM API v2 chặn gọi trực tiếp từ trình duyệt do chính sách CORS, đồng thời nếu gọi từ trình duyệt sẽ làm lộ `API Key` gốc của chủ web. Đi qua Backend Proxy vừa giải quyết triệt để CORS, vừa ẩn hoàn toàn API Key và giá vốn.
  - *Alternatives Considered*: Gọi trực tiếp từ Frontend (bị loại bỏ vì lộ khóa bảo mật và lỗi CORS).

- **Decision 2: Cung cấp đồng thời Cổng API v2 riêng của Website cho Khách hàng / Đại lý dưới**
  - *Chosen Approach*: Bên cạnh việc đấu nối đi (Outbound) tới `smm.vin`, máy chủ Express của trang web cũng mở luôn endpoint `POST /api/v2` chuẩn SMM API v2 kèm trang **Tài liệu API (API Docs)** hiển thị đầy đủ mẫu code (PHP, Python, cURL) và API Key riêng của từng khách hàng.
  - *Why*: Đáp ứng đúng yêu cầu tích hợp trọn bộ tài liệu `api-docs` để khách hàng hoặc đại lý con của bạn cũng có thể dùng API Key trên web của bạn đấu nối tiếp sang hệ thống của họ.

- **Decision 3: Quản lý Trạng thái & Lưu trữ Dữ liệu Bền vững trên Server**
  - *Chosen Approach*: Lưu trữ dữ liệu (Danh sách nhà cung cấp API, Dịch vụ đã đồng bộ, Đơn hàng, Yêu cầu Refill, Lịch sử dòng tiền, Tài khoản người dùng) bền vững trên máy chủ kết hợp khả năng chuyển đổi nhanh giữa góc nhìn **Khách hàng** và **Quản trị viên (Admin)** ngay trên giao diện.
  - *Why*: Giúp bạn kiểm tra và vận hành ngay lập tức cả hai vai trò (Admin cấu hình API Key/giá bán và Khách hàng đặt đơn/kiểm tra tiến độ) một cách liền mạch, không mất dữ liệu khi tải lại trang.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND WORKSPACE (React + Tailwind)                 │
│                                                                              │
│  ┌──────────────────┐   ┌─────────────────────────────────────────────────┐  │
│  │ Sidebar Nav      │   │ Top Bar (Breadcrumb · Quick Links · Ví Số Dư)   │  │
│  ├──────────────────┤   ├─────────────────────────────────────────────────┤  │
│  │ • Đặt Đơn Mới    │   │                 MAIN VIEWPORT                   │  │
│  │ • Đơn Hàng Loạt  │   │  ┌───────────────────────────────────────────┐  │  │
│  │ • Lịch Sử Đơn    │   │  │ Customer Views:                           │  │  │
│  │ • Bảo Hành/Refill│   │  │  • NewOrderView (Lọc Nền tảng, Tính giá)  │  │  │
│  │ • Bảng Giá D.Vụ  │   │  │  • MassOrderView (Cú pháp hàng loạt)      │  │  │
│  │ • Nạp Tiền & Ví  │   │  │  • OrderHistoryView (Status/Refill/Cancel)│  │  │
│  │ • Tài Liệu API   │   │  │  • ServicesCatalogView & ApiDocsView      │  │  │
│  │ ──────────────── │   │  ├───────────────────────────────────────────┤  │  │
│  │ [Quản Trị Admin] │   │  │ Admin Views:                              │  │  │
│  │ • Nguồn SMM API  │   │  │  • ProvidersManager (URL, Key, Markup %)  │  │  │
│  │ • Quản Lý Dịch Vụ│   │  │  • ServiceSyncManager (Chỉnh giá/Ẩn hiện) │  │  │
│  │ • Quản Lý Đơn    │   │  │  • UserBalanceManager (Cộng/Trừ số dư)    │  │  │
│  └──────────────────┘   └──┴───────────────────────────────────────────┴──┘  │
└───────────────────────────────────────┬──────────────────────────────────────┘
                                        │ REST JSON (/api/*)
                                        ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                     EXPRESS BACKEND & SMM v2 ENGINE                          │
│                                                                              │
│  ┌────────────────────────────┐   ┌───────────────────────────────────────┐  │
│  │ Internal App Controllers   │   │ Public Reseller Endpoint (POST /api/v2)│  │
│  │ • /api/orders (Add/Sync)   │   │ • Hỗ trợ: services, add, status,      │  │
│  │ • /api/providers (Sync/Bal)│   │   refill, refill_status, cancel,      │  │
│  │ • /api/services, /api/user │   │   balance cho khách đấu nối           │  │
│  └─────────────┬──────────────┘   └───────────────────┬───────────────────┘  │
│                └──────────────────┬───────────────────┘                      │
│                                   ▼                                          │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ Outbound SMM API v2 Client (URLSearchParams POST -> Provider URL)      │  │
│  │ • Kết nối trực tiếp https://smm.vin/api/v2 hoặc mọi SMM Panel v2       │  │
│  │ • Tích hợp Built-in Sandbox Provider khi thử nghiệm không cần Key thật │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
```

- **Data Model & State**:
  - `ApiProvider`: `id`, `name` (VD: `SMM.VIN Main`), `url` (`https://smm.vin/api/v2`), `apiKey`, `currency`, `balance`, `exchangeRate` (tỷ giá quy đổi nếu nguồn dùng USD), `priceMarkupPercent` (`%` lợi nhuận cộng thêm), `status`.
  - `SmmService`: `service` (ID dịch vụ hiển thị trên web), `providerId`, `providerServiceId` (ID gốc tại nhà cung cấp), `platform` (Facebook, TikTok, Instagram, YouTube, Telegram, Shopee), `category`, `name`, `type` (`Default`, `Custom Comments`, `Package`), `originalRate`, `rate` (giá bán sau khi nhân lợi nhuận), `min`, `max`, `refill` (boolean), `cancel` (boolean), `dripfeed` (boolean), `description`.
  - `SmmOrder`: `id` (Mã đơn trên web), `providerId`, `providerOrderId` (Mã đơn trả về từ API nguồn), `serviceId`, `serviceName`, `link`, `quantity`, `charge`, `start_count`, `remains`, `status` (`Pending`, `Processing`, `In progress`, `Completed`, `Partial`, `Canceled`, `Refunded`), `comments`, `runs`, `interval`, `refillId`, `refillStatus`, `createdAt`, `updatedAt`.
  - `UserAccount`: `id`, `username`, `role` (`admin` | `customer`), `balance`, `totalSpent`, `apiKey` (Key riêng để khách dùng đấu nối vào `/api/v2`), `transactions` (lịch sử nạp tiền, trừ tiền đơn hàng, hoàn tiền).

- **Interactive Component & State Mapping**:
  - **Đặt đơn lẻ (`NewOrderView`)**: Chọn nền tảng sẽ lọc danh sách `category`; chọn `category` lọc danh sách `service`. Khi đổi `service` hoặc nhập `quantity` (hoặc đếm số dòng `comments` đối với loại `Custom Comments`, hoặc nhân số lần `runs` với `Drip-feed`), hệ thống kiểm tra tức thời điều kiện `min <= quantity <= max` và cập nhật `charge = (quantity / 1000) * service.rate`. Khi bấm đặt đơn, kiểm tra số dư ví, gọi `POST /api/orders` để máy chủ bắn lệnh `action=add` tới nhà cung cấp, lưu `providerOrderId` và trừ số dư.
  - **Lịch sử & Đồng bộ đơn (`OrderHistoryView`)**: Cho phép chọn 1 hoặc nhiều đơn để bấm **"Cập nhật tiến độ"** (gửi `action=status` với tham số `order` hoặc `orders` danh sách ID cách nhau dấu phẩy), tự động cập nhật `start_count`, `remains`, `status` và hoàn tiền tự động vào ví nếu đơn chuyển sang `Canceled` hoặc `Partial`. Các đơn có `refill: true` hiển thị nút **"Bảo hành (Refill)"** gọi `action=refill` và nút kiểm tra `action=refill_status`. Các đơn đang chạy có `cancel: true` hiển thị nút **"Hủy đơn"** gọi `action=cancel`.
  - **Quản lý Nguồn API (`ProvidersManager`)**: Cho phép thêm mới, sửa URL/Key, bấm **"Kiểm tra Số dư"** (`action=balance`), bấm **"Đồng bộ Dịch vụ"** (`action=services`) tự động phân loại nền tảng (nhận diện từ khóa Facebook, TikTok, Instagram, YouTube, Telegram...) và áp dụng công thức giá bán `rate = originalRate * exchangeRate * (1 + priceMarkupPercent / 100)`.
  - **Trang Tài liệu API (`ApiDocsView`)**: Hiển thị bảng thông số kỹ thuật chuẩn `smm.vin/api-docs` cho toàn bộ 7 hành động (`services`, `add`, `status` đơn lẻ & hàng loạt, `refill`, `refill_status`, `cancel`, `balance`), kèm nút **"Đổi API Key mới"** và trình **API Playground** cho phép chạy thử trực tiếp từng lệnh API ngay trên trình duyệt và xem phản hồi JSON thực tế.
