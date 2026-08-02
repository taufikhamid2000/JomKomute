export const THEME_STORAGE_KEY = "jomkomute.theme";
export const THEMES = ["light", "dark", "system"] as const;
export type Theme = (typeof THEMES)[number];

export function isTheme(value: string | null | undefined): value is Theme {
  return !!value && (THEMES as readonly string[]).includes(value);
}

export function applyTheme(theme: Theme) {
  const html = document.documentElement;
  if (theme === "system") {
    html.removeAttribute("data-theme");
  } else {
    html.setAttribute("data-theme", theme);
  }
}
