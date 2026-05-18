import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
	host: process.env['EMAIL_SMTP_HOST'] || 'smtp.ethereal.email',
	port: parseInt(process.env['EMAIL_SMTP_PORT'] || '587'),
	secure: process.env['EMAIL_SMTP_SECURE'] === 'true',
	auth: {
		user: process.env['EMAIL_SMTP_USER'] || '',
		pass: process.env['EMAIL_SMTP_PASS'] || '',
	},
});

const FROM_ADDRESS = process.env['EMAIL_FROM'] || 'Focal <noreply@focal.app>';

export async function sendPasswordResetEmail(to: string, code: string): Promise<void> {
	await transporter.sendMail({
		from: FROM_ADDRESS,
		to,
		subject: 'Your Focal password reset code',
		text: [
			`Your password reset code is: ${code}`,
			'',
			'This code expires in 10 minutes. If you did not request a password reset, you can safely ignore this email.',
		].join('\n'),
		html: `
			<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
				<h2 style="margin:0 0 8px;font-size:22px;color:#111">Reset your password</h2>
				<p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.5">
					Use the code below to reset your Focal password. It expires in <strong>10 minutes</strong>.
				</p>
				<div style="background:#f5f5f5;border-radius:12px;padding:20px 24px;text-align:center;margin-bottom:24px">
					<span style="font-size:36px;font-weight:700;letter-spacing:12px;color:#111">${code}</span>
				</div>
				<p style="margin:0;color:#999;font-size:13px;line-height:1.5">
					If you did not request a password reset, you can safely ignore this email.
				</p>
			</div>
		`,
	});
}
