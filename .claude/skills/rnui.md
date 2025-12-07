# React Native UI Lib (RNUI) Skill

Use this skill when building UI components in the Kora app. Always follow these patterns for consistency.

## Core Principle

**"Minimal UI, maximum voice"** - Screens confirm what voice states. One key number (Safe Spend) dominates home.

## Imports

Always import from `react-native-ui-lib` instead of `react-native`:

```typescript
import { View, Text, Button, Colors, Typography, Spacings } from 'react-native-ui-lib';

// For design system utilities
import {
  getColor,
  getSpacing,
  withOpacity,
  getSafeSpendColor,
  BorderRadius,
  Shadows,
  Durations
} from '@/constants/design-system';
```

## Kora Design Tokens

### Colors (Light Mode)

| Token | Value | Usage |
|-------|-------|-------|
| `primary` | #1E1E1E | High contrast elements |
| `primaryLight` | #3D3D3D | Lighter primary variant |
| `secondary` | #5A5A5A | Secondary text/elements |
| `screenBG` | #FFFFFF | Screen backgrounds |
| `cardBG` | #F8F8F8 | Card backgrounds |
| `surfaceBG` | #FAFAFA | Surface backgrounds |
| `success` | #4CAF50 | Safe spend / under budget |
| `successLight` | #E8F5E9 | Success background |
| `warning` | #FFC107 | Caution states |
| `warningLight` | #FFF8E1 | Warning background |
| `error` | #F44336 | Over budget / danger |
| `errorLight` | #FFEBEE | Error background |
| `textDefault` | #1E1E1E | Primary text |
| `textMuted` | #9E9E9E | Secondary text |
| `textDisabled` | #BDBDBD | Disabled text |
| `textInverse` | #FFFFFF | Text on dark backgrounds |
| `border` | #E0E0E0 | Border color |
| `divider` | #EEEEEE | Divider color |
| `overlay` | rgba(0,0,0,0.5) | Modal overlays |

**Usage as modifiers:**
- Background: `bg-primary`, `bg-screenBG`, `bg-cardBG`, `bg-success`, `bg-error`
- Text: `textDefault`, `textMuted`, `textDisabled`, `textInverse`

### Dark Mode Colors

Dark mode is automatically supported. To enable:

```typescript
// In app/_layout.tsx or initialization
import { initializeDesignSystem } from '@/constants/design-system';

// Option 1: Auto-detect system preference
initializeDesignSystem({ autoDarkMode: true });

// Option 2: Force dark mode
initializeDesignSystem({ forceScheme: 'dark' });
```

### Typography

| Preset | Size | Weight | Usage |
|--------|------|--------|-------|
| `h1` | 48px | 700 | Safe Spend number |
| `h2` | 24px | 600 | Section headers |
| `h3` | 20px | 600 | Sub-headers |
| `h4` | 18px | 600 | Small headers |
| `body` | 16px | 400 | Standard text |
| `bodyBold` | 16px | 600 | Emphasized body text |
| `small` | 14px | 400 | Small text |
| `smallBold` | 14px | 600 | Emphasized small text |
| `caption` | 12px | 400 | Metadata / labels |
| `captionBold` | 12px | 600 | Emphasized captions |
| `button` | 16px | 600 | Button labels |
| `buttonSmall` | 14px | 600 | Small button labels |

**Usage:** `<Text h1>`, `<Text body>`, `<Text caption>`

### Spacings

| Token | Value | Usage |
|-------|-------|-------|
| `page` | 20px | Page padding |
| `card` | 16px | Card padding |
| `section` | 24px | Section spacing |
| `s0` | 0px | No spacing |
| `s1` | 4px | Tiny gap |
| `s2` | 8px | Small gap |
| `s3` | 12px | Medium-small gap |
| `s4` | 16px | Medium gap |
| `s5` | 20px | Medium-large gap |
| `s6` | 24px | Large gap |
| `s7` | 28px | Extra gap |
| `s8` | 32px | Extra large gap |
| `s10` | 40px | Section spacing |
| `s12` | 48px | Large section spacing |
| `s16` | 64px | Extra large spacing |

**Usage:** `padding-page`, `marginT-s4`, `paddingH-s2`

### Border Radius

```typescript
import { BorderRadius } from '@/constants/design-system';

// Values
BorderRadius.none   // 0
BorderRadius.small  // 4
BorderRadius.medium // 8
BorderRadius.large  // 12
BorderRadius.xl     // 16
BorderRadius.xxl    // 20
BorderRadius.round  // 9999 (fully round)
```

### Shadows

```typescript
import { Shadows } from '@/constants/design-system';

<View style={Shadows.small}>  // Subtle shadow
<View style={Shadows.medium}> // Card shadow
<View style={Shadows.large}>  // Elevated shadow
```

### Animation Durations

```typescript
import { Durations } from '@/constants/design-system';

Durations.instant // 0ms
Durations.fast    // 150ms
Durations.normal  // 300ms
Durations.slow    // 500ms
```

## Modifiers Reference

### Layout
- `flex` - flex: 1
- `flex-2` - flex: 2 (any number)
- `flexG` - flex grow
- `flexS` - flex shrink
- `row` - flexDirection: row
- `center` - center both axes
- `centerH` - center horizontal
- `centerV` - center vertical
- `spread` - space-between
- `left`, `right`, `top`, `bottom` - align to edge

### Spacing
- `padding-s4` - padding: 16
- `paddingH-s2` - paddingHorizontal: 8
- `paddingV-s3` - paddingVertical: 12
- `paddingT-s2` - paddingTop: 8
- `paddingB-s2` - paddingBottom: 8
- `paddingL-s2` - paddingLeft: 8
- `paddingR-s2` - paddingRight: 8
- `margin-s4` - margin: 16 (same pattern as padding)
- `marginT-s2`, `marginB-s2`, `marginL-s2`, `marginR-s2`
- `marginH-s2`, `marginV-s2`

### Border Radius (RNUI Modifiers)
- `br10` through `br60` - borderRadius values

### Position
- `abs` - absolute positioning
- `absL`, `absT`, `absR`, `absB` - absolute with edge alignment
- `absF` - fill parent (absolute + all edges 0)

## Helper Utilities

### withOpacity
Create transparent colors:
```typescript
import { withOpacity } from '@/constants/design-system';

const semiTransparent = withOpacity(Colors.primary, 0.5);
// Result: 'rgba(30, 30, 30, 0.5)'
```

### getSafeSpendColor
Get dynamic color based on budget status:
```typescript
import { getSafeSpendColor } from '@/constants/design-system';

const color = getSafeSpendColor(currentAmount, dailyBudget);
// Returns: success (>30%), warning (10-30%), error (<10%)
```

### getStatusColor
Custom threshold-based coloring:
```typescript
import { getStatusColor } from '@/constants/design-system';

const color = getStatusColor(percentage, { warning: 50, danger: 20 });
```

## Component Patterns

### Screen Container
```typescript
<View flex bg-screenBG padding-page>
  {/* Screen content */}
</View>
```

### Safe Spend Display
```typescript
import { getSafeSpendColor } from '@/constants/design-system';

const color = getSafeSpendColor(safeSpend, dailyBudget);

<View center>
  <Text h1 style={{ color }}>{safeSpend}</Text>
  <Text body textMuted marginT-s2>Safe Spend Today</Text>
</View>
```

### Card Component
```typescript
import { Shadows, BorderRadius } from '@/constants/design-system';

<View
  bg-cardBG
  padding-card
  marginB-s3
  style={[Shadows.small, { borderRadius: BorderRadius.large }]}
>
  <Text h3 textDefault>Card Title</Text>
  <Text body textMuted marginT-s1>Card content</Text>
</View>
```

### Status Badge
```typescript
// Success
<View bg-successLight paddingH-s3 paddingV-s1 br20>
  <Text caption style={{ color: Colors.success }}>Under Budget</Text>
</View>

// Warning
<View bg-warningLight paddingH-s3 paddingV-s1 br20>
  <Text caption style={{ color: Colors.warning }}>Getting Close</Text>
</View>

// Error
<View bg-errorLight paddingH-s3 paddingV-s1 br20>
  <Text caption style={{ color: Colors.error }}>Over Budget</Text>
</View>
```

### Row with Space Between
```typescript
<View row spread centerV padding-s3>
  <Text body textDefault>Label</Text>
  <Text body textMuted>Value</Text>
</View>
```

### Button
```typescript
<Button
  label="Remind Me"
  backgroundColor={Colors.primary}
  labelStyle={{ color: Colors.textInverse }}
  marginT-s5
  br20
/>

// Outline button
<Button
  label="Cancel"
  outline
  outlineColor={Colors.border}
  color={Colors.textDefault}
/>
```

### List Item with Divider
```typescript
<View
  row
  spread
  centerV
  paddingV-s3
  style={{ borderBottomWidth: 1, borderBottomColor: Colors.divider }}
>
  <View>
    <Text body textDefault>Transaction Name</Text>
    <Text caption textMuted>Category</Text>
  </View>
  <Text body textDefault>-₦2,500</Text>
</View>
```

### Modal Overlay
```typescript
<View absF bg-overlay center>
  <View bg-screenBG padding-page br20 style={Shadows.large}>
    <Text h3 textDefault>Modal Content</Text>
  </View>
</View>
```

## Best Practices

1. **Use modifiers over inline styles** - Prefer `padding-s4` over `style={{ padding: 16 }}`
2. **Combine modifiers freely** - `<View flex center bg-screenBG padding-page>`
3. **Use semantic colors** - Use `success`/`warning`/`error` for status, not raw hex values
4. **Use light variants for backgrounds** - `successLight`, `warningLight`, `errorLight` for subtle backgrounds
5. **Typography consistency** - Always use presets (`h1`, `body`, `caption`), never raw fontSize
6. **Spacing consistency** - Use spacing tokens (`s1`-`s16`, `page`, `card`), never raw numbers
7. **Currency format** - Always use ₦ prefix for Naira amounts
8. **Use design system utilities** - `withOpacity()`, `getSafeSpendColor()` for dynamic styling
9. **Apply shadows consistently** - Use `Shadows.small/medium/large` from design system
10. **Use BorderRadius constants** - For consistent rounded corners across the app

## TypeScript Support

The design system exports types for autocomplete:

```typescript
import type { ColorName, TypographyName, SpacingName } from '@/constants/design-system';

// These types match the keys in the design system
const myColor: ColorName = 'primary';
const myTypo: TypographyName = 'body';
const mySpace: SpacingName = 's4';
```

## Design System Location

- Main file: `constants/design-system.ts`
- Loaded in: `app/_layout.tsx`
- Skill reference: `.claude/skills/rnui.md`
