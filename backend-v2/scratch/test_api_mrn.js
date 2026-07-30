const axios = require('axios');
const jwt = require('jsonwebtoken');
const { User, Project, Item } = require('../models');

async function test() {
  try {
    // 1. Find an admin user to authorize the request
    const admin = await User.findOne({ where: { role: 'admin' } });
    if (!admin) {
      console.error('No admin user found!');
      process.exit(1);
    }
    console.log(`Using admin user: ${admin.email} (ID: ${admin.id})`);

    // 2. Generate JWT token
    const token = jwt.sign(
      { id: admin.id, email: admin.email, role: admin.role },
      process.env.JWT_SECRET || 'your_jwt_secret_key_here_or_fallback',
      { expiresIn: '1h' }
    );

    // 3. Find source and destination projects
    const projects = await Project.findAll({ limit: 2 });
    if (projects.length < 2) {
      console.error('At least 2 projects are required for transfer!');
      process.exit(1);
    }
    const fromProj = projects[0];
    const toProj = projects[1];
    console.log(`Transfer from "${fromProj.project_name}" (ID: ${fromProj.id}) to "${toProj.project_name}" (ID: ${toProj.id})`);

    // 4. Find an item to transfer
    const item = await Item.findOne();
    if (!item) {
      console.error('No item found to transfer!');
      process.exit(1);
    }

    // 5. Submit MRN Project Transfer request to local server
    console.log('Sending POST request to http://localhost:3000/api/mrn ...');
    const response = await axios.post(
      'http://localhost:3000/api/mrn',
      {
        mrn_type: 'Project_Transfer',
        from_project_id: fromProj.id,
        to_project_id: toProj.id,
        store_location: 'Main Store',
        department: 'Store',
        items: [
          {
            item_id: item.id,
            requested_quantity: 5,
            uom: 'PCS',
            specification: 'Transfer test item'
          }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    console.log('SUCCESS! MRN Project Transfer Created.');
    console.log('Response status:', response.status);
    console.log('Created MRN details:', {
      id: response.data.id,
      mrn_no: response.data.mrn_no,
      mrn_type: response.data.mrn_type,
      store_location: response.data.store_location,
      from_project_id: response.data.from_project_id,
      to_project_id: response.data.to_project_id
    });
  } catch (err) {
    console.error('TEST FAILED!');
    if (err.response) {
      console.error('Error response data:', err.response.data);
      console.error('Error response status:', err.response.status);
    } else {
      console.error(err);
    }
  }
  process.exit(0);
}

test();
