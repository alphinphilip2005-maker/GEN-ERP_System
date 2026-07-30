const axios = require('axios');

async function testApi() {
  try {
    const res = await axios.get('http://localhost:3000/api/payments');
    const p = res.data.find(x => x.po_id === 36);
    console.log('API Response for PO 36:');
    console.log(JSON.stringify(p, null, 2));
  } catch (err) {
    console.error('API Test failed:', err.message);
  }
}

testApi();
