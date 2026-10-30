// One brand colour ramp (deep green-teal), from which Fluent UI derives every brand colour.
// Deliberately not Riverty's corporate design: swap this ramp for the official brand colours.
import { createDarkTheme, createLightTheme, type BrandVariants, type Theme } from "@fluentui/react-components";

const brand: BrandVariants = {
  10: "#020E0C",
  20: "#071C19",
  30: "#0B2A26",
  40: "#0E3732",
  50: "#11453F",
  60: "#13534C",
  70: "#156259",
  80: "#167166",
  90: "#2C7F74",
  100: "#438D83",
  110: "#5A9B92",
  120: "#72A9A1",
  130: "#8BB8B1",
  140: "#A4C6C1",
  150: "#BDD5D1",
  160: "#D6E4E1",
};

export const lightTheme: Theme = {
  ...createLightTheme(brand),
  fontFamilyBase: "'Segoe UI Variable Text', 'Segoe UI', system-ui, -apple-system, sans-serif",
};

export const darkTheme: Theme = {
  ...createDarkTheme(brand),
  colorBrandForeground1: brand[120],
  colorBrandForeground2: brand[130],
  fontFamilyBase: lightTheme.fontFamilyBase,
};

export const BRAND = brand;
