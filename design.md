# NestDoc Design System

## Brand
- **Name**: NestDoc
- **Tagline**: "Every file. Every format. Instantly."
- **Personality**: Professional, trustworthy, fast, simple

## Colors
- **Primary**: Deep indigo `#1e1b4b` (oklch(0.23 0.06 285))
- **Accent**: Vivid violet `#7c3aed` (oklch(0.53 0.24 285))
- **Accent Light**: Soft violet `#a78bfa`
- **Surface**: Lavender mist `#f5f3ff`
- **Background**: White `#ffffff`
- **Card BG**: White with subtle shadow
- **Text Primary**: `#1e1b4b`
- **Text Secondary**: `#6b7280`
- **Border**: `#e5e7eb`

## Category Colors
- PDF: `#ef4444` (red)
- Image: `#3b82f6` (blue)
- Document: `#f59e0b` (amber)
- Data: `#10b981` (emerald)
- Video/Audio: `#8b5cf6` (violet)
- Text: `#6366f1` (indigo)

## Typography
- **Display/Headings**: "Instrument Serif", serif — elegant, distinctive
- **Body/UI**: "DM Sans", sans-serif — clean, readable
- **Mono**: "JetBrains Mono" for code/data tools

## Layout
- Max width: 1280px centered
- Section padding: 80px vertical
- Card grid: responsive, 3-4 cols on desktop
- Generous whitespace throughout
- Subtle background patterns on hero

## Components
- **Tool Cards**: White bg, subtle border, category color accent strip on top, icon + name + description, hover lift
- **Upload Zone**: Dashed border, drag-drop, large clickable area
- **Processing State**: Progress indicator, file info display
- **Download Button**: Bold accent color, prominent

## Motion
- Page load: staggered fade-up for cards
- Hover: subtle lift + shadow on cards
- Upload zone: pulse on drag-over
- CSS transitions only (no heavy libs)
