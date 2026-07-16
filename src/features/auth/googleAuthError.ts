const GOOGLE_AUTH_ERROR_MESSAGES: Record<string, string> = {
  'auth/unauthorized-domain': 'Tên miền hiện tại chưa được cấp quyền đăng nhập trong Firebase.',
  'auth/operation-not-allowed': 'Phương thức đăng nhập Google chưa được bật trong Firebase.',
  'auth/popup-blocked': 'Trình duyệt đã chặn cửa sổ đăng nhập Google. Hãy cho phép popup hoặc dùng đăng nhập chuyển hướng.',
  'auth/popup-closed-by-user': 'Bạn đã đóng cửa sổ đăng nhập trước khi hoàn tất.',
  'auth/network-request-failed': 'Không thể kết nối đến dịch vụ đăng nhập Google. Hãy kiểm tra mạng và thử lại.',
  'auth/cancelled-popup-request': 'Một yêu cầu đăng nhập khác đang được thực hiện.',
  'auth/internal-error': 'Dịch vụ đăng nhập đang gặp lỗi tạm thời. Vui lòng thử lại.',
};

export function googleAuthErrorMessage(code: string | null): string {
  return code && GOOGLE_AUTH_ERROR_MESSAGES[code]
    ? GOOGLE_AUTH_ERROR_MESSAGES[code]
    : 'Không thể đăng nhập bằng Google. Vui lòng thử lại.';
}

export function shouldOfferRedirectFallback(code: string | null): boolean {
  return code === 'auth/popup-blocked';
}
