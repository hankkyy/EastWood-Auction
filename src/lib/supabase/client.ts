import { createClient } from "@supabase/supabase-js";
import { assertSupabaseClientConfig } from "@/lib/supabase/config";

const { url, anonKey } = assertSupabaseClientConfig();

export const supabase = createClient<any>(url, anonKey);

// Profile 类型定义（对应数据库 profiles 表）
export type Profile = {
  id: string; // UUID，关联 auth.users
  first_name: string; // 名字
  last_name: string; // 姓氏
  user_id: string; // 用户自定义ID，全局唯一
  email: string | null; // 邮箱
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
