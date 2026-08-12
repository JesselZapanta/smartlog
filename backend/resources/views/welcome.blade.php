<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>SMARTLOG API — OJT Monitoring System</title>
        <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2064%2064%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22g%22%20x1%3D%226%22%20y1%3D%226%22%20x2%3D%2258%22%20y2%3D%2258%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%3Cstop%20offset%3D%220%22%20stop-color%3D%22%2315803d%22%2F%3E%3Cstop%20offset%3D%220.55%22%20stop-color%3D%22%2316a34a%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%2310b981%22%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Crect%20x%3D%222%22%20y%3D%222%22%20width%3D%2260%22%20height%3D%2260%22%20rx%3D%2218%22%20fill%3D%22url(%23g)%22%2F%3E%3Crect%20x%3D%2221%22%20y%3D%2220%22%20width%3D%227%22%20height%3D%227%22%20rx%3D%221.8%22%20fill%3D%22%23ffffff%22%2F%3E%3Crect%20x%3D%2221%22%20y%3D%2228.5%22%20width%3D%227%22%20height%3D%227%22%20rx%3D%221.8%22%20fill%3D%22%2315803d%22%2F%3E%3Cpath%20d%3D%22M22.9%2032.2%2024.2%2033.5%2026.7%2030.9%22%20stroke%3D%22%23ffffff%22%20stroke-width%3D%221.7%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20fill%3D%22none%22%2F%3E%3Crect%20x%3D%2221%22%20y%3D%2237%22%20width%3D%227%22%20height%3D%227%22%20rx%3D%221.8%22%20fill%3D%22%23ffffff%22%2F%3E%3Crect%20x%3D%2232.5%22%20y%3D%2223.6%22%20width%3D%2211.5%22%20height%3D%222.4%22%20rx%3D%221.2%22%20fill%3D%22%23ffffff%22%20opacity%3D%220.95%22%2F%3E%3Crect%20x%3D%2232.5%22%20y%3D%2232.1%22%20width%3D%2211.5%22%20height%3D%222.4%22%20rx%3D%221.2%22%20fill%3D%22%23ffffff%22%20opacity%3D%220.95%22%2F%3E%3Crect%20x%3D%2232.5%22%20y%3D%2240.6%22%20width%3D%2211.5%22%20height%3D%222.4%22%20rx%3D%221.2%22%20fill%3D%22%23ffffff%22%20opacity%3D%220.95%22%2F%3E%3C%2Fsvg%3E">

        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=DM+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">

        <style>
            :root {
                --green-50: #f0fdf4;
                --green-100: #dcfce7;
                --green-600: #16a34a;
                --green-700: #15803d;
                --green-900: #14532d;
                --green-950: #052e16;
                --emerald-300: #86efac;
                --teal-500: #14b8a6;
                --gray-50: #f9fafb;
                --gray-400: #9ca3af;
                --gray-500: #6b7280;
                --gray-600: #4b5563;
                --gray-900: #111827;
            }

            * {
                box-sizing: border-box;
            }

            html,
            body {
                margin: 0;
                padding: 0;
                min-height: 100%;
                width: 100%;
                overflow-x: hidden;
            }

            body {
                font-family: "DM Sans", ui-sans-serif, system-ui, sans-serif;
                background: var(--gray-50);
                color: var(--gray-900);
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
            }

            h1,
            h2,
            h3 {
                font-family: "Sora", sans-serif;
                margin: 0;
            }

            code,
            .mono {
                font-family: "JetBrains Mono", ui-monospace, monospace;
            }

            .page {
                display: flex;
                flex-direction: column;
                min-height: 100vh;
            }

            /* ---------- Top bar ---------- */
            .topbar {
                position: sticky;
                top: 0;
                z-index: 20;
                background: rgba(5, 46, 22, 0.92);
                backdrop-filter: blur(8px);
                border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            }

            .topbar-inner {
                max-width: 1080px;
                margin: 0 auto;
                padding: 12px 16px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
            }

            .brand {
                display: flex;
                align-items: center;
                gap: 10px;
                min-width: 0;
            }

            .brand-mark {
                width: 38px;
                height: 38px;
                flex-shrink: 0;
                border-radius: 11px;
                background: linear-gradient(135deg, #15803d, #16a34a 55%, #10b981);
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 14px rgba(22, 163, 74, 0.35);
            }

            .brand-name {
                font-family: "Sora", sans-serif;
                font-weight: 700;
                letter-spacing: -0.02em;
                color: #ffffff;
                font-size: 15px;
                line-height: 1.1;
            }

            .brand-tag {
                font-family: "JetBrains Mono", monospace;
                font-size: 9px;
                font-weight: 500;
                letter-spacing: 0.14em;
                color: var(--emerald-300);
                margin-top: 3px;
                white-space: nowrap;
            }

            .api-pill {
                flex-shrink: 0;
                display: inline-flex;
                align-items: center;
                gap: 7px;
                font-family: "JetBrains Mono", monospace;
                font-size: 11px;
                font-weight: 500;
                letter-spacing: 0.12em;
                color: var(--emerald-300);
                background: rgba(255, 255, 255, 0.08);
                border: 1px solid rgba(255, 255, 255, 0.16);
                border-radius: 999px;
                padding: 7px 14px;
            }

            .api-pill::before {
                content: "";
                width: 7px;
                height: 7px;
                border-radius: 50%;
                background: #22c55e;
                box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.25);
            }

            /* ---------- Hero ---------- */
            .hero {
                position: relative;
                overflow: hidden;
                flex: 1;
                background: linear-gradient(135deg, #052e16 0%, #14532d 55%, #166534 100%);
                padding: 56px 16px 64px;
                text-align: center;
            }

            .hero::before {
                content: "";
                position: absolute;
                top: -90px;
                right: -70px;
                width: 260px;
                height: 260px;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.05);
            }

            .hero::after {
                content: "";
                position: absolute;
                bottom: -70px;
                left: -50px;
                width: 190px;
                height: 190px;
                border-radius: 50%;
                background: rgba(16, 185, 129, 0.12);
            }

            .hero-inner {
                position: relative;
                z-index: 1;
                max-width: 1080px;
                margin: 0 auto;
            }

            .hero-eyebrow {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                font-family: "JetBrains Mono", monospace;
                font-size: 10px;
                font-weight: 500;
                letter-spacing: 0.22em;
                text-transform: uppercase;
                color: var(--emerald-300);
                background: rgba(255, 255, 255, 0.08);
                border: 1px solid rgba(255, 255, 255, 0.14);
                border-radius: 999px;
                padding: 8px 16px;
                margin-bottom: 24px;
            }

            .hero-big {
                font-family: "Sora", sans-serif;
                font-weight: 800;
                letter-spacing: -0.04em;
                font-size: clamp(64px, 20vw, 160px);
                line-height: 0.95;
                background: linear-gradient(180deg, #ffffff 30%, #86efac 100%);
                -webkit-background-clip: text;
                background-clip: text;
                -webkit-text-fill-color: transparent;
                color: transparent;
            }

            .hero-title {
                color: #ffffff;
                font-size: clamp(22px, 5vw, 34px);
                font-weight: 700;
                margin-top: 6px;
            }

            .hero-sub {
                color: rgba(255, 255, 255, 0.72);
                font-size: 15px;
                line-height: 1.6;
                max-width: 560px;
                margin: 14px auto 0;
            }

            .hero-chips {
                display: flex;
                flex-wrap: wrap;
                justify-content: center;
                gap: 8px;
                margin-top: 26px;
            }

            .hero-chip {
                font-family: "JetBrains Mono", monospace;
                font-size: 11px;
                font-weight: 500;
                color: #ffffff;
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.16);
                border-radius: 999px;
                padding: 8px 14px;
            }

            /* ---------- Footer ---------- */
            .footer {
                border-top: 1px solid #e5e7eb;
                background: #ffffff;
                padding: 22px 16px;
                text-align: center;
            }

            .footer-text {
                font-size: 12.5px;
                color: var(--gray-500);
            }

            .footer-mono {
                font-family: "JetBrains Mono", monospace;
                font-size: 10.5px;
                letter-spacing: 0.1em;
                color: var(--gray-400);
                margin-top: 6px;
            }
        </style>
    </head>
    <body>
        <div class="page">
            <header class="topbar">
                <div class="topbar-inner">
                    <div class="brand">
                        <div class="brand-mark" aria-hidden="true">
                            <svg viewBox="0 0 64 64" width="22" height="22">
                                <rect x="21" y="20" width="7" height="7" rx="1.8" fill="#ffffff" />
                                <rect x="21" y="28.5" width="7" height="7" rx="1.8" fill="#15803d" />
                                <path d="M22.9 32.2 24.2 33.5 26.7 30.9" stroke="#ffffff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" fill="none" />
                                <rect x="21" y="37" width="7" height="7" rx="1.8" fill="#ffffff" />
                                <rect x="32.5" y="23.6" width="11.5" height="2.4" rx="1.2" fill="#ffffff" opacity="0.95" />
                                <rect x="32.5" y="32.1" width="11.5" height="2.4" rx="1.2" fill="#ffffff" opacity="0.95" />
                                <rect x="32.5" y="40.6" width="11.5" height="2.4" rx="1.2" fill="#ffffff" opacity="0.95" />
                            </svg>
                        </div>
                        <div class="min-w-0">
                            <div class="brand-name">SMARTLOG</div>
                            <div class="brand-tag">OJT MONITORING SYSTEM</div>
                        </div>
                    </div>
                    <span class="api-pill">API</span>
                </div>
            </header>

            <section class="hero">
                <div class="hero-inner">
                    <span class="hero-eyebrow">Tangub City Global College</span>
                    <div class="hero-big">API</div>
                    <h1 class="hero-title">SMARTLOG REST API</h1>
                    <p class="hero-sub">
                        The backend service behind the SMARTLOG OJT monitoring platform — authentication,
                        intern registrations, approvals, and real-time notifications.
                    </p>
                    <div class="hero-chips">
                        <span class="hero-chip">REST</span>
                        <span class="hero-chip">JSON</span>
                        <span class="hero-chip">JWT AUTH</span>
                        <span class="hero-chip">PAGINATED</span>
                        <span class="hero-chip">REVERB REALTIME</span>
                    </div>
                </div>
            </section>

            <footer class="footer">
                <p class="footer-text">Tangub City Global College — OJT Monitoring System</p>
                <p class="footer-mono">SMARTLOG · REST API · v1</p>
            </footer>
        </div>
    </body>
</html>
