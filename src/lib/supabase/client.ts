import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Supabase client credentials are missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Profile 类型定义（对应数据库 profiles 表）
export type Profile = {
  id: string; // UUID，关联 auth.users
  username: string; // 用户名（通常是邮箱）
  display_name: string | null; // 显示名称
  role: 'admin' | 'user'; // 角色
  avatar_url: string | null; // 头像 URL
  created_at: string; // 创建时间
  updated_at: string; // 更新时间
};

// Session 类型定义（对应数据库 sessions 表）
export type Session = {
  id: string; // UUID
  user_id: string; // 用户ID
  device_info: any; // 设备信息 (JSONB)
  ip_address: string | null; // IP 地址
  is_active: boolean; // 是否活跃
  last_activity: string; // 最后活动时间
  created_at: string; // 创建时间
};
