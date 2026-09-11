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
