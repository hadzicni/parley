export const THEME_STORAGE_KEY = "parley:theme"

/** Deep space is the signature look; light and system are opt-in. */
export const DEFAULT_THEME = "dark"

/** Runs before first paint so the page never flashes the wrong theme. */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}")||"dark";var d=t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d)}catch(e){document.documentElement.classList.add("dark")}})()`
