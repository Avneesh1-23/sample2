import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import '../styles/UserManagement.css';

function UserManagement({ isAppAdmin, onLogout }) {
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [selectedApp, setSelectedApp] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch users data
      const usersData = await api.getUsers();
      
      // Fetch applications data based on user type
      let appsData = [];
      if (isAppAdmin) {
        try {
          appsData = await api.getAppAdminApplications();
        } catch (appError) {
          console.error('Error fetching app admin applications:', appError);
        }
      } else {
        appsData = await api.getApplications();
      }

      // Process and combine the data
      const processedUsers = usersData.map(user => ({
        ...user,
        assignedApps: user.assignedApps || []
      }));

      setUsers(processedUsers);
      setApplications(appsData);
      setLoading(false);
    } catch (err) {
      console.error('Error in fetchData:', err);
      setError('Failed to fetch data. Please try again later.');
      setLoading(false);
    }
  };

  const handleAddUser = async () => {
    if (newUser.trim() && newUserEmail.trim()) {
      try {
        // First create the user
        const response = await api.createUser({
          username: newUser,
          email: newUserEmail,
          password_hash: 'defaultPassword123',
          user_type: 'end'
        });

        // If app admin and application is selected, assign the user to the application
        if (isAppAdmin && selectedApp && selectedRole) {
          await api.assignUserToApplication(response.user_id, selectedApp, selectedRole);
        }

        // Add the new user to the users list immediately
        const newUserObj = {
          user_id: response.user_id,
          username: newUser,
          email: newUserEmail,
          user_type: 'end',
          assignedApps: []
        };

        if (isAppAdmin && selectedApp && selectedRole) {
          const selectedAppData = applications.find(app => app.id === selectedApp);
          newUserObj.assignedApps.push({
            appId: selectedApp,
            appName: selectedAppData?.app_name || 'Unknown App',
            role: selectedRole
          });
        }

        setUsers(prevUsers => [...prevUsers, newUserObj]);
        
        // Clear the form
        setNewUser('');
        setNewUserEmail('');
        setSelectedApp('');
        setSelectedRole('');
        
        setSuccess('User added successfully');
        setTimeout(() => setSuccess(null), 3000);
      } catch (err) {
        console.error('Error creating user:', err);
        setError('Failed to add user: ' + (err.response?.data?.message || err.message));
      }
    } else {
      setError('Please provide both username and email');
    }
  };

  const handleAssignApp = async (userId, appId, role) => {
    try {
      await api.assignUserToApplication(userId, appId, role);
      const updatedUsers = users.map(user => 
        user.id === userId 
          ? { 
              ...user, 
              assignedApps: [...user.assignedApps, { appId, role }] 
            } 
          : user
      );
      setUsers(updatedUsers);
      setSuccess('User assigned successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to assign user');
    }
  };

  const handleRemoveAssignment = async (userId, appId) => {
    try {
      await api.removeUserFromApplication(userId, appId);
      const updatedUsers = users.map(user =>
        user.id === userId
          ? {
              ...user,
              assignedApps: user.assignedApps.filter(app => app.appId !== appId)
            }
          : user
      );
      setUsers(updatedUsers);
      setSuccess('Assignment removed successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to remove assignment');
    }
  };

  const handleAddRole = async (appId, roleName) => {
    try {
      await api.createRole({
        app_id: appId,
        role_name: roleName
      });
      const updatedApps = applications.map(app =>
        app.id === appId
          ? { ...app, roles: [...app.roles, roleName] }
          : app
      );
      setApplications(updatedApps);
      setSuccess('Role added successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to add role');
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="user-management-container">
      <div className="user-management-header">
        <h3>User Management</h3>
        <button className="back-button" onClick={onLogout}>Sign Out</button>
      </div>
      {success && <div className="success-message">{success}</div>}
      {error && <div className="error-message">{error}</div>}
      
      <div className="add-user-form">
        <input
          type="text"
          value={newUser}
          onChange={(e) => setNewUser(e.target.value)}
          placeholder="Enter new user name"
        />
        <input
          type="email"
          value={newUserEmail}
          onChange={(e) => setNewUserEmail(e.target.value)}
          placeholder="Enter user email"
        />
        {isAppAdmin && (
          <>
            <select
              value={selectedApp}
              onChange={(e) => setSelectedApp(e.target.value)}
            >
              <option value="">Select Application</option>
              {applications.map(app => (
                <option key={app.id} value={app.id}>
                  {app.app_name}
                </option>
              ))}
            </select>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
            >
              <option value="">Select Role</option>
              {selectedApp && applications
                .find(app => app.id === selectedApp)?.roles
                .map(role => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
            </select>
          </>
        )}
        <button onClick={handleAddUser}>
          Add {isAppAdmin ? 'End User' : 'App Admin'}
        </button>
      </div>

      {isAppAdmin && (
        <>
          <div className="new-users-list">
            <h4>Recently Added End Users</h4>
            <ul>
              {users
                .filter(user => user.user_type === 'end')
                .map((user) => (
                <li key={user.user_id}>
                  <div className="user-info">
                    <span className="user-name">{user.username}</span>
                    <span className="user-email">{user.email}</span>
                    <div className="user-assignments">
                      <strong>Assigned Applications:</strong>
                      {user.assignedApps?.length > 0 ? (
                        <div className="assignments-list">
                          {user.assignedApps.map((assignment, index) => (
                            <div key={index} className="assignment-tag">
                              <span className="app-name">{assignment.appName || 'Unknown App'}</span>
                              <span className="role-name">({assignment.role || 'No Role'})</span>
                              <button 
                                className="remove-assignment"
                                onClick={() => handleRemoveAssignment(user.user_id, assignment.appId)}
                                title="Remove Assignment"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="no-assignments">No applications assigned</span>
                      )}
                    </div>
                    <div className="assignment-form">
                      <select
                        value={user.selectedApp || ''}
                        onChange={(e) => {
                          const updatedUsers = users.map(u => 
                            u.user_id === user.user_id 
                              ? { ...u, selectedApp: e.target.value, selectedRole: '' }
                              : u
                          );
                          setUsers(updatedUsers);
                        }}
                      >
                        <option value="">Select Application</option>
                        {applications
                          .filter(app => !user.assignedApps?.some(a => a.appId === app.id))
                          .map(app => (
                            <option key={app.id} value={app.id}>
                              {app.app_name}
                            </option>
                          ))}
                      </select>
                      {user.selectedApp && (
                        <select
                          value={user.selectedRole || ''}
                          onChange={(e) => {
                            const updatedUsers = users.map(u => 
                              u.user_id === user.user_id 
                                ? { ...u, selectedRole: e.target.value }
                                : u
                            );
                            setUsers(updatedUsers);
                          }}
                        >
                          <option value="">Select Role</option>
                          {applications
                            .find(app => app.id === user.selectedApp)?.roles
                            .map(role => (
                              <option key={role} value={role}>
                                {role}
                              </option>
                            ))}
                        </select>
                      )}
                      {user.selectedApp && user.selectedRole && (
                        <button
                          onClick={() => handleAssignApp(user.user_id, user.selectedApp, user.selectedRole)}
                          className="assign-button"
                        >
                          Assign
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="role-management">
            <h4>Manage Roles</h4>
            {applications.map(app => (
              <div key={app.id} className="app-roles">
                <h5>{app.app_name}</h5>
                <div className="add-role-form">
                  <input
                    type="text"
                    placeholder="New role name"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleAddRole(app.id, e.target.value);
                        e.target.value = '';
                      }
                    }}
                  />
                </div>
                <div className="role-list">
                  {(app.roles || []).map((role, index) => (
                    <span key={index} className="role-tag">{role}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default UserManagement; 