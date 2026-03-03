import axios from 'axios';

const testInventoryAPI = async () => {
    try {
        const restaurantId = 'REST-1771312074475-1182';
        const url = `http://localhost:5001/api/restaurant/${restaurantId}/inventory`;


        const response = await axios.get(url);


        if (response.data.data?.inventory?.categories?.length > 0) {

            response.data.data.inventory.categories.forEach((cat, idx) => {
            });
        } else {
        }

    } catch (error) {
        console.error('❌ Error testing API:', error.message);
        if (error.response) {
            console.error('   Response status:', error.response.status);
            console.error('   Response data:', error.response.data);
        }
    }
};

testInventoryAPI();
