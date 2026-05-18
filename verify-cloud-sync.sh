#!/bin/bash

# ============================================
# 云端数据同步验证脚本
# ============================================

echo "🔍 开始检查云端数据同步配置..."
echo ""

# 1. 检查环境变量
echo "📋 步骤 1: 检查 Supabase 环境变量"
if [ -f .env.local ]; then
    echo "✅ .env.local 文件存在"
    
    if grep -q "NEXT_PUBLIC_SUPABASE_URL" .env.local; then
        echo "✅ NEXT_PUBLIC_SUPABASE_URL 已配置"
    else
        echo "❌ NEXT_PUBLIC_SUPABASE_URL 未配置"
        exit 1
    fi
    
    if grep -q "NEXT_PUBLIC_SUPABASE_ANON_KEY" .env.local; then
        echo "✅ NEXT_PUBLIC_SUPABASE_ANON_KEY 已配置"
    else
        echo "❌ NEXT_PUBLIC_SUPABASE_ANON_KEY 未配置"
        exit 1
    fi
    
    if grep -q "SUPABASE_SERVICE_ROLE_KEY" .env.local; then
        echo "✅ SUPABASE_SERVICE_ROLE_KEY 已配置"
    else
        echo "❌ SUPABASE_SERVICE_ROLE_KEY 未配置"
        exit 1
    fi
else
    echo "❌ .env.local 文件不存在"
    exit 1
fi

echo ""

# 2. 检查 RLS 策略文件
echo "📋 步骤 2: 检查 RLS 策略文件"
if [ -f supabase/rls-policies.sql ]; then
    echo "✅ rls-policies.sql 文件存在"
    echo "⚠️  请在 Supabase Dashboard 的 SQL Editor 中执行此文件"
else
    echo "❌ rls-policies.sql 文件不存在"
    exit 1
fi

echo ""

# 3. 检查 API 路由
echo "📋 步骤 3: 检查 API 路由"
if [ -f src/pages/api/artworks/index.ts ]; then
    echo "✅ GET/POST /api/artworks 路由存在"
else
    echo "❌ /api/artworks 路由不存在"
    exit 1
fi

if [ -f src/pages/api/artworks/\[id\].ts ]; then
    echo "✅ PATCH/DELETE /api/artworks/[id] 路由存在"
else
    echo "❌ /api/artworks/[id] 路由不存在"
    exit 1
fi

echo ""

# 4. 检查前端实现
echo "📋 步骤 4: 检查前端实现"
if grep -q "isSupabaseConfigured" src/features/image-search/artworkKnowledgeBase.ts; then
    echo "✅ Supabase 配置检查函数存在"
else
    echo "❌ Supabase 配置检查函数不存在"
    exit 1
fi

if grep -q "cloudKnowledgeBaseCache" src/features/image-search/artworkKnowledgeBase.ts; then
    echo "✅ 云端缓存机制存在"
else
    echo "❌ 云端缓存机制不存在"
    exit 1
fi

echo ""

# 5. 检查数据库迁移脚本
echo "📋 步骤 5: 检查数据库迁移脚本"
if [ -f supabase/add-uploaded-by-field.sql ]; then
    echo "✅ uploaded_by 字段迁移脚本存在"
else
    echo "❌ uploaded_by 字段迁移脚本不存在"
    exit 1
fi

if [ -f supabase/add-missing-artwork-fields.sql ]; then
    echo "✅ artwork 字段迁移脚本存在"
else
    echo "❌ artwork 字段迁移脚本不存在"
    exit 1
fi

echo ""

# 6. 总结
echo "=========================================="
echo "✅ 所有检查通过！"
echo "=========================================="
echo ""
echo "📝 下一步操作："
echo "1. 在 Supabase Dashboard 执行以下脚本："
echo "   - supabase/schema.sql（如果尚未执行）"
echo "   - supabase/add-uploaded-by-field.sql"
echo "   - supabase/add-missing-artwork-fields.sql"
echo "   - supabase/rls-policies.sql"
echo ""
echo "2. 启动开发服务器并测试："
echo "   npm run dev"
echo ""
echo "3. 访问 http://localhost:3000/cases 上传测试案例"
echo ""
echo "4. 在另一个浏览器或设备中验证数据同步"
echo ""
echo "📖 详细文档：CLOUD_DATA_SYNC_GUIDE.md"
echo ""
