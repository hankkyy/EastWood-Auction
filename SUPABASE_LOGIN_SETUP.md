# Supabase 登录注册功能配置指南

## ✅ 已完成的功能

1. **用户认证组件**
   - [AuthModal](file:///Users/hankzhang/Desktop/OSU/java/eastwood/src/components/AuthModal/index.tsx): 登录/注册模态框
   - [ProfileModal](file:///Users/hankzhang/Desktop/OSU/java/eastwood/src/components/ProfileModal/index.tsx): 个人资料管理模态框
   - [useAuth](file:///Users/hankzhang/Desktop/OSU/java/eastwood/src/hooks/useAuth.ts) Hook: 完整的认证状态管理

2. **集成位置**
   - TopNav 导航栏已集成登录按钮和用户菜单
   - 支持邮箱密码登录和注册
   - 会话持久化（刷新页面保持登录状态）

3. **权限控制**
   - 未登录用户：不显示管理功能
   - 普通用户：可上传内容，仅管理自己的数据
   - 管理员：可管理所有用户的内容

## ⚠️ 需要完成的配置步骤

### 步骤 1: 获取正确的 Supabase 匿名密钥

您当前的 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 值不正确。请按以下步骤获取：

1. 访问 Supabase Dashboard: https://app.supabase.com/project/rsleemziyoiyluvycixf/settings/api
2. 找到 **Project API keys** 部分
3. 复制 **anon public** 密钥（应该是一个以 `eyJ` 开头的长字符串）
4. 替换 `.env.local` 文件中的 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 值

示例格式：
```
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzbGVlbXppeW9peWx1dnljaXhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxMDI0NjQsImV4cCI6MjA5NDY3ODQ2NH0.xxx
```

### 步骤 2: 配置 Supabase 数据库

在 Supabase SQL Editor 中执行以下迁移脚本：

1. **创建 profiles 表** (如果尚未创建)
   ```sql
   -- 执行 supabase/schema.sql 中的 profiles 表创建语句
   ```

2. **添加 RLS 策略**
   ```sql
   -- 执行 supabase/add-rls-policies.sql 中的策略
   ```

3. **验证表结构**
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'profiles';
   ```

### 步骤 3: 重启开发服务器

```bash
# 停止当前服务器 (Ctrl+C)
# 重新启动
npm run dev
```

### 步骤 4: 测试登录功能

1. 访问 http://localhost:3000
2. 点击右上角的 "登录 / 注册" 按钮
3. 尝试注册新账户或登录现有账户
4. 检查浏览器控制台是否有错误信息

## 🔍 常见问题排查

### 问题 1: 登录后无法获取用户资料

**症状**: 控制台显示 "Profile not found" 错误

**解决方案**:
```sql
-- 在 Supabase SQL Editor 中执行
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, role, display_name)
  VALUES (NEW.id, NEW.email, 'user', NEW.raw_user_meta_data->>'display_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 问题 2: 注册后无法登录

**原因**: Supabase 默认要求邮箱确认

**解决方案**:
1. 访问 Supabase Dashboard > Authentication > Settings
2. 关闭 "Enable email confirmations"
3. 或者检查邮箱并点击确认链接

### 问题 3: 环境变量未加载

**检查方法**:
```bash
# 在浏览器控制台运行
console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)
console.log(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
```

**解决方案**:
- 确保文件名是 `.env.local`（不是 `.env`）
- 重启开发服务器
- 清除浏览器缓存并硬刷新 (Cmd+Shift+R)

## 📋 功能清单

- [x] AuthModal 登录/注册界面
- [x] ProfileModal 个人资料管理
- [x] useAuth Hook 认证状态管理
- [x] TopNav 集成登录按钮
- [x] 会话持久化
- [x] 角色权限控制（admin/user）
- [ ] 正确的 Supabase 匿名密钥配置
- [ ] 数据库迁移脚本执行
- [ ] 邮箱确认配置（可选）

## 🎯 下一步建议

1. **完成 Supabase 配置**: 获取正确的匿名密钥并更新 `.env.local`
2. **执行数据库迁移**: 在 Supabase SQL Editor 中运行迁移脚本
3. **测试完整流程**: 注册 → 登录 → 查看个人资料 → 登出
4. **配置管理员账户**: 在数据库中手动将某个用户的 role 设置为 'admin'

## 📞 需要帮助？

如果遇到任何问题，请检查：
1. 浏览器控制台的错误信息
2. 网络请求的响应状态
3. Supabase Dashboard 的日志
4. 开发服务器的终端输出