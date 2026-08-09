# SMARTLOG — Design System / Theme Reference

> Use this file to recreate the exact same look & feel of this project.
> Project: **SMARTLOG — OJT Monitoring System** (Tangub City Global College)
> Stack: React 19 + Vite + **Tailwind CSS v4** + **Ant Design v6** + **lucide-react**

---

## 1. Brand Identity

| Element | Value |
|---|---|
| Product name | **SMARTLOG** |
| Tagline style | `OJT Monitoring System` |
| Logo icon | `GraduationCap` from lucide-react |
| Panel subtitles | `ADMIN PANEL` / `INTERN PANEL` / `OJT INSTRUCTOR` / `OJT COORDINATOR` |
| Overall mood | Clean, professional, education-themed, green accent |

---

## 2. Fonts (load in `index.html`)

Google Fonts link (exact):

```html
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
```

| Role | Font | Tailwind class | Usage |
|---|---|---|---|
| Display / headings | **Sora** | `font-display` or `font-sora` | Page titles, card titles, brand wordmark |
| Body / UI | **DM Sans** | `font-body` (default body font) | Everything else |
| Mono / labels | **JetBrains Mono** | `font-mono` | ID badges `#123`, uppercase panel labels, role chips |

---

## 3. Color Palette

### 3.1 Primary — Green ("rail" palette)

Defined in `client/src/index.css` inside `@theme`:

```css
@theme {
  --color-rail-500:  #22c55e;  /* bright green — icons, accents */
  --color-rail-600:  #16a34a;  /* primary brand green (antd colorPrimary) */
  --color-rail-700:  #15803d;  /* links (antd colorLink) */
  --color-rail-800:  #166534;
  --color-rail-900:  #14532d;  /* headings on light bg, sidebar text */
  --color-rail-950:  #052e16;  /* sidebar background (darkest) */
}
```

In practice the code uses Tailwind's **stock green palette** for utilities:
`green-50/100/200/600/700/900/950` and `emerald-50/500/600`, plus `teal-500`.

Key greens used across the app:

| Token | Hex | Used for |
|---|---|---|
| `green-50` | `#f0fdf4` | Active nav pill bg, icon chip bg, hero banner start |
| `green-100` | `#dcfce7` | ID badge bg, role pill bg, ring/border accents |
| `green-600` | `#16a34a` | Mobile logo chip bg, primary buttons, links, greetings |
| `green-700` | `#15803d` | Avatar gradient, text accents |
| `green-900` | `#14532d` | Headings, brand text on light bg |
| `green-950` | `#052e16` | Sidebar background, hero gradient start |
| `#86efac` (emerald-300) | — | Sidebar active icon / subtitle text (light green on dark) |
| `emerald-500` | `#10b981` | Decorative dots |
| `teal-500` | `#14b8a6` | Page-header gradient end |

### 3.2 Neutral — "steel" grays (available, sparingly used)

```css
--color-steel-400: #8795aa;
--color-steel-500: #677890;
--color-steel-600: #536078;
--color-steel-700: #444f62;
```

Most neutral text uses stock Tailwind: `text-gray-400/500/600/700/900`, borders `border-gray-100/200`.

### 3.3 Semantic tones (for stat icons / status)

| Tone | Classes |
|---|---|
| green | `bg-green-50 text-green-700 ring-green-100` |
| emerald | `bg-emerald-50 text-emerald-700 ring-emerald-100` |
| amber | `bg-amber-50 text-amber-700 ring-amber-100` |
| blue | `bg-blue-50 text-blue-700 ring-blue-100` |
| red (danger) | `bg-red-50 text-red-700 ring-red-100`, `border-red-200` |

### 3.4 Role → Tag color map (Ant Design `Tag`)

```js
const roleColors = {
  admin: "green",
  intern: "orange",
  customer: "cyan",
  ojt_instructor: "blue",
  ojt_coordinator: "purple",
  hte: "magenta",
};
// usage: <Tag variant="filled" color={roleColors[role] || "default"}>{role.toUpperCase()}</Tag>
```

---

## 4. Global CSS (`client/src/index.css`) — copy verbatim

```css
@import "tailwindcss";

html, body, #root {
  width: 100%;
  max-width: 100%;
  overflow-x: clip;
  overscroll-behavior-x: none;
}

@theme {
  --font-display: 'Sora', sans-serif;
  --font-body:    'DM Sans', sans-serif;
  --font-mono:    'JetBrains Mono', monospace;

  --color-rail-500:  #22c55e;
  --color-rail-600:  #16a34a;
  --color-rail-700:  #15803d;
  --color-rail-800:  #166534;
  --color-rail-900:  #14532d;
  --color-rail-950:  #052e16;

  --color-steel-400: #8795aa;
  --color-steel-500: #677890;
  --color-steel-600: #536078;
  --color-steel-700: #444f62;

  --animate-fade-in:   fadeIn 0.4s ease forwards;
  --animate-slide-up:  slideUp 0.4s ease forwards;
  --animate-pulse-dot: pulseDot 2s infinite;
}

body {
  font-family: var(--font-body);
  margin: 0;
  color: #000;
  min-height: 100%;
  position: relative;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Hide scrollbar but keep scroll functionality */
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}

/* Utility override for text-white */
.text-white { color: #fff !important; }
```

**Note:** No `tailwind.config.js` is needed — Tailwind v4 is configured via `@tailwindcss/vite` plugin in `vite.config.js` and the `@theme` block above.

---

## 5. Ant Design Theme (`client/src/App.jsx` ConfigProvider)

```js
const antTheme = {
  token: {
    colorPrimary:     "#16a34a",
    colorLink:        "#15803d",
    borderRadius:     10,
    fontFamily:       "'DM Sans', sans-serif",
    colorBgContainer: "#ffffff",
  },
  components: {
    Button: { borderRadius: 10 },
    Input:  { borderRadius: 10 },
    Table:  { borderRadius: 12 },
    Card:   { borderRadius: 16 },
  },
};
```

Wrap the whole app:

```jsx
<ConfigProvider theme={antTheme}>
  <AntApp>
    <AuthProvider>
      <NotificationProvider>
        <Router>...</Router>
      </NotificationProvider>
    </AuthProvider>
  </AntApp>
</ConfigProvider>
```

Use `App.useApp()` (from antd `App`) for `message.success/error` everywhere.

---

## 6. Layout Patterns

### 6.1 App shell — Desktop

- Sidebar: `w-60 h-screen bg-rail-950 flex flex-col shadow-[2px_0_20px_rgba(0,0,0,0.18)]`
- Fixed sidebar wrapper: `fixed top-0 left-0 z-40` inside a `w-60 shrink-0` spacer
- Desktop topbar: `sticky top-0 z-30 border-b border-gray-100 bg-white shadow-sm`, inner `mx-auto flex h-14 max-w-7xl items-center justify-end gap-3 px-3 sm:px-4 lg:px-8` with `NotificationBell` + `Avatar`
- Main content: `flex-1 min-w-0 overflow-x-hidden`
- Page background: `bg-gray-50`
- Breakpoint for sidebar: `window.innerWidth >= 1024` (use a `useIsDesktop()` resize hook)

**Sidebar brand block** (exact):

```jsx
<div className="px-5 py-6 border-b border-white/8">
  <Link to="/" className="no-underline flex items-center gap-2.5">
    <div className="w-8.5 h-8.5 rounded-[9px] bg-white/15 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/20">
      <GraduationCap size={20} className="text-white" />
    </div>
    <div>
      <div className="font-display font-bold text-white text-[0.95rem]">SMARTLOG</div>
      <div className="text-[0.68rem] text-[#86efac] font-mono">ADMIN PANEL</div>
    </div>
  </Link>
</div>
```

**Sidebar nav item** (active = current route):

```jsx
<Link
  className={`flex items-center gap-2.5 px-3 py-2.75 rounded-[9px] no-underline font-body text-[0.9rem] mb-1 transition-[background] duration-150 ${active ? 'font-semibold' : 'font-normal'}`}
  style={{
    color: active ? "white" : "rgba(255,255,255,0.7)",
    background: active ? "rgba(34,197,94,0.25)" : "transparent",
  }}
>
  <Icon size={18} className={active ? "text-[#86efac]" : "text-white/40"} />
  {label}
</Link>
```

### 6.2 App shell — Mobile (mobile-first)

- **Top navbar**: `fixed top-0 left-0 right-0 z-50 h-15.5 bg-white border-b border-gray-100 flex items-center justify-between px-4 shadow-sm`
  - Left: logo chip `h-10 w-10 rounded-2xl bg-green-600` + `GraduationCap size={20} text-white`, then `<div className="text-base font-bold leading-tight text-green-900">SMARTLOG</div>` + subtitle `text-xs font-medium text-green-700/75`
  - Right: `NotificationBell` + `Avatar`
- **Bottom nav**: `fixed bottom-0 left-0 right-0 z-120 border-t border-gray-200 bg-white/95 px-3 py-2 shadow-[0_-6px_24px_rgba(15,23,42,0.08)] backdrop-blur` with `style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.5rem)" }}`
- Main gets `pt-15.5 pb-[calc(env(safe-area-inset-bottom,0px)+5rem)]` to clear the bars
- **Mobile nav item**: `flex min-h-13 flex-col items-center justify-center gap-1 rounded-2xl px-2 transition-colors` with active state `bg-green-50 text-green-700 ring-1 ring-green-100` and inactive `text-gray-500 hover:bg-gray-50 hover:text-gray-700`; label `text-[11px] font-semibold`
- Sidebar only renders at ≥1024px

### 6.3 Page content wrapper (every page)

```jsx
<div className="mx-auto max-w-7xl space-y-4 px-3 pb-6 pt-3 sm:space-y-5 sm:px-4 sm:pb-8 sm:pt-4 lg:px-8">
```

---

## 7. Page-Level Patterns

### 7.1 Dashboard greeting hero banner

```jsx
<div className="rounded-3xl border border-green-100 bg-linear-to-br from-green-50 via-emerald-50 to-white p-5 shadow-sm sm:p-6">
  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
    <div>
      <p className="mb-1 text-sm font-medium text-green-600">Good morning</p>
      <h1 className="mb-2 text-2xl font-bold text-green-950 sm:text-3xl">Welcome back, {user?.firstname}</h1>
      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
        <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
          {user?.role || "Intern"}
        </span>
        <span className="text-gray-500">{/* long date string */}</span>
      </div>
      <p className="mt-3 max-w-2xl text-sm text-gray-600 sm:text-base">{/* blurb */}</p>
    </div>
    {/* optional: time chip */}
    <div className="rounded-2xl bg-white/80 px-4 py-3 ring-1 ring-green-100 backdrop-blur sm:px-5">
      <div className="text-3xl font-bold text-green-900 sm:text-4xl">{/* time */}</div>
      <p className="mt-1 text-xs text-gray-500">Current time</p>
    </div>
  </div>
</div>
```

Greeting logic: `< 12` → "Good morning", `< 18` → "Good afternoon", else "Good evening".

### 7.2 Management page header banner (Index pages)

```jsx
<div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-green-600 via-emerald-600 to-teal-500 px-5 py-5 sm:px-8 sm:py-6">
  {/* decorative circles */}
  <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-white/10" />
  <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-white/5" />
  <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex items-center gap-3 sm:gap-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm ring-1 ring-white/30 sm:h-12 sm:w-12">
        <Users size={22} className="text-white" />
      </div>
      <div className="min-w-0">
        <h1 className="font-sora text-lg font-bold text-white sm:text-xl">User Management</h1>
        <p className="mt-0.5 text-xs text-green-100 sm:text-sm">Manage all user accounts and roles</p>
      </div>
    </div>
    {/* Primary action: white button on gradient */}
    <Button type="primary" icon={<Plus size={16} />} size="large"
      className="!h-11 !rounded-xl !bg-white !font-semibold !text-green-700 !shadow-sm hover:!bg-green-50 sm:w-auto">
      Add User
    </Button>
  </div>
</div>
```

### 7.3 Cards

```jsx
<Card className="h-full rounded-2xl border-gray-200 shadow-sm">...</Card>
```

### 7.4 StatCard

```jsx
<Card className="h-full rounded-2xl border-gray-200 shadow-sm">
  <div className="flex items-start justify-between gap-3">
    <div>
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-gray-400">{label}</p>
      <p className="mt-3 text-3xl font-bold text-gray-900">{value ?? 0}</p>
      {helper ? <p className="mt-2 text-sm text-gray-500">{helper}</p> : null}
    </div>
    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 ${tones[tone] || tones.green}`}>
      {icon}
    </div>
  </div>
</Card>
```

### 7.5 SectionCard (shared across dashboards)

```jsx
<Card className="h-full rounded-2xl border-gray-200 shadow-sm">
  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
    <div>
      <h2 className="font-sora text-lg font-bold text-gray-900">{title}</h2>
      {subtitle ? <p className="mt-1 text-sm text-gray-500">{subtitle}</p> : null}
    </div>
    {action}
  </div>
  {children}
</Card>
```

### 7.6 Info row (dashboard detail rows)

```jsx
<div className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3">
  <div className="flex items-center gap-3">
    <div className="flex h-10 w-10 items-center justify-center rounded-2xl text-green-700 bg-green-50">
      <UserCheck size={18} />
    </div>
    <span className="text-sm font-medium text-gray-700">Name</span>
  </div>
  <span className="text-lg font-bold text-gray-900">{value}</span>
</div>
```

### 7.7 Data table recipes (Ant Design `Table`)

- Wrap table container: `<div className="bg-white rounded-2xl border border-gray-200 shadow-sm">`
- Toolbar row: `border-b border-gray-100 px-4 py-4 sm:px-5`, left = title + count pill `bg-gray-100 rounded-full px-2 py-0.5 text-xs text-gray-400`, right = filters (`Select size="large" className="w-full sm:w-44"`)
- **Responsive columns**: `const isMobile = !Grid.useBreakpoint().md; const mobileColumnWidth = w => isMobile ? undefined : w;`
- **ID badge**: `<span className="bg-green-100 text-green-800 px-2 py-0.5 rounded font-mono text-xs font-semibold">#{id}</span>`
- **User cell**: `Avatar size={34}` + name (`font-semibold text-green-900 text-sm cursor-pointer hover:underline`) + email (`text-gray-400 text-xs`)
- **Status dot**: `<span className="h-2 w-2 rounded-full bg-green-600"></span>` + `text-xs` label
- **Action buttons**: `className="!h-9 rounded-lg !px-3 md:!h-8"`, size `isMobile ? "middle" : "small"`, with `Tooltip` + `Popconfirm` (`okButtonProps={{ danger: true }}`)
- On mobile, columns with fixed widths pass `undefined` so the table fits; buttons get bigger touch targets

### 7.8 Auth pages (Login / Register / Forgot / Reset)

- Split-screen login (≥`lg`): left branding panel `hidden lg:flex lg:w-[45%] xl:w-1/2 flex-col p-12 xl:p-16 relative overflow-hidden bg-linear-to-br from-green-950 via-green-900 to-green-700 shrink-0` with decorative circles (`bg-white/5`, `bg-emerald-500/10`, `bg-emerald-400/30` dots) and white logo chip
- Right side: `flex-1 flex items-start justify-center p-4 sm:p-6 lg:p-10 bg-gray-50 overflow-y-auto`, form width `w-full max-w-md`
- Mobile-only logo: `lg:hidden` green-600 chip + `text-lg font-bold text-green-900`
- Form card: `bg-white border border-gray-200 shadow-sm rounded-2xl overflow-hidden`
- Form: `layout="vertical" requiredMark={false} size="large"` with
  `className="[&_.ant-form-item]:!mb-3 sm:[&_.ant-form-item]:!mb-4 [&_.ant-form-item-label>label]:!text-[13px] [&_.ant-form-item-label>label]:!font-semibold [&_.ant-form-item-label>label]:!text-gray-700"`
- Section labels: `<p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Email</p>`
- Inputs: `prefix={<User size={16} className="text-gray-400" />}`
- Footer bar inside card: `border-t border-gray-100 bg-gray-50/50 px-5 sm:px-7 py-4` with link left, submit `Button type="primary"` right (`!h-10 !rounded-lg !px-6 !font-semibold`)
- Page footer: `text-center text-gray-400 text-xs mt-5` — "Tangub City Global College — OJT Monitoring System"
- Standalone auth pages: heading `font-display font-bold text-2xl text-green-900`

### 7.9 Modal headers (create/edit modals)

```jsx
<h3 className="font-sora text-base font-bold text-white sm:text-lg">...</h3>
```
Usually inside a small green gradient header row of the modal body.

### 7.10 Status alert cards (verification states)

- Pending: `<Alert showIcon type="warning" className="rounded-2xl" ... icon={<Clock3 size={18} />} />`
- Rejected: custom `rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm` + rejection reason block `rounded-xl border border-red-200 bg-white/70 p-4` with label `text-xs font-semibold uppercase tracking-[0.18em] text-red-500`
- Approved: `<Alert showIcon type="success" className="rounded-2xl" ... icon={<UserCheck size={18} />} />`

---

## 8. Shared Components

### Avatar

```jsx
export default function Avatar({ user, size = 40, fontSize = "1rem", style = {} }) {
  const imagePath = user?.profile_picture || user?.profilePicture || user?.avatar || user?.avatar_url || null
  const src = imagePath ? getStorageUrl(imagePath) : null
  const baseClass = `rounded-full border-1 border-green-500 flex-shrink-0 object-cover`;
  const fallbackClass = `bg-gradient-to-br from-green-700 to-green-500 flex items-center justify-center text-white font-bold font-sans`;
  const dynamicStyle = { width: size, height: size, fontSize, ...style };
  if (src) return <img src={src} alt={user?.firstname || "User"} className={baseClass} style={dynamicStyle} loading="lazy" decoding="async" />;
  return (
    <div className={baseClass + ' ' + fallbackClass} style={dynamicStyle}>
      {(user?.firstname?.[0] || user?.username?.[0] || "?").toUpperCase()}
    </div>
  );
}
```

### NotificationBell
Custom component (`client/src/components/NotificationBell.jsx`) with unread badge — place in every top navbar (desktop + mobile) linking to `/notifications` page.

---

## 9. Icons (lucide-react only)

Common icons used:

| Icon | Where |
|---|---|
| `GraduationCap` | Brand logo |
| `LayoutDashboard` | Dashboard nav |
| `Users`, `User2`, `UserCheck`, `ShieldCheck`, `Store`, `BadgeCheck` | Dashboards, stats |
| `Plus`, `Edit`, `Trash2`, `Search`, `Filter`, `ArrowRight` | Tables, toolbars, forms |
| `Mail`, `Lock`, `User` | Auth forms |
| `CheckCircle2`, `Clock3`, `XCircle` | Status states |
| `LogOut` | Logout |
| `Loader2` | Spinner (`animate-spin`) |

Rules: size `14–24`, use `className="text-..."` for color, never inline SVG or emoji.

---

## 10. Mobile-First Rules (non-negotiable)

1. Base styles = mobile (~375px); enhance with `sm:`/`md:`/`lg:`/`xl:` only.
2. No horizontal scroll: `overflow-x-hidden` + `overscroll-x-none` on root and layout; `min-w-0` on flex children; `w-full` fluid widths; `break-words` for long strings.
3. Touch targets ≥ 44px (`min-h-11`, `min-h-13`, `!h-10`/`!h-11` buttons); bigger buttons on mobile (`size="middle"` vs `small`).
4. Bottom nav on mobile with `safe-area-inset-bottom` padding; primary actions thumb-reachable.
5. Tables: responsive `Table` with mobile width `undefined` (auto) or wrap in `overflow-x-auto`; filters stack full-width on mobile (`flex-col sm:flex-row`).
6. Modals: antd `Modal` ok, but keep bodies compact; on phones ensure `w-full` paddings (`p-5 sm:p-7`).
7. Verify at 320px and 375px widths before calling layout done.

---

## 11. Recreate Checklist (files to copy)

| # | File | Purpose |
|---|---|---|
| 1 | `client/index.html` | Fonts, favicon, deep-link script |
| 2 | `client/src/index.css` | Tailwind v4 `@theme` + global styles |
| 3 | `client/vite.config.js` | `@tailwindcss/vite` plugin |
| 4 | `client/src/App.jsx` | antd `ConfigProvider` theme + routing |
| 5 | `client/src/components/Avatar.jsx` | Avatar component |
| 6 | `client/src/components/NotificationBell.jsx` | Notification bell |
| 7 | `client/src/layouts/*.jsx` | Admin/Intern/Instructor/Coordinator/Customer layouts (sidebar + mobile bars) |
| 8 | `client/src/pages/auth/Login.jsx` | Auth page template |
| 9 | `client/src/pages/admin/Admindashboard.jsx` | Dashboard template (StatCard/SectionCard) |
| 10 | `client/src/pages/admin/user/UserIndex.jsx` | Index page template (header banner + responsive table) |
