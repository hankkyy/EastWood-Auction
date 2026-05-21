export type AdminAccount = {
  username: string;
  displayName: string;
  role: "admin";
  passwordHash: string;
  createdAt: string;
};

export type AdminSession = {
  username: string;
  displayName: string;
  role: "admin";
};

export const getAdminAccounts = (): AdminAccount[] => [];

export const createAdminAccount = (_params: {
  username: string;
  displayName: string;
  password: string;
}): { ok: false; reason: "missing-fields" | "duplicate-username" } => ({
  ok: false,
  reason: "missing-fields",
});

export const getAdminSession = (): AdminSession | null => null;

export const isAdminAuthenticated = () => false;

export const loginAdmin = (_username: string, _password: string) => null;

export const logoutAdmin = () => {};
