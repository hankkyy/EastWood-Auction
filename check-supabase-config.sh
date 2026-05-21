#!/bin/bash

echo "🔍 Checking Supabase Configuration..."
echo ""

# 检查 .env.local 文件是否存在
if [ ! -f .env.local ]; then
    echo "❌ Error: .env.local file not found"
    echo "💡 Please create it by copying .env.example:"
    echo "   cp .env.example .env.local"
    exit 1
fi

echo "✅ .env.local file exists"
echo ""

# 检查必需的环境变量
echo "📋 Checking environment variables..."

if grep -q "NEXT_PUBLIC_SUPABASE_URL=https://rsleemziyoiyluvycixf.supabase.co" .env.local; then
    echo "✅ NEXT_PUBLIC_SUPABASE_URL is configured"
else
    echo "⚠️  NEXT_PUBLIC_SUPABASE_URL may not be configured correctly"
fi

if grep -q "NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_SBa5JdzQawsw2U7khRciKw_Tr76CuXT" .env.local; then
    echo "✅ NEXT_PUBLIC_SUPABASE_ANON_KEY is configured"
else
    echo "⚠️  NEXT_PUBLIC_SUPABASE_ANON_KEY may not be configured correctly"
fi

if grep -q "SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here" .env.local; then
    echo "⚠️  SUPABASE_SERVICE_ROLE_KEY needs to be updated (currently using placeholder)"
    echo "   Get your service role key from: https://app.supabase.com/project/rsleemziyoiyluvycixf/settings/api"
else
    echo "✅ SUPABASE_SERVICE_ROLE_KEY is configured"
fi

echo ""
echo "🎯 Next Steps:"
echo "1. Get your service role key from Supabase Dashboard"
echo "2. Update SUPABASE_SERVICE_ROLE_KEY in .env.local"
echo "3. Run database migration in Supabase SQL Editor"
echo "4. Start the development server: npm run dev"
echo ""
echo "📝 Database Migration:"
echo "   - Go to https://app.supabase.com/project/rsleemziyoiyluvycixf/sql"
echo "   - Execute: supabase/add-missing-artwork-fields.sql"
echo ""
