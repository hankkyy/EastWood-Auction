# Eastwood Auction

Luxury auction house platform — Chinese antiques, porcelain, jade, paintings, bronze artifacts. Bilingual (EN/ZH). Next.js app with Supabase backend, deployed on Vercel.

## Tech Stack
- **Framework**: Next.js (Pages Router)
- **UI**: Mantine v6
- **Styling**: Mantine `createStyles` + global CSS + inline `sx` props
- **Backend**: Supabase (auth, DB, storage)
- **i18n**: Custom hook `useI18n` (`src/i18n/index.tsx`), locale toggle via `LanguagePicker`
- **Auth**: `useAuth` hook (`src/hooks/useAuth.ts`)

## Design System — CRITICAL

### Color Philosophy
The brand is a **warm, elegant auction house** — NOT a generic startup. Think Sotheby's/Christie's catalog aesthetic: cream paper, gold accents, dark brown text.

**NEVER use Mantine's default bright colors** (`yellow`, `red`, `blue`, `green`) on primary UI elements. They clash with the luxury feel.

### Color Tokens
| Purpose | Mantine Token | Hex |
|---------|--------------|-----|
| **Primary action / brand gold** | `violet` / `violet.7` | `#c4a255` |
| Gold hover | `violet.8` | `#b8943e` |
| Gold darker | `violet.9` | `#a07d30` |
| Dark text | `dark.0` | `#1a1815` |
| Light bg | `white` / `violet.0` | `#faf7f2` / `#f5f0e9` |
| Card bg | `#fffdf9` (light), `dark.1`/`#25221d` (dark) |

**Key insight**: Mantine's `violet` color scale has been **remapped to gold/bronze tones** in `src/theme/index.ts`. ALL primary buttons should use `color="violet"`.

### Button Color Rules
- **Primary CTA**: `color="violet" variant="filled"` or use `primaryActionButtonSx` from `src/components/artworkStyles.ts`
- **Secondary/outline**: `variant="outline"` or use `secondaryActionButtonSx(theme)`
- **Danger/delete**: `color="red"` OK but ONLY for destructive actions
- **Neutral/cancel**: `color="gray" variant="subtle"`
- **Admin indicator**: `color="yellow"` (maps to Mantine yellow, closest to gold badge)
- **Status badges**: Can use violet.4/.5/.7 for semantic variations within the gold family

### Never Do
- `color="yellow"` on a Button — use `color="violet"`
- `color="blue"` for user avatars — use `color="violet"`
- `color="red"` for admin indicators — use `color="yellow"` (gold badge)
- Blue boxShadows `rgba(59,130,246,...)` — use gold `rgba(196,162,85,...)`

## Key Files
```
src/
├── theme/index.ts          # Mantine theme — violet remapped to gold
├── components/
│   ├── artworkStyles.ts    # shared button sx, card styles, color helpers
│   ├── TopNav/index.tsx    # desktop nav + mobile hamburger drawer
│   ├── TopBar/index.tsx    # secondary header bar (inbox, inquiry, theme)
│   ├── BottomNav/index.tsx # mobile bottom tab bar
│   ├── AuthModal/          # login/register modal
│   └── ProfileModal/       # user profile modal
├── section/                # page sections (Home, Collections, Support, etc.)
├── pages/                  # Next.js pages
├── hooks/useAuth.ts        # auth state + role check
└── i18n/index.tsx          # translations
```

## Mobile Components Hierarchy
- **Desktop**: `TopNav` (nav links + user menu) + `TopBar` (inbox/inquiry/theme/lang)
- **Mobile (<768px)**: `TopNav` (brand + hamburger), `TopBar` (3 action buttons), `BottomNav` (5-tab bar)

## Common Patterns
- `const isMobile = useMediaQuery("(max-width: 768px)")` — responsive branching
- `const { t, locale } = useI18n()` — translations
- `const { user, loading, roleLoading, isAdmin } = useAuth()` — auth
- `const { classes } = useStyles()` — component-scoped styles

## Deployment
- Push to `main` → Vercel auto-deploys
- `vercel.json` at root for config
- Supabase env vars in Vercel dashboard
