import { useEffect, useState, useCallback } from "react";
import { supabase, type Profile } from "@/lib/supabase/client";
import { notifications } from "@mantine/notifications";
import { messages } from "@/i18n";

export type AuthUser = {
  id: string;
  email: string | null;
  profile: Profile | null;
};

// 简单的内存缓存，避免重复请求
let profileCache: Map<string, { data: Profile; timestamp: number }> = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

// 获取当前语言
const getCurrentLocale = (): "zh" | "en" => {
  if (typeof window === "undefined") return "en";
  const stored = localStorage.getItem("museum-art-language");
  return stored === "zh" || stored === "zh-CN" ? "zh" : "en";
};

// 国际化通知辅助函数
const showNotification = (titleKey: keyof typeof messages.en, messageKey: keyof typeof messages.en, color: string) => {
  const locale = getCurrentLocale();
  const t = (key: keyof typeof messages.en) => messages[locale][key] ?? messages.en[key];
  
  notifications.show({
    title: t(titleKey),
    message: t(messageKey),
    color: color as any,
  });
};

export const useAuth = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // 获取用户资料（带缓存）
  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    try {
      // 检查缓存
      const cached = profileCache.get(userId);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.error('[useAuth] Failed to fetch profile:', error);
        throw error;
      }
      
      // 更新缓存
      if (data) {
        profileCache.set(userId, { data: data as Profile, timestamp: Date.now() });
      }
      
      return data as Profile;
    } catch (error) {
      console.error("Failed to fetch profile:", error);
      return null;
    }
  }, []);

  // 初始化认证状态
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          // 立即设置基本用户信息
          setUser({
            id: session.user.id,
            email: session.user.email || null,
            profile: null,
          });
          
          // 异步加载用户资料
          fetchProfile(session.user.id).then((profile) => {
            setUser((prev) => prev ? { ...prev, profile } : null);
          });
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // 监听认证状态变化
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
      if (session?.user) {
        // 立即更新基本用户信息
        setUser({
          id: session.user.id,
          email: session.user.email || null,
          profile: null,
        });
        
        // 异步加载用户资料
        fetchProfile(session.user.id).then((profile) => {
          setUser((prev) => prev ? { ...prev, profile } : null);
        });
      } else {
        setUser(null);
        // 清除缓存
        profileCache.clear();
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  // 登录
  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        // 立即设置基本用户信息（不等待 profile）
        setUser({
          id: data.user.id,
          email: data.user.email || null,
          profile: null, // 稍后异步加载
        });

        // 显示成功通知
        showNotification("auth.loginSuccess", "auth.welcomeBack", "green");

        // 异步加载用户资料（不阻塞 UI）
        fetchProfile(data.user.id).then((profile) => {
          setUser((prev) => prev ? { ...prev, profile } : null);
        });
      }

      return { success: true };
    } catch (error: any) {
      const locale = getCurrentLocale();
      const t = (key: keyof typeof messages.en) => messages[locale][key] ?? messages.en[key];
      
      // 识别特定的错误类型并显示对应的翻译
      let errorMessage = t("auth.checkCredentials");
      
      if (error.message?.includes("Email not confirmed")) {
        errorMessage = t("auth.emailNotConfirmed");
      } else if (error.message?.includes("Invalid login credentials")) {
        errorMessage = t("auth.checkCredentials");
      } else {
        errorMessage = error.message || t("auth.loginError");
      }
      
      notifications.show({
        title: t("auth.loginFailed"),
        message: errorMessage,
        color: "red",
      });
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // 注册
  const register = async (email: string, password: string, firstName: string, lastName: string, userId?: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            user_id: userId || undefined, // 如果提供了user_id则使用，否则由数据库自动生成
          },
        },
      });

      if (error) throw error;

      // 显示更明确的邮箱验证提示
      const locale = getCurrentLocale();
      const t = (key: keyof typeof messages.en) => messages[locale][key] ?? messages.en[key];
      
      notifications.show({
        title: t("auth.registerSuccess"),
        message: locale === "zh" 
          ? "注册成功！请检查您的邮箱（包括垃圾邮件文件夹）并点击确认链接以激活账户。"
          : "Registration successful! Please check your email (including spam folder) and click the confirmation link to activate your account.",
        color: "green",
        autoClose: 8000, // 延长显示时间
      });

      return { success: true };
    } catch (error: any) {
      const locale = getCurrentLocale();
      const t = (key: keyof typeof messages.en) => messages[locale][key] ?? messages.en[key];
      notifications.show({
        title: t("auth.registerFailed"),
        message: error.message || t("auth.registerError"),
        color: "red",
      });
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // 登出
  const logout = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setUser(null);
      showNotification("auth.loggedOut", "auth.seeYouSoon", "blue");
    } catch (error: any) {
      const locale = getCurrentLocale();
      const t = (key: keyof typeof messages.en) => messages[locale][key] ?? messages.en[key];
      notifications.show({
        title: t("auth.logoutFailed"),
        message: error.message,
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  // 更新个人资料
  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { success: false, error: "Not authenticated" };

    try {
      const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id)
        .select("*")
        .single();

      if (error) throw error;

      const updatedProfile = data as Profile;
      profileCache.set(user.id, { data: updatedProfile, timestamp: Date.now() });
      setUser({
        ...user,
        profile: updatedProfile,
      });

      showNotification("auth.updateSuccess", "auth.profileUpdated", "green");

      return { success: true };
    } catch (error: any) {
      const locale = getCurrentLocale();
      const t = (key: keyof typeof messages.en) => messages[locale][key] ?? messages.en[key];
      notifications.show({
        title: t("auth.updateFailed"),
        message: error.message,
        color: "red",
      });
      return { success: false, error: error.message };
    }
  };

  // 检查是否为管理员
  const isAdmin = user?.profile?.role === "admin";

  return {
    user,
    loading,
    login,
    register,
    logout,
    updateProfile,
    refreshProfile: async () => {
      if (user) {
        // 清除缓存
        profileCache.delete(user.id);
        // 重新获取
        const profile = await fetchProfile(user.id);
        setUser((prev) => prev ? { ...prev, profile } : null);
      }
    },
    isAdmin,
    isAuthenticated: !!user,
  };
};
