/**
 * Unified API response helpers for Salio backend.
 * All responses follow the structure:
 *   { success, message, data?, errors? }
 */

export const sendSuccess = (res, { status = 200, message = 'OK', data = undefined } = {}) => {
  const body = { success: true, message };
  if (data !== undefined) body.data = data;
  return res.status(status).json(body);
};

export const sendError = (res, { status = 500, message = 'Lỗi server', errors = undefined } = {}) => {
  const body = { success: false, message };
  if (errors !== undefined) body.errors = errors;
  return res.status(status).json(body);
};

// Shorthand helpers
export const created    = (res, data, message = 'Tạo thành công')    => sendSuccess(res, { status: 201, message, data });
export const ok         = (res, data, message = 'Thành công')        => sendSuccess(res, { status: 200, message, data });
export const badRequest = (res, message, errors)                     => sendError(res, { status: 400, message, errors });
export const unauthorized = (res, message = 'Chưa xác thực')        => sendError(res, { status: 401, message });
export const forbidden  = (res, message = 'Không có quyền truy cập')=> sendError(res, { status: 403, message });
export const notFound   = (res, message = 'Không tìm thấy')         => sendError(res, { status: 404, message });
export const conflict   = (res, message = 'Dữ liệu đã tồn tại')     => sendError(res, { status: 409, message });
export const serverError= (res, message = 'Lỗi máy chủ nội bộ')    => sendError(res, { status: 500, message });