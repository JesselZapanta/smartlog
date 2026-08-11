<?php

namespace App\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class RegistrationApprovalNotification extends Mailable
{
    public function __construct(
        public string $fullName,
        public bool $approved,
        public ?string $reason = null,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            from: new Address(config('mail.from.address'), 'SMARTLOG'),
            subject: $this->approved
                ? 'Your SMARTLOG registration was approved'
                : 'Your SMARTLOG registration was rejected',
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
        $fullName = e($this->fullName);
        $reason = e($this->reason ?? '');

        $headline = $this->approved ? 'Registration approved!' : 'Registration rejected';
        $headlineColor = $this->approved ? '#15803d' : '#b91c1c';
        $message = $this->approved
            ? "Good news, {$fullName}! Your OJT registration has been approved. You can now sign in to SMARTLOG and start your internship journey."
            : "We're sorry, {$fullName}. Your OJT registration was not approved. Review the reason below, fix the details, and resubmit your registration.";

        $reasonBlock = $this->reason
            ? <<<HTML
            <div style="margin-top:22px;background:#fef2f2;border:1px solid #fecaca;border-radius:14px;padding:16px 18px;">
                <div style="font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;letter-spacing:2px;color:#b91c1c;">REASON FOR REJECTION</div>
                <div style="margin-top:6px;font-size:14px;color:#7f1d1d;line-height:1.6;">{$reason}</div>
            </div>
            HTML
            : '';

        $loginUrl = rtrim((string) config('app.frontend_url'), '/').'/login';

        $ctaLabel = $this->approved ? 'Sign in to SMARTLOG' : 'Fix and resubmit';

        $subject = $this->approved
            ? 'Your SMARTLOG registration was approved'
            : 'Your SMARTLOG registration was rejected';

        $preheader = $this->approved
            ? 'Your SMARTLOG registration was approved.'
            : 'Your SMARTLOG registration was rejected.';

        $cta = <<<HTML
        <a href="{$loginUrl}" style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;font-family:'Sora',Arial,sans-serif;font-size:14px;font-weight:700;padding:13px 28px;border-radius:12px;">{$ctaLabel}</a>
        HTML;

        return <<<HTML
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <meta name="x-apple-disable-message-reformatting">
            <title>{$subject}</title>
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
        </head>
        <body style="margin:0;padding:0;background:#f9fafb;font-family:'Sora','DM Sans',Arial,Helvetica,sans-serif;color:#111827;-webkit-font-smoothing:antialiased;">
            <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">
                {$preheader}
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
                                    <div style="font-family:'Sora',Arial,sans-serif;font-size:22px;font-weight:700;color:{$headlineColor};">{$headline}</div>
                                    <p style="margin:10px 0 0;font-size:14px;line-height:1.6;color:#4b5563;">{$message}</p>
                                    {$reasonBlock}

                                    <!-- CTA -->
                                    <div style="text-align:center;margin-top:26px;">{$cta}</div>
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
