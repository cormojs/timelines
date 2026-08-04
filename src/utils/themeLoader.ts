/// <reference types="vite/client" />
import themeIndex from "../config/theme.json";

export type Theme = {
  name?: string;
  collection?: string;
  [key: string]: unknown;
};

type ThemeModule = Theme | { default: Theme };

export const isTheme = (value: unknown): value is Theme => typeof value === "object" && value !== null;

const themeModules = import.meta.glob<ThemeModule>("../config/themes/*.json", { eager: true });

export const formatCollectionName = (collection: string | undefined) => String(collection || "")
  .split(/[_-]+/)
  .filter(Boolean)
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join(" ");

export const themeOptionLabel = (key: string, theme?: Theme) => {
  const name = theme?.name || key;
  const collection = String(theme?.collection || "").toLowerCase();
  if (!collection || collection === "bundled" || collection === "featured") return name;
  return `${formatCollectionName(collection)} - ${name}`;
};

export const loadThemeConfig = () => {
  const themes: Record<string, Theme> = {};

  Object.entries(themeModules).forEach(([path, module]) => {
    const data = "default" in module ? module.default : module;
    if (!isTheme(data)) return;
    const fileName = path.split("/").pop() || "";
    const key = fileName.replace(".json", "");
    if (!key) return;
    themes[key] = data;
  });

  return {
    activeTheme: themeIndex.activeTheme,
    themes,
  };
};
