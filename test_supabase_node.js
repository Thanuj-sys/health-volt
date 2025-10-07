import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mrltorlzehiiqreyluwv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ybHRvcmx6ZWhpaXFyZXlsdXd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzODcxMDIsImV4cCI6MjA3MTk2MzEwMn0.4iPNuIcgRtHEQ2Ks289c5LabkMOiLr9OyTyRLW4O_hQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testBackend() {
    console.log('🚀 Testing HealthVolt Backend Connection...');
    console.log('📡 Supabase URL:', supabaseUrl);
    
    try {
        // Test 1: Basic connection
        console.log('\n1️⃣ Testing basic connection...');
        const { data: testData, error: testError } = await supabase
            .from('patients')
            .select('count')
            .limit(1);
            
        if (testError) {
            console.error('❌ Connection failed:', testError.message);
            return;
        }
        console.log('✅ Basic connection successful!');
        
        // Test 2: Check tables exist
        console.log('\n2️⃣ Checking database tables...');
        
        const { data: patients, error: patientsError } = await supabase
            .from('patients')
            .select('id, name, email')
            .limit(5);
            
        if (!patientsError) {
            console.log('✅ Patients table found -', patients?.length || 0, 'records');
        } else {
            console.log('⚠️ Patients table issue:', patientsError.message);
        }
        
        const { data: hospitals, error: hospitalsError } = await supabase
            .from('hospitals')
            .select('id, name, email')
            .limit(5);
            
        if (!hospitalsError) {
            console.log('✅ Hospitals table found -', hospitals?.length || 0, 'records');
        } else {
            console.log('⚠️ Hospitals table issue:', hospitalsError.message);
        }
        
        const { data: records, error: recordsError } = await supabase
            .from('patient_records')
            .select('id, title, record_type')
            .limit(5);
            
        if (!recordsError) {
            console.log('✅ Patient records table found -', records?.length || 0, 'records');
        } else {
            console.log('⚠️ Patient records table issue:', recordsError.message);
        }
        
        // Test 3: Auth service
        console.log('\n3️⃣ Testing authentication service...');
        const { data: authData, error: authError } = await supabase.auth.getSession();
        
        if (!authError) {
            console.log('✅ Auth service is working');
            console.log('Current session:', authData.session ? 'Active' : 'None');
        } else {
            console.log('⚠️ Auth service issue:', authError.message);
        }
        
        console.log('\n🎉 Backend is ready for HealthVolt application!');
        console.log('💡 You can now use the sign-in functionality.');
        
    } catch (error) {
        console.error('❌ Backend test failed:', error.message);
        console.error('🔧 Please check your Supabase configuration');
    }
}

testBackend();