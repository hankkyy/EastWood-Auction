import { useEffect, useState, useCallback } from "react";
import { supabase, type Profile } from "@/lib/supabase/client";
import { notifications } from "@mantine/notifications";

export type AuthUser = {
  id: string;
  email: string | null;
  profile: Profile | null;
};

// 简单的内存缓存，避免重复请求
let profileCache: Map<string, { data: Profile; timestamp: number }> = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

export const useAuth = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // 获取用户资料（带缓存）
  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    try {
      console.log('[useAuth] Fetching profile for user:', userId);
      
      // 检查缓存
      const cached = profileCache.get(userId);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        console.log('[useAuth] Using cached profile, role:', cached.data.role);
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
      
      console.log('[useAuth] Fetched profile from database:', {
        id: data?.id,
        email: data?.username,
        role: data?.role,
        display_name: data?.display_name
      });
      
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
        notifications.show({
          title: "登录成功",
          message: `欢迎回来！`,
          color: "green",
        });

        // 异步加载用户资料（不阻塞 UI）
        fetchProfile(data.user.id).then((profile) => {
          setUser((prev) => prev ? { ...prev, profile } : null);
        });
      }

      return { success: true };
    } catch (error: any) {
      notifications.show({
        title: "登录失败",
        message: error.message || "请检查邮箱和密码",
        color: "red",
      });
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // 注册
  const register = async (email: string, password: string, displayName?: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
          },
        },
      });

      if (error) throw error;

      notifications.show({
        title: "注册成功",
        message: "请检查邮箱确认账户",
        color: "green",
      });

      return { success: true };
    } catch (error: any) {
      notifications.show({
        title: "注册失败",
        message: error.message || "注册时出错",
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
      notifications.show({
        title: "已登出",
        message: "期待再次见到您",
        color: "blue",
      });
    } catch (error: any) {
      notifications.show({
        title: "登出失败",
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
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id);

      if (error) throw error;

      // 刷新本地用户数据
      const updatedProfile = await fetchProfile(user.id);
      setUser({
        ...user,
        profile: updatedProfile,
      });

      notifications.show({
        title: "更新成功",
        message: "个人资料已更新",
        color: "green",
      });

      return { success: true };
    } catch (error: any) {
      notifications.show({
        title: "更新失败",
        message: error.message,
        color: "red",
      });
      return { success: false, error: error.message };
    }
  };

  // 检查是否为管理员
  const isAdmin = user?.profile?.role === "admin";
  
  // 调试日志
  useEffect(() => {
    if (user) {
      console.log('[useAuth] Current user state:', {
        id: user.id,
        email: user.email,
        role: user.profile?.role,
        isAdmin: isAdmin,
        hasProfile: !!user.profile
      });
    }
  }, [user, isAdmin]);

  return {
    user,
    loading,
    login,
    register,
    logout,
    updateProfile,
    refreshProfile: async () => {
      if (user) {
        console.log('[useAuth] Refreshing profile for user:', user.id);
        // 清除缓存
        profileCache.delete(user.id);
        // 重新获取
        const profile = await fetchProfile(user.id);
        setUser((prev) => prev ? { ...prev, profile } : null);
        console.log('[useAuth] Profile refreshed, role:', profile?.role);
      }
    },
    isAdmin,
    isAuthenticated: !!user,
  };
};
