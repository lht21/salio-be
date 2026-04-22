import nodemailer from 'nodemailer';

// ─── OTP Email Template ─────────────────────────────────────────────────────
const buildOtpEmailHTML = (otp, expiresMinutes, type) => {
  const title = type === 'reset' ? 'Khôi phục mật khẩu Salio' : 'Mã xác nhận Salio';
  const description = type === 'reset' 
    ? 'Sử dụng mã bên dưới để đặt lại mật khẩu tài khoản Salio của bạn.' 
    : 'Sử dụng mã bên dưới để xác minh địa chỉ email và hoàn tất đăng ký tài khoản Salio.';

  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Mã xác nhận Salio</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0"
          style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <tr>
            <td style="background:linear-gradient(135deg,#a8e063 0%,#56ab2f 100%);padding:40px 0;text-align:center;">
              <h1 style="margin:0;font-size:36px;font-weight:800;color:#1a4d1a;letter-spacing:2px;">Salio</h1>
              <p style="margin:8px 0 0;color:#2d7a2d;font-size:14px;">Học và thi tiếng Hàn tốt hơn bao giờ hết!</p>
            </td>
          </tr>

          <tr>
            <td style="padding:40px 48px;">
              <h2 style="margin:0 0 12px;font-size:22px;color:#1a1a1a;">${title}</h2>
              <p style="margin:0 0 32px;font-size:15px;color:#666;line-height:1.6;">
                ${description}
              </p>

              <div style="background:#f0faf0;border:2px dashed #56ab2f;border-radius:12px;padding:24px;text-align:center;margin-bottom:32px;">
                <p style="margin:0 0 8px;font-size:13px;color:#888;text-transform:uppercase;letter-spacing:1px;">Mã xác nhận</p>
                <p style="margin:0;font-size:44px;font-weight:800;letter-spacing:14px;color:#1a4d1a;font-family:'Courier New',monospace;">${otp}</p>
              </div>

              <p style="margin:0 0 8px;font-size:14px;color:#999;">
                ⏱ Mã có hiệu lực trong <strong>${expiresMinutes} phút</strong>.
              </p>
              <p style="margin:0;font-size:14px;color:#999;">
                🔒 Không chia sẻ mã này với bất kỳ ai.
              </p>
            </td>
          </tr>

          <tr>
            <td style="background:#fafafa;padding:24px 48px;border-top:1px solid #f0f0f0;">
              <p style="margin:0;font-size:13px;color:#aaa;text-align:center;">
                Nếu bạn không yêu cầu mã này, hãy bỏ qua email này. <br/>
                &copy; ${new Date().getFullYear()} Salio · All rights reserved
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
};

// ─── Send OTP ────────────────────────────────────────────────────────────────
const sendOtpEmail = async (toEmail, otp, type = 'register') => {
  // KHỞI TẠO TRANSPORTER TẠI ĐÂY - Đảm bảo các biến process.env đã sẵn sàng
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_PORT == 465, // true for 465, false for 587
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const expiresMinutes = parseInt(process.env.OTP_EXPIRES_MINUTES, 10) || 10;
  const subject = type === 'reset' ? 'Mã xác nhận đặt lại mật khẩu Salio' : `${otp} là mã xác nhận Salio của bạn`;

  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: toEmail,
      subject: subject,
      html: buildOtpEmailHTML(otp, expiresMinutes, type),
      text: `Mã xác nhận Salio của bạn là: ${otp}. Mã có hiệu lực trong ${expiresMinutes} phút.`,
    };
    
    // Thực hiện gửi mail
    await transporter.sendMail(mailOptions);
    console.log(`✅ OTP email sent to ${toEmail}`);
  } catch (error) {
    console.error(`❌ Error sending OTP email to ${toEmail}:`, error);
    // Re-throw to be handled by the controller's try-catch block
    throw new Error('Could not send OTP email.');
  }
};

export default sendOtpEmail;