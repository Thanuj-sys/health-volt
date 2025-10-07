// Utility to clear authentication state
// Run this in the browser console to clear any invalid sessions

// Clear localStorage
localStorage.clear();

// Clear sessionStorage
sessionStorage.clear();

// Clear Supabase session
if (window.supabase) {
  window.supabase.auth.signOut();
}

console.log('Authentication state cleared. Please refresh the page.');