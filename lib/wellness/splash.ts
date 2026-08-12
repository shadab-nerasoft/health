/** Splash/onboarding slide data — all static content lives here for future API migration. */

export interface SplashSlide {
  id: number;
  image: string;
  headline: string;
  subtext: string;
  bgColor: string;
}

export const SPLASH_STORAGE_KEY = "zsteps-splash-seen";

export const splashSlides: SplashSlide[] = [
  {
    id: 1,
    image: "/splash/splash1.png",
    headline: "Your Wellness,\nYour Way",
    subtext:
      "Track steps, water, and goals — all in one calm, personal dashboard.",
    bgColor: "#EDE7F0",
  },
  {
    id: 2,
    image: "/splash/splash2.png",
    headline: "Move More,\nFeel Better",
    subtext:
      "Smart insights that gently nudge you toward healthier daily habits.",
    bgColor: "#F5F0E8",
  },
  {
    id: 3,
    image: "/splash/splash3.png",
    headline: "Rinki,\nOff Record",
    subtext:
      "Every step you take is a step closer to the best version of yourself.",
    bgColor: "#E0F0F6",
  },
];

export function isSplashSeen(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(SPLASH_STORAGE_KEY) === "1";
}

export function markSplashSeen(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SPLASH_STORAGE_KEY, "1");
}
