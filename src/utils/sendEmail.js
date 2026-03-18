import nodemailer from 'nodemailer';

const sendEmail = async (options) => {
    // 1. Tạo transporter (cấu hình dịch vụ gửi email)
    // Bạn có thể sử dụng các dịch vụ như Gmail, SendGrid, Mailgun, v.v.
    // Dưới đây là ví dụ với Gmail, nhưng KHÔNG NÊN dùng trong môi trường production
    // vì Gmail có giới hạn và không được thiết kế cho mục đích này.
    // Nên sử dụng các dịch vụ chuyên nghiệp như SendGrid, Mailgun, AWS SES.
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: process.env.EMAIL_PORT == 465, // true for 465, false for other ports
        auth: {
            user: process.env.EMAIL_USERNAME,
            pass: process.env.EMAIL_PASSWORD
        }
    });

    // 2. Định nghĩa các tùy chọn email
    const mailOptions = {
        from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
        to: options.email,
        subject: options.subject,
        text: options.message,
        // html: options.html // Bạn có thể dùng HTML thay vì text
    };

    // 3. Gửi email
    await transporter.sendMail(mailOptions);
};

export default sendEmail;