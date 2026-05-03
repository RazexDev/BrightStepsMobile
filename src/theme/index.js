// ============================================================
//  BrightSteps Design System — Single Source of Truth
// ============================================================

export const COLORS = {
  // Core Brand
  primary:    '#E85C45',   // coral-red (CTA, accents)
  secondary:  '#5EAD6E',   // soft green (success, progress)
  accent:     '#44A7CE',   // sky blue (resources, info)
  gold:       '#C8881A',   // warm gold (badges, parent)

  // Backgrounds
  bgMain:     '#FEFCF5',   // warm white — the main background
  bgCard:     '#FFFFFF',   // card surfaces
  bgMuted:    '#FEF4CC',   // light gold tint (parent pill)
  bgSection:  '#F9F5EE',   // very subtle warm section bg

  // Text
  textDark:   '#1E1007',   // near-black
  textMid:    '#6B4C30',   // warm brown mid
  textLight:  '#B8906A',   // light tan
  textMuted:  '#9CA3AF',   // muted grey

  // Borders
  border:     '#F0E8D8',   // warm card border
  borderMid:  '#E5D5B8',   // slightly darker border

  // Status
  success:    '#5EAD6E',
  warning:    '#F59E0B',
  error:      '#E85C45',
  info:       '#44A7CE',
};

export const FONTS = {
  h1:    { fontSize: 28, fontWeight: '900', color: COLORS.textDark, letterSpacing: -0.5 },
  h2:    { fontSize: 22, fontWeight: '800', color: COLORS.textDark },
  h3:    { fontSize: 18, fontWeight: '700', color: COLORS.textDark },
  body:  { fontSize: 15, fontWeight: '400', color: COLORS.textMid, lineHeight: 22 },
  label: { fontSize: 12, fontWeight: '700', color: COLORS.textLight, letterSpacing: 0.8, textTransform: 'uppercase' },
  small: { fontSize: 13, fontWeight: '500', color: COLORS.textMuted },
};

export const SHADOWS = {
  sm: {
    shadowColor: '#C8881A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: '#C8881A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#1E1007',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
};

export const RADIUS = {
  sm:  8,
  md:  14,
  lg:  20,
  xl:  28,
  pill: 999,
};
