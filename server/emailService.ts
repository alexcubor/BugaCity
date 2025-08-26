import nodemailer from 'nodemailer';

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Создаем транспортер для отправки email через ваш SMTP сервер
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.jino.ru',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, // Для порта 587 используем STARTTLS
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  async sendVerificationEmail(email: string, code: string): Promise<void> {
    const mailOptions = {
      from: '"GlukoCity" <hello@gluko.city>', // От кого
      to: email, // Кому
      subject: 'Подтверждение регистрации - Глюкоград', // Тема
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">🎮 Глюкоград</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Волшебство в твоем городе только начинается!</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">Подтверди свой email</h2>
            
            <p style="color: #666; line-height: 1.6;">
              Для завершения регистрации введи следующий код подтверждения на сайте Глюкоград:
            </p>
            
            <div style="background: white; border: 2px solid #667eea; border-radius: 8px; padding: 25px; text-align: center; margin: 25px 0;">
              <div style="font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                ${code}
              </div>
            </div>
            
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #856404;">
                ⏰ <strong>Код действителен в течение 10 минут</strong>
              </p>
            </div>
            
            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              Если вы не регистрировались в Глюкограде, просто проигнорируйте это письмо.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; padding: 20px; border-top: 1px solid #eee;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              С уважением,<br>
              Команда GlukoCity<br>
              <a href="https://gluko.city" style="color: #667eea;">gluko.city</a>
            </p>
          </div>
        </div>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email отправлен на ${email}`);
    } catch (error) {
      console.error('❌ Ошибка отправки email:', error);
      throw error;
    }
  }

  // Тестовая функция для проверки подключения
  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log('✅ SMTP подключение успешно');
      return true;
    } catch (error) {
      console.error('❌ Ошибка SMTP подключения:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();
