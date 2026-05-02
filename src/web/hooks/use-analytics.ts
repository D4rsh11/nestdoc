declare global {
  interface Window {
    stonks?: {
      event: (name: string, props?: Record<string, unknown>) => void;
      view: (path?: string, props?: Record<string, unknown>) => void;
    };
  }
}

export const useAnalytics = () => ({
  trackEvent: (name: string, props?: Record<string, unknown>) => {
    window.stonks?.event(name, props);
  },
  trackView: (path?: string, props?: Record<string, unknown>) => {
    window.stonks?.view(path, props);
  },
});
