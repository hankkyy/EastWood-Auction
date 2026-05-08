const ADMIN_SESSION_KEY = "museum-art-admin-session";
const DEFAULT_ADMIN_PASSWORD = "admin123";

export const isAdminAuthenticated = () => {
  if (typeof window === "undefined") {
    return false;
  }

  return window.sessionStorage.getItem(ADMIN_SESSION_KEY) === "true";
};

export const loginAdmin = (password: string) => {
  const expectedPassword =
    process.env.NEXT_PUBLIC_ADMIN_IMPORT_PASSWORD ?? DEFAULT_ADMIN_PASSWORD;
  const authenticated = password === expectedPassword;

  if (authenticated && typeof window !== "undefined") {
    window.sessionStorage.setItem(ADMIN_SESSION_KEY, "true");
  }

  return authenticated;
};

export const logoutAdmin = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(ADMIN_SESSION_KEY);
};
