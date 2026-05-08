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

const ADMIN_SESSION_KEY = "museum-art-admin-session";
const ADMIN_ACCOUNTS_KEY = "museum-art-admin-accounts";

const hashPassword = (password: string) => {
  if (typeof window === "undefined") {
    return password;
  }

  return window.btoa("museum-art:" + password);
};

const defaultAdminAccount = (): AdminAccount => ({
  username: "admin",
  displayName: "Default Admin",
  role: "admin",
  passwordHash: hashPassword("admin123"),
  createdAt: new Date(0).toISOString(),
});

export const getAdminAccounts = (): AdminAccount[] => {
  if (typeof window === "undefined") {
    return [];
  }

  const stored = window.localStorage.getItem(ADMIN_ACCOUNTS_KEY);

  if (!stored) {
    const seeded = [defaultAdminAccount()];
    window.localStorage.setItem(ADMIN_ACCOUNTS_KEY, JSON.stringify(seeded));
    return seeded;
  }

  try {
    const accounts = JSON.parse(stored) as AdminAccount[];
    return accounts.length ? accounts : [defaultAdminAccount()];
  } catch {
    return [defaultAdminAccount()];
  }
};

export const createAdminAccount = ({
  username,
  displayName,
  password,
}: {
  username: string;
  displayName: string;
  password: string;
}) => {
  const normalizedUsername = username.trim().toLowerCase();
  const accounts = getAdminAccounts();

  if (!normalizedUsername || !password) {
    return { ok: false, reason: "missing-fields" as const };
  }

  if (accounts.some((account) => account.username === normalizedUsername)) {
    return { ok: false, reason: "duplicate-username" as const };
  }

  const nextAccount: AdminAccount = {
    username: normalizedUsername,
    displayName: displayName.trim() || normalizedUsername,
    role: "admin",
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  };

  window.localStorage.setItem(
    ADMIN_ACCOUNTS_KEY,
    JSON.stringify([nextAccount, ...accounts])
  );

  return { ok: true, account: nextAccount };
};

export const getAdminSession = (): AdminSession | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = window.sessionStorage.getItem(ADMIN_SESSION_KEY);

  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored) as AdminSession;
  } catch {
    return null;
  }
};

export const isAdminAuthenticated = () => Boolean(getAdminSession());

export const loginAdmin = (username: string, password: string) => {
  const normalizedUsername = username.trim().toLowerCase();
  const account = getAdminAccounts().find(
    (adminAccount) => adminAccount.username === normalizedUsername
  );

  if (!account || account.passwordHash !== hashPassword(password)) {
    return null;
  }

  const session: AdminSession = {
    username: account.username,
    displayName: account.displayName,
    role: account.role,
  };

  window.sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
  return session;
};

export const logoutAdmin = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(ADMIN_SESSION_KEY);
};
