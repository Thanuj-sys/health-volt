import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mrltorlzehiiqreyluwv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ybHRvcmx6ZWhpaXFyZXlsdXd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzODcxMDIsImV4cCI6MjA3MTk2MzEwMn0.4iPNuIcgRtHEQ2Ks289c5LabkMOiLr9OyTyRLW4O_hQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugLogin() {
    console.log('🔍 HealthVolt Login Diagnostic Tool');
    console.log('=====================================');
    
    try {
        // Test 1: Check if we can connect to database
        console.log('\n1️⃣ Testing database connection...');
        const { data, error } = await supabase.from('patients').select('count').limit(1);
        
        if (error) {
            console.error('❌ Database connection failed:', error.message);
            console.log('🔧 Solution: Check internet connection and Supabase status');
            return;
        }
        console.log('✅ Database connection working');
        
        // Test 2: Check existing users
        console.log('\n2️⃣ Checking existing users...');
        
        const { data: patients, error: pError } = await supabase
            .from('patients')
            .select('id, name, email, created_at')
            .limit(10);
            
        const { data: hospitals, error: hError } = await supabase
            .from('hospitals')
            .select('id, name, email, created_at')
            .limit(10);
        
        console.log('👥 Patient accounts found:', patients?.length || 0);
        if (patients?.length > 0) {
            patients.forEach((p, i) => {
                console.log(`   ${i+1}. ${p.name} (${p.email})`);
            });
        }
        
        console.log('🏥 Hospital accounts found:', hospitals?.length || 0);
        if (hospitals?.length > 0) {
            hospitals.forEach((h, i) => {
                console.log(`   ${i+1}. ${h.name} (${h.email})`);
            });
        }
        
        // Test 3: Check auth service
        console.log('\n3️⃣ Testing authentication service...');
        const { data: authData, error: authError } = await supabase.auth.getSession();
        
        if (authError) {
            console.error('❌ Auth service error:', authError.message);
        } else {
            console.log('✅ Auth service is working');
        }
        
        // Test 4: Check email confirmation settings
        console.log('\n4️⃣ Checking email confirmation settings...');
        
        // Check auth users table (if accessible)
        const { data: authUsers, error: authUsersError } = await supabase
            .from('auth.users')
            .select('email, email_confirmed_at')
            .limit(5);
            
        if (!authUsersError && authUsers) {
            console.log('📧 Email confirmation status:');
            authUsers.forEach(user => {
                const status = user.email_confirmed_at ? '✅ Confirmed' : '❌ Not confirmed';
                console.log(`   ${user.email}: ${status}`);
            });
        }
        
        console.log('\n📋 DIAGNOSIS COMPLETE');
        console.log('====================');
        
        if ((patients?.length || 0) + (hospitals?.length || 0) === 0) {
            console.log('🎯 ISSUE FOUND: No user accounts exist yet!');
            console.log('💡 SOLUTION: Create a new account first');
            console.log('   1. Go to your app: http://localhost:5175/');
            console.log('   2. Click "Get Started" (NOT "Sign In")');
            console.log('   3. Create a new account');
            console.log('   4. Then try signing in');
        } else {
            console.log('🎯 User accounts exist. Login issue might be:');
            console.log('   • Wrong email/password');
            console.log('   • Email not confirmed');
            console.log('   • Trying wrong user type (Patient vs Hospital)');
            console.log('   • Browser cache issues');
        }
        
    } catch (error) {
        console.error('❌ Diagnostic failed:', error.message);
    }
}

debugLogin();