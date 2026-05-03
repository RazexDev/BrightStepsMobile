const axios = require('axios');

async function testPost() {
  try {
    // Assuming we can log in as hiru to get a token, but instead we will just test it
    const loginRes = await axios.post('http://10.54.71.107:5001/api/auth/login', {
      email: 'hiru@gmail.com',
      password: '1234'
    });
    
    const token = loginRes.data.token;
    const user = loginRes.data.user;
    console.log('Logged in as:', user.email, 'Role:', user.role);

    const payload = {
      title: 'New Routine',
      taskName: 'New Routine',
      category: 'Morning',
      studentId: user._id,
      isCompleted: 'false',
      tasks: '[]'
    };

    console.log('Sending payload:', payload);

    const res = await axios.post('http://10.54.71.107:5001/api/routines', payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      }
    });

    console.log('Success:', res.data);
  } catch (error) {
    if (error.response) {
      console.error('Error Response:', error.response.status, error.response.data);
    } else {
      console.error('Network/Other Error:', error.message);
    }
  }
}

testPost();
