import fetch from 'node-fetch';

const testAPI = async () => {
    try {
        console.log('🔍 Testing API connection...');
        
        // Test categories endpoint
        const response = await fetch('http://localhost:5000/api/culture/categories');
        const data = await response.json();
        
        console.log('✅ API Response:', JSON.stringify(data, null, 2));
        
        // Test items endpoint
        const itemsResponse = await fetch('http://localhost:5000/api/culture/items');
        const itemsData = await itemsResponse.json();
        
        console.log('✅ Items Response:', JSON.stringify(itemsData, null, 2));
        
    } catch (error) {
        console.error('❌ Error testing API:', error.message);
    }
};

testAPI();