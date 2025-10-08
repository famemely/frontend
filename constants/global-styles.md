# Global Style Guide for Famemely

## Design Philosophy

### Color Usage

- **Black is Dominant**: Black (`#000000`) is used for all primary text and UI elements
- **Greenish for Accents Only**: The green color (`#053326`) is reserved exclusively for:
  - Active buttons and CTAs
  - Selected states
  - Design accents and highlights
  - Brand elements

### Typography

- **No Bold Fonts**: Use font weight variations instead:
  - `fontWeight: '300'` - Light (for decorative text)
  - `fontWeight: '400'` - Regular (default, most text)
  - `fontWeight: '500'` - Medium (slight emphasis)
- **Opacity for Hierarchy**: Use opacity variations to create visual hierarchy:
  - `opacity: 1` - Primary text
  - `opacity: 0.7` - Secondary text
  - `opacity: 0.5` - Tertiary/disabled text

### Shapes & Borders

- **Less Rounded Buttons**: Use smaller border radius values:
  - `theme.borderRadius.sm` (4px) - Minimal rounding
  - `theme.borderRadius.md` (6px) - Standard buttons and inputs
  - `theme.borderRadius.lg` (8px) - Cards and larger elements
  - `theme.borderRadius.xl` (10px) - Rare, special cases
  - Avoid `xxl` and larger values except for circular elements

### Icons

- **Monochromatic**: All icons use a single color:
  - Light theme: `theme.colors.icon` (`#000000`)
  - Dark theme: `theme.colors.icon` (`#FFFFFF`)
  - No colored or multi-tone icons

## Theme Colors

### Light Theme

```typescript
{
  primary: "#053326",        // Green accent (buttons, highlights)
  background: "#FFFFFF",     // Pure white
  surface: "#FAFAFA",        // Light gray surface
  card: "#FFFFFF",          // Pure white
  text: "#000000",          // Pure black text
  textSecondary: "#666666", // Medium gray
  border: "#E5E5E5",        // Light gray border
  icon: "#000000",          // Monochromatic black
  accent: "#053326",        // Green for design elements
}
```

### Dark Theme

```typescript
{
  primary: "#053326",        // Green accent
  background: "#000000",     // Pure black
  surface: "#1A1A1A",        // Dark gray surface
  card: "#1A1A1A",          // Dark gray
  text: "#FFFFFF",          // Pure white text
  textSecondary: "#999999", // Medium gray
  border: "#333333",        // Dark border
  icon: "#FFFFFF",          // Monochromatic white
  accent: "#053326",        // Green for design elements
}
```

## Component Patterns

### Buttons

```typescript
// Primary button (with accent color)
{
  backgroundColor: theme.colors.accent,
  borderRadius: theme.borderRadius.md,
  padding: theme.spacing.md + 2,
  // Text
  color: '#FFFFFF',
  fontWeight: '400',
  letterSpacing: 0.3,
}

// Secondary button (outline)
{
  backgroundColor: 'transparent',
  borderWidth: 1,
  borderColor: theme.colors.accent,
  borderRadius: theme.borderRadius.md,
  // Text
  color: theme.colors.text,
  fontWeight: '400',
}

// Destructive button (outline with error color)
{
  backgroundColor: 'transparent',
  borderWidth: 1,
  borderColor: theme.colors.error,
  // Text
  color: theme.colors.error,
  fontWeight: '400',
}
```

### Input Fields

```typescript
{
  backgroundColor: '#FFFFFF', // or theme.colors.surface
  borderColor: theme.colors.accent,
  borderWidth: 1,
  borderRadius: theme.borderRadius.md,
  padding: theme.spacing.md,
  fontSize: 16,
  fontWeight: '400',
  opacity: 0.7,  // Unfocused
}

// Focused state
{
  opacity: 1,
  borderWidth: 1.5,
}
```

### Cards

```typescript
{
  backgroundColor: theme.colors.surface,
  borderRadius: theme.borderRadius.md,
  padding: theme.spacing.lg,
  borderWidth: 1,
  borderColor: theme.colors.border,
}
```

### Text Hierarchy

```typescript
// Title
{
  fontSize: 32,
  fontWeight: '400',
  color: theme.colors.text,
  letterSpacing: 0.5,
}

// Subtitle
{
  fontSize: 16,
  fontWeight: '400',
  color: theme.colors.textSecondary,
  opacity: 0.7,
}

// Body
{
  fontSize: 16,
  fontWeight: '400',
  color: theme.colors.text,
}

// Secondary body
{
  fontSize: 14,
  fontWeight: '400',
  color: theme.colors.textSecondary,
  opacity: 0.7,
}
```

## Examples

### Good ✓

- Black text on white background
- Green accent button for primary actions
- Subtle gray for secondary information
- Clean, minimal borders with `borderRadius.md`
- Monochrome icons matching text color

### Bad ✗

- Green text on white background
- Multiple accent colors
- Bold fonts (`600`, `700`, `bold`)
- Overly rounded buttons (`borderRadius.xl`, `borderRadius.xxl`)
- Colored or gradient icons

## Migration Notes

All components have been updated to follow this style guide:

- ✅ AuthScreen.tsx (reference implementation)
- ✅ FamilyMapScreen.tsx
- ✅ MFAManagementScreen.tsx
- ✅ TwoFactorScreen.tsx
- ✅ themed-text.tsx
- ✅ theme.ts (global theme configuration)

When creating new components, always reference `AuthScreen.tsx` for consistent styling patterns.
