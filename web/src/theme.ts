// One brand colour ramp, from which Fluent UI derives every brand colour (primary buttons, selected
// tabs, focus rings, brand badges). It is built around the talk's mint (hue ~168° in OKLCH, the
// hue of --mint #44e2b0 in tokens.css), so the tool and the talk share one colour (decision 77).
// brand[80] (#0B7A5E) is the colour of primary buttons and brand text on white: 5.3:1 with white,
// above the 4.5:1 that WCAG asks for normal text. The steps were computed in OKLCH: same hue,
// lightness from dark to light. Deliberately not Riverty's corporate design: swap this ramp for
// the official brand colours.
import { createDarkTheme, createLightTheme, type BrandVariants, type Theme } from "@fluentui/react-components";

const brand: BrandVariants = {
  10: "#01110B",
  20: "#011E15",
  30: "#002C20",
  40: "#003A2B",
  50: "#004937",
  60: "#005843",
  70: "#03684F",
  80: "#0B7A5E",
  90: "#188F6F",
  100: "#19A782",
  110: "#20C096",
  120: "#37D8AB",
  130: "#74E7C1",
  140: "#9FF0D2",
  150: "#C1F5E1",
  160: "#DDFAEF",
};

export const lightTheme: Theme = {
  ...createLightTheme(brand),
  fontFamilyBase: "'Segoe UI Variable Text', 'Segoe UI', system-ui, -apple-system, sans-serif",
};

// The tool's header sits on the talk's near-black surface: the selected tab is underlined in the
// talk's mint itself.
export const darkTheme: Theme = {
  ...createDarkTheme(brand),
  colorBrandForeground1: brand[120],
  colorBrandForeground2: brand[130],
  colorCompoundBrandStroke: "#44E2B0",
  colorCompoundBrandStrokeHover: brand[130],
  colorCompoundBrandStrokePressed: brand[110],
  fontFamilyBase: lightTheme.fontFamilyBase,
};

export const BRAND = brand;
