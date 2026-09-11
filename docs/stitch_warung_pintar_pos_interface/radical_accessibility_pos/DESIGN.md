---
name: Radical Accessibility POS
colors:
  surface: '#f6fbf5'
  surface-dim: '#d7dbd6'
  surface-bright: '#f6fbf5'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f5f0'
  surface-container: '#ebefea'
  surface-container-high: '#e5e9e4'
  surface-container-highest: '#dfe4df'
  on-surface: '#181d1a'
  on-surface-variant: '#3e4943'
  inverse-surface: '#2c322e'
  inverse-on-surface: '#edf2ed'
  outline: '#6e7a73'
  outline-variant: '#bdc9c1'
  surface-tint: '#006c4e'
  primary: '#005d42'
  on-primary: '#ffffff'
  primary-container: '#047857'
  on-primary-container: '#9ffdd3'
  inverse-primary: '#7bd8b1'
  secondary: '#a73a00'
  on-secondary: '#ffffff'
  secondary-container: '#fd651e'
  on-secondary-container: '#571a00'
  tertiary: '#863933'
  on-tertiary: '#ffffff'
  tertiary-container: '#a45049'
  on-tertiary-container: '#ffe4e0'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#97f5cc'
  primary-fixed-dim: '#7bd8b1'
  on-primary-fixed: '#002115'
  on-primary-fixed-variant: '#00513a'
  secondary-fixed: '#ffdbce'
  secondary-fixed-dim: '#ffb599'
  on-secondary-fixed: '#370e00'
  on-secondary-fixed-variant: '#7f2b00'
  tertiary-fixed: '#ffdad6'
  tertiary-fixed-dim: '#ffb4ac'
  on-tertiary-fixed: '#3e0405'
  on-tertiary-fixed-variant: '#792f2a'
  background: '#f6fbf5'
  on-background: '#181d1a'
  surface-variant: '#dfe4df'
  bg-main: '#F0FDFA'
  surface-white: '#FFFFFF'
  text-base: '#0F172A'
  text-muted: '#475569'
  border-light: '#E2E8F0'
  alert-red: '#DC2626'
typography:
  display-total:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '700'
    lineHeight: '1.2'
  h1-store:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.3'
  product-name:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '700'
    lineHeight: '1.4'
  price-tag:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '800'
    lineHeight: '1.2'
  body-large:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '500'
    lineHeight: '1.5'
  badge-small:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '700'
    lineHeight: '1.2'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  touch-target-min: 60px
  touch-target-huge: 72px
  gap-standard: 16px
  gap-wide: 24px
  margin-page: 24px
---

# DESIGN.md - POS Warung Pintar (Elderly-Friendly POS)

## 1. Design Philosophy
The core objective is **Radical Accessibility**. This application is designed specifically for elderly shopkeepers (*Orang Tua*) in Indonesia. The interface prioritizes high-contrast legibility, massive touch targets, and a simplified mental model for transactions.

- **Legibility First**: WCAG AAA contrast ratios across all critical text.
- **Muscle Memory**: Consistent placement of primary actions (Green for safe/positive, Amber for attention/action).
- **Physicality**: Buttons should look and feel "pressable" with clear elevation and giant hit zones.
- **Localization**: Using familiar Indonesian terminology (e.g., *Keranjang*, *Bayar*, *Kembalian*).

---

## 2. Design Tokens

### Color Palette
| Token | Hex | Role | Usage |
| :--- | :--- | :--- | :--- |
| `primary-emerald` | `#047857` | Primary Branding | Positive actions, "Money" signals, active states. |
| `accent-amber` | `#EA580C` | Primary Action | "BAYAR" (Pay), "Tambah Produk" (Add), high-priority CTA. |
| `bg-main` | `#F0FDFA` | Background | Clean, warm off-white with a hint of green for comfort. |
| `surface-white` | `#FFFFFF` | Card/Surface | Product cards, cart list, modal backgrounds. |
| `text-base` | `#0F172A` | Core Text | High-contrast navy-black for maximum readability. |
| `text-muted` | `#475569` | Secondary Text | Labels and less critical info (still high contrast). |
| `border-light` | `#E2E8F0` | Structural | Subtle 1px borders for card definition. |
| `alert-red` | `#DC2626` | Warning | Stock alerts, errors, cancel actions. |

### Typography (Elderly Optimized)
- **Primary Font**: `Plus Jakarta Sans` or `Inter` (High x-height, clear letterforms).
- **Base Size**: `18px` (Mobile) / `20px` (Desktop).
- **Scale**:
  - `Display (Giant Total)`: `36px` / `Bold`
  - `Heading 1 (Store Title)`: `24px` / `Bold`
  - `Product Name`: `20px` / `Bold`
  - `Price Tag`: `22px` / `Extrabold`
  - `Body/Label`: `18px` / `Medium`
  - `Badge/Small`: `16px` / `Bold`

### Spacing & Layout
- **Touch Targets**: Minimum height/width of `60px` for primary buttons.
- **Gaps**: `16px` (4 units) or `24px` (6 units) to avoid accidental taps.
- **Corner Radius**: `12px` (Medium-Rounded) for a friendly, modern feel.

---

## 3. UI Components & Specifications

### Header App Bar
- **Height**: `72px`
- **Content**: Left-aligned Store Name (`text-base`, `Bold`). Right-aligned massive buttons for "Logout" or "Sync".

### Product Cards
- **Structure**: Vertical stack.
- **Image**: High-contrast placeholder or clear photo.
- **Details**: 
  - Product Name: Top, `text-base`, 2 lines max.
  - Price: Huge emerald green text, bottom-left.
  - Stock Badge: Top-right corner, high contrast background.

### Cart / Keranjang (Mobile Bottom Sheet)
- **Trigger**: Giant floating bar at bottom with "Total: Rp XX.XXX".
- **Quantity Controls**: `60px x 60px` buttons with huge `+` and `-` icons.
- **Total Display**: Centered, `Display` size, `primary-emerald`.

### Payment Flow
- **Numpad**: Large grid of buttons (`72px` height) for cash input.
- **Live Change**: "Kembalian" text updates in real-time, highlighted with a light-green background block.

---

## 4. CSS Utility Classes (Tailwind Compatible)

```css
/* Custom POS Utilities */
.btn-primary-action {
  @apply bg-[#EA580C] text-white font-bold rounded-xl active:scale-95 transition-transform;
  min-height: 60px;
  font-size: 20px;
}

.btn-secondary-action {
  @apply bg-[#047857] text-white font-bold rounded-xl active:scale-95 transition-transform;
  min-height: 60px;
  font-size: 20px;
}

.card-product {
  @apply bg-white border border-[#E2E8F0] rounded-2xl shadow-sm p-4;
}

.input-huge {
  @apply bg-white border-2 border-[#E2E8F0] p-4 text-xl font-bold rounded-xl focus:border-[#047857] outline-none;
  min-height: 64px;
}

.text-huge-price {
  @apply text-[#047857] text-[22px] font-black;
}
```
