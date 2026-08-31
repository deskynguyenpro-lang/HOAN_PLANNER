/**
 * Danh sách email được phép đăng nhập, lấy từ biến môi trường ALLOWED_EMAILS
 * (các email cách nhau bằng dấu phẩy). Nếu để trống → chặn tất cả (an toàn mặc định).
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
  if (list.length === 0) return false;
  return list.includes(email.trim().toLowerCase());
}
