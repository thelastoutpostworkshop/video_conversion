import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";
import { aliases, mdi } from "vuetify/iconsets/mdi";

type AppTheme = "light" | "dark";

const themeStorageKey = "video-conversion.theme.v1";
const v3DisplayThresholds = {
  xs: 0,
  sm: 600,
  md: 960,
  lg: 1280,
  xl: 1920,
  xxl: 2560,
} as const;

const resolveDefaultTheme = (): AppTheme => {
  if (typeof window === "undefined") {
    return "light";
  }

  let persistedTheme: string | null = null;
  try {
    persistedTheme = window.localStorage.getItem(themeStorageKey);
  } catch {
    persistedTheme = null;
  }
  if (persistedTheme === "light" || persistedTheme === "dark") {
    return persistedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

export const vuetify = createVuetify({
  components,
  directives,
  display: {
    mobileBreakpoint: "lg",
    thresholds: v3DisplayThresholds,
  },
  icons: {
    defaultSet: "mdi",
    aliases,
    sets: {
      mdi,
    },
  },
  theme: {
    defaultTheme: resolveDefaultTheme(),
  },
});
