/**
 * Danh sách email được phép đăng nhập, lấy từ biến môi trường ALLOWED_EMAILS
 * (các email cách nhau bằng dấu phẩy).
 *
 * - Bỏ trống / không đặt biến  → MỞ: ai có email cũng đăng ký & đăng nhập được.
 * - Có đặt giá trị             → KHOÁ: chỉ các email trong danh sách.
 *
 * Mỗi người dùng có không gian dữ liệu riêng (Row Level Security theo user_id).
 */
export function allowedEmails(): string[] {
  return (process.env.ALLOWED_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isEmailAllowed(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = allowedEmails();
  if (list.length === 0) return true; // không khai báo → cho tất cả
  return list.includes(email.trim().toLowerCase());
}
