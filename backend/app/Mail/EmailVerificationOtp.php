<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class EmailVerificationOtp extends Mailable implements ShouldQueue
{
    public function __construct(
        public string $code,
        public int $expiresInMinutes,
        public ?User $user = null,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            from: new Address(config('mail.from.address'), 'SMARTLOG'),
            subject: 'Your SMARTLOG verification code',
        );
    }

    public function content(): Content
    {
        return new Content(
            htmlString: $this->buildHtml(),
        );
    }

    private function buildHtml(): string
    {
        $firstName = e($this->user?->firstname ?: 'there');

        $verifyUrl = rtrim((string) config('app.frontend_url'), '/').'/verify-email';

        if ($this->user?->email) {
            $verifyUrl .= '?email='.urlencode($this->user->email);
        }

        return <<<HTML
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <meta name="x-apple-disable-message-reformatting">
            <title>Your SMARTLOG verification code</title>
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
        </head>
        <body style="margin:0;padding:0;background:#f9fafb;font-family:'Sora','DM Sans',Arial,Helvetica,sans-serif;color:#111827;-webkit-font-smoothing:antialiased;">
            <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">
                Use the code {$this->code} to verify your SMARTLOG account. It expires in {$this->expiresInMinutes} minutes.
            </div>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f9fafb;">
                <tr>
                    <td align="center" style="padding:24px 16px 40px;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">

                            <!-- Hero -->
                            <tr>
                                <td style="background:linear-gradient(135deg,#052e16 0%,#14532d 55%,#166534 100%);border-radius:24px 24px 0 0;padding:32px 24px 28px;text-align:center;">
                                    <div style="font-family:'Sora',Arial,sans-serif;font-size:24px;font-weight:800;color:#ffffff;letter-spacing:1px;">SMARTLOG</div>
                                    <div style="margin-top:4px;font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:600;letter-spacing:3.5px;color:#86efac;">OJT MONITORING SYSTEM</div>
                                </td>
                            </tr>

                            <!-- Card -->
                            <tr>
                                <td style="background:#ffffff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 20px 20px;padding:28px 28px 32px;">
                                    <div style="font-size:15px;font-weight:600;color:#111827;">Hi {$firstName},</div>
                                    <div style="margin-top:6px;font-family:'Sora',Arial,sans-serif;font-size:22px;font-weight:700;color:#14532d;">Verify your email address</div>
                                    <p style="margin:10px 0 0;font-size:14px;line-height:1.6;color:#4b5563;">
                                        Use the one-time passcode below to activate your SMARTLOG account. The code is valid for
                                        <strong>{$this->expiresInMinutes} minutes</strong>.
                                    </p>

                                    <!-- OTP -->
                                    <div style="margin-top:22px;background:#f0fdf4;border:1px dashed #86efac;border-radius:14px;padding:18px 16px;text-align:center;">
                                        <div style="font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;letter-spacing:2px;color:#15803d;">ONE-TIME PASSCODE</div>
                                        <div style="margin-top:10px;font-family:'JetBrains Mono','Courier New',monospace;font-size:34px;font-weight:700;letter-spacing:9px;color:#166534;">{$this->code}</div>
                                    </div>

                                    <p style="margin:16px 0 0;font-size:13px;color:#6b7280;text-align:center;">
                                        Expires in <strong>{$this->expiresInMinutes} minutes</strong> — never share this code with anyone.
                                    </p>

                                    <!-- CTA -->
                                    <div style="text-align:center;margin-top:22px;">
                                        <a href="{$verifyUrl}" style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;font-family:'Sora',Arial,sans-serif;font-size:14px;font-weight:700;padding:13px 28px;border-radius:12px;">Open SMARTLOG</a>
                                    </div>

                                    <!-- Security -->
                                    <div style="margin-top:22px;padding-top:18px;border-top:1px solid #f3f4f6;text-align:center;">
                                        <p style="margin:0;font-size:12px;line-height:1.6;color:#9ca3af;">
                                            If you did not create a SMARTLOG account, you can safely ignore this email.<br>
                                            SMARTLOG will never ask you for this passcode outside the app.
                                        </p>
                                    </div>
                                </td>
                            </tr>

                            <!-- Footer -->
                            <tr>
                                <td style="padding:18px 16px 0;text-align:center;">
                                    <div style="font-size:11px;color:#9ca3af;line-height:1.7;">
                                        Tangub City Global College — Office of Practicum &amp; Alumni Affairs<br>
                                        <span style="font-family:'JetBrains Mono',monospace;">SMARTLOG · OJT MONITORING SYSTEM</span>
                                    </div>
                                </td>
                            </tr>

                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        HTML;
    }
}
