// Debug script to check API configuration
console.log('=== API Configuration Debug ===');
console.log('import.meta.env.VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);
console.log('Fallback URL:', 'https://wdjv9gq946.execute-api.eu-west-2.amazonaws.com/prod');
console.log('Final API_BASE_URL:', `${import.meta.env.VITE_API_BASE_URL || 'https://wdjv9gq946.execute-api.eu-west-2.amazonaws.com/prod'}/api`);
console.log('All environment variables:', import.meta.env);
console.log('================================');