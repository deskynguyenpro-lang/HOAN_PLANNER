# Kế hoạch phát triển bản thân

Ứng dụng web cá nhân để **lập kế hoạch** và **nhận phản hồi hiệu quả** cho 4 trụ cột:
**Công việc · Học tập · Sức khỏe · Nghiên cứu**.

- **Hôm nay** — lịch trình theo khung giờ, đánh dấu hoàn thành / bỏ lỡ (kèm lý do).
- **Lịch** — bức tranh theo tháng / năm, mức độ hoàn thành mỗi ngày.
- **Mục tiêu** — đích lớn (IELTS 6.5, xuất bản paper…), gắn mục tiêu ngày vào để đo tiến độ.
- **Phân tích** — Báo cáo (biểu đồ) + **Tổng kết tuần tự động** (chấm điểm, so tuần trước).
- **Tổng quan** — dải quỹ đạo 12 tuần, cảnh báo lệch hướng, tổng kết mới nhất.
- **Phân tích bằng AI** (tuỳ chọn) — mentor tiếng Việt đọc số liệu 30 ngày và gợi ý điều chỉnh.

Công nghệ: **Next.js 15** (Node.js) · **Supabase** (Postgres + đăng nhập bằng email) · Tailwind CSS · Recharts. Triển khai trên **Vercel**.

---

## Triển khai từ đầu (khoảng 15–20 phút)

Cần 3 tài khoản miễn phí: **GitHub** (đã có), **Supabase**, và **Vercel**.
Tài khoản **Anthropic** chỉ cần nếu muốn dùng nút "Phân tích bằng AI".

### Bước 1 — Tạo project Supabase

1. Vào [supabase.com](https://supabase.com) → **Sign in** (nên đăng nhập bằng chính tài khoản GitHub) → **New project**.
   - Đặt tên bất kỳ, chọn **Region** gần Việt Nam (Singapore), đặt **Database Password** (lưu lại, ít dùng về sau).
2. Đợi project khởi tạo (~2 phút).
3. Mở tab **SQL Editor** (biểu tượng `>_` bên trái) → **New query** → dán **toàn bộ** nội dung file
   [`supabase/schema.sql`](supabase/schema.sql) trong repo này → bấm **Run**.
   Kết quả báo `Success. No rows returned` là đạt. Thao tác này an toàn khi chạy lại nhiều lần.
4. Vào **Project Settings → Data API**, copy giá trị **Project URL** (dạng `https://xxxx.supabase.co`).
5. Vào **Project Settings → API Keys**, copy khoá **`anon` `public`** (chuỗi dài bắt đầu bằng `eyJ...`).
6. Vào **Authentication → Sign In / Providers → Email**:
   - Bật **Enable Email provider**.
   - **Tắt** "Confirm email" (không cần, vì đăng nhập bằng liên kết một lần).
   - (Tuỳ chọn) Nếu muốn nhập **mã 6 số** thay vì bấm liên kết: vào
     **Authentication → Emails → Magic Link**, sửa template thêm dòng chứa `{{ .Token }}`.
7. Phần URL cấu hình để sau **Bước 4** (khi đã có domain Vercel thật).

### Bước 2 — Đưa code lên GitHub

Nếu bạn cho mình quyền (`gh auth login`), mình đẩy giúp. Nếu tự làm:

```bash
# tại thư mục ke-hoach-phat-trien
git init
git add -A
git commit -m "Kế hoạch phát triển bản thân - bản đầu"
git branch -M main
git remote add origin https://github.com/<tài-khoản>/<tên-repo>.git
git push -u origin main
```

> Repo này **không** commit file `.env*` (đã có trong `.gitignore`). Khoá bí mật chỉ đặt trên Vercel.

### Bước 3 — Import vào Vercel

1. Vào [vercel.com](https://vercel.com) → **Sign Up / Log in** → **Continue with GitHub**.
2. **Add New… → Project** → chọn repo vừa push → **Import**.
3. Vercel tự nhận diện **Next.js** — không cần chỉnh Build/Output.
4. Mở **Environment Variables**, thêm các biến sau (xem [`.env.example`](.env.example)):

   | Key | Value | Bắt buộc |
   |---|---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL ở Bước 1.4 | ✅ |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key ở Bước 1.5 | ✅ |
   | `NEXT_PUBLIC_SITE_URL` | tạm để trống, điền ở Bước 4 | – |
   | `ALLOWED_EMAILS` | danh sách email được phép (xem bên dưới) | – |
   | `ANTHROPIC_API_KEY` | khoá Anthropic (nếu dùng AI) | – |
   | `ANTHROPIC_MODEL` | mặc định `claude-sonnet-5` nếu bỏ trống | – |

   > **`ALLOWED_EMAILS`** quyết định ai vào được:
   > - **Không đặt biến (hoặc để trống)** → **mở**: bất kỳ ai có email đều tự đăng ký & đăng nhập
   >   (mỗi người một không gian dữ liệu riêng).
   > - **Đặt giá trị** (vd `a@gmail.com,b@gmail.com`, cách nhau bằng dấu phẩy, không dấu cách) →
   >   **khoá**: chỉ các email đó vào được.
   >
   > Đổi lúc nào cũng được: sửa/xoá biến trên Vercel rồi **Redeploy**.

5. Bấm **Deploy**. Đợi ~1–2 phút → có link dạng `https://<tên-repo>.vercel.app`.

### Bước 4 — Nối Supabase với domain thật

1. Trên Vercel → **Settings → Environment Variables** → sửa `NEXT_PUBLIC_SITE_URL`
   thành domain thật (vd `https://ke-hoach-phat-trien.vercel.app`) → **Save**.
2. Trên Supabase → **Authentication → URL Configuration**:
   - **Site URL**: `https://<domain-vercel>`
   - **Redirect URLs**: thêm `https://<domain-vercel>/auth/callback`
     (và `http://localhost:3000/auth/callback` nếu chạy máy).
3. Trên Vercel → tab **Deployments** → "…" ở bản mới nhất → **Redeploy**.
4. Mở domain → nhập email (đúng email trong `ALLOWED_EMAILS`) → mở hộp thư → bấm liên kết → xong.

### Bước 5 — (Tuỳ chọn) Bật "Phân tích bằng AI"

1. Vào [console.anthropic.com](https://console.anthropic.com) → **API Keys** → tạo key (cần thêm phương thức thanh toán).
2. Trên Vercel → **Settings → Environment Variables** → thêm `ANTHROPIC_API_KEY` → **Save** → **Redeploy**.

Không làm bước này thì mọi thứ khác vẫn chạy — chỉ riêng nút "Phân tích hiệu quả kế hoạch" báo lỗi cấu hình.

---

## Cập nhật app về sau

- **Sửa nhanh trên GitHub**: mở file trong repo → biểu tượng bút chì → sửa → **Commit**.
  Vercel tự build lại sau vài chục giây.
- **Sửa trên máy**: sửa code → `git commit` → `git push`. Vercel tự deploy.
- **Nhờ Claude sửa tiếp**: mở thư mục này trong Claude Code, mô tả thay đổi mong muốn.

## Chạy trên máy (tuỳ chọn)

```bash
npm install
cp .env.example .env.local     # rồi điền NEXT_PUBLIC_SUPABASE_* và ALLOWED_EMAILS
npm run dev                     # http://localhost:3000
```

Yêu cầu Node.js ≥ 18.18 (khuyến nghị 20+).

## Cấu trúc thư mục

```
src/
├── app/
│   ├── (app)/                 ← các trang cần đăng nhập
│   │   ├── tong-quan/         ← Dashboard
│   │   ├── hom-nay/           ← Timeline trong ngày
│   │   ├── lich/              ← Lịch tháng/năm
│   │   ├── muc-tieu/          ← Mục tiêu lớn
│   │   └── phan-tich/         ← Báo cáo + Tổng kết tuần
│   ├── api/analyze/           ← cầu nối gọi Anthropic (khoá ở server)
│   ├── auth/                  ← callback / signout đăng nhập
│   └── login/                 ← trang đăng nhập bằng email
├── components/                ← UI theo từng khu vực
├── lib/
│   ├── domain/                ← toàn bộ logic tính toán (thuần, không phụ thuộc UI)
│   ├── data/                  ← đọc/ghi Supabase + tổng kết tuần
│   ├── supabase/              ← khởi tạo client (browser / server / middleware)
│   └── auth/allowlist.ts      ← kiểm tra ALLOWED_EMAILS
└── middleware.ts              ← chặn trang khi chưa đăng nhập
supabase/schema.sql            ← lược đồ CSDL + Row Level Security
```

## Dữ liệu & riêng tư

- Mỗi người chỉ đọc/ghi được dữ liệu của chính mình (Row Level Security ở Postgres).
- Mặc định **mở đăng ký**: ai có email cũng dùng được. Đặt `ALLOWED_EMAILS` để khoá lại chỉ vài người.
- Không có mật khẩu lưu ở đâu — đăng nhập bằng mã 6 số (hoặc liên kết) một lần gửi qua email.
- Sao lưu ngoài: **Thiết lập → Sao lưu / Khôi phục** (xuất/nhập JSON).

## Xử lý sự cố

| Hiện tượng | Cách xử lý |
|---|---|
| Đăng nhập báo "Email này chưa được cấp quyền" | Kiểm tra `ALLOWED_EMAILS` trên Vercel có đúng địa chỉ, rồi **Redeploy**. |
| Bấm liên kết trong email nhưng quay lại trang đăng nhập | Kiểm tra **Redirect URLs** ở Supabase có `.../auth/callback`; kiểm tra `NEXT_PUBLIC_SITE_URL` đúng domain. |
| Không nhận được email | Inbox đầy? Thử email khác (nhớ thêm vào `ALLOWED_EMAILS`). Supabase bản free giới hạn ~vài email/giờ. |
| Trang trắng, góc dưới báo "Lưu lỗi" | Sai `NEXT_PUBLIC_SUPABASE_URL` / `ANON_KEY`, hoặc chưa chạy `schema.sql`. |
| Nút AI báo lỗi cấu hình | Chưa thêm `ANTHROPIC_API_KEY` trên Vercel, hoặc chưa Redeploy sau khi thêm. |
