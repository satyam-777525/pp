import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import './Admin.css';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, pending, approved

  useEffect(() => {
    fetchUsers();
  }, [filter]);

  const fetchUsers = async () => {
    try {
      const endpoint = filter === 'pending' ? '/api/users/pending' : '/api/users';
      const response = await api.get(endpoint);
      let usersData = response.data;
      if (filter === 'approved') {
        usersData = usersData.filter(u => u.status === 'approved');
      }
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId, creditLimit) => {
    try {
      await api.patch(`/api/users/${userId}/status`, {
        status: 'approved',
        credit_limit: creditLimit || 0
      });
      fetchUsers();
      alert('User approved successfully');
    } catch (error) {
      alert(error.response?.data?.message || 'Error approving user');
    }
  };

  const handleReject = async (userId) => {
    if (!window.confirm('Are you sure you want to reject this user?')) return;

    try {
      await api.patch(`/api/users/${userId}/status`, {
        status: 'rejected'
      });
      fetchUsers();
      alert('User rejected');
    } catch (error) {
      alert(error.response?.data?.message || 'Error rejecting user');
    }
  };

  const handleUpdateCreditLimit = async (userId, creditLimit) => {
    try {
      await api.patch(`/api/users/${userId}/credit-limit`, {
        credit_limit: creditLimit
      });
      fetchUsers();
      alert('Credit limit updated');
    } catch (error) {
      alert(error.response?.data?.message || 'Error updating credit limit');
    }
  };

  if (loading) {
    return <div className="container main-content">Loading users...</div>;
  }

  return (
    <div className="container main-content">
      <h1>User Management</h1>
      <div className="filter-buttons" style={{ marginBottom: '20px' }}>
        <button
          className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setFilter('all')}
        >
          All Users
        </button>
        <button
          className={`btn ${filter === 'pending' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setFilter('pending')}
        >
          Pending Approval
        </button>
        <button
          className={`btn ${filter === 'approved' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setFilter('approved')}
        >
          Approved
        </button>
      </div>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Business Name</th>
              <th>Email</th>
              <th>Contact Person</th>
              <th>GST/Tax ID</th>
              <th>Status</th>
              <th>Credit Limit</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>
                  No users found
                </td>
              </tr>
            ) : (
              users.map(user => (
                <tr key={user.id}>
                  <td>{user.business_name}</td>
                  <td>{user.email}</td>
                  <td>{user.contact_person}</td>
                  <td>{user.gst_tax_id || '-'}</td>
                  <td>
                    <span className={`status-badge status-${user.status}`}>
                      {user.status.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    {user.status === 'approved' ? (
                      <input
                        type="number"
                        defaultValue={user.credit_limit}
                        onBlur={(e) => handleUpdateCreditLimit(user.id, e.target.value)}
                        style={{ width: '100px' }}
                      />
                    ) : (
                      '-'
                    )}
                  </td>
                  <td>
                    {user.status === 'pending' && (
                      <>
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => {
                            const creditLimit = prompt('Enter credit limit:', '0');
                            if (creditLimit !== null) {
                              handleApprove(user.id, creditLimit);
                            }
                          }}
                        >
                          Approve
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleReject(user.id)}
                          style={{ marginLeft: '5px' }}
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserManagement;

