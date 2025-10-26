const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// 환경 변수 확인
if (!supabaseUrl || !supabaseKey) {
  console.error('❌ [CRITICAL] Supabase credentials missing!');
  console.error(`  SUPABASE_URL: ${supabaseUrl ? '✅' : '❌ NOT SET'}`);
  console.error(`  SUPABASE_ANON_KEY: ${supabaseKey ? '✅' : '❌ NOT SET'}`);
  console.error('');
  console.error('⚠️  [WARNING] Emotion data will NOT be persisted to database!');
}

// Supabase 클라이언트 생성
const supabase = createClient(supabaseUrl || '', supabaseKey || '');

console.log('✅ [Supabase] Client initialized');
console.log(`  URL: ${supabaseUrl ? '✅ Set' : '❌ Not set'}`);
console.log(`  Key: ${supabaseKey ? '✅ Set' : '❌ Not set'}`);

module.exports = { supabase };
