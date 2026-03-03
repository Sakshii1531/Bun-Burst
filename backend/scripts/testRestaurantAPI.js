import axios from 'axios';

const testRestaurantAPI = async () => {
    try {
        const slug = 'soham';
        const url = `http://localhost:5001/api/restaurant/${slug}`;


        const response = await axios.get(url);


    } catch (error) {
        console.error('❌ Error testing API:', error.message);
        if (error.response) {
            console.error('   Response status:', error.response.status);
            console.error('   Response data:', error.response.data);
        }
    }
};

testRestaurantAPI();
