import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Grid,
  Card,
  CardContent,
  Avatar,
  Chip,
  IconButton,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  InputAdornment,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Badge,
  Tooltip,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  Search as SearchIcon,
  ExpandMore,
  Person,
  Business,
  Group,
  Email,
  Phone,
  LocationOn,
  Circle,
  ChatBubbleOutline,
  Work,
  School,
  Star
} from '@mui/icons-material';
import { usersAPI } from '../../services/api';

interface User {
  id: string;
  name: { firstName: string; lastName: string };
  fullName: string;
  email: string;
  role: string;
  department: string;
  team: string;
  title: string;
  profilePhoto?: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  bio?: string;
  location?: string;
  skills?: string[];
}

interface Department {
  id: string;
  name: string;
  description: string;
  head: string;
  userCount: number;
  onlineCount: number;
  teams: { name: string; userCount: number; onlineCount: number }[];
}

const statusColors = {
  online: '#4caf50',
  away: '#ff9800',
  busy: '#f44336',
  offline: '#9e9e9e'
};

const statusIcons = {
  online: '🟢',
  away: '🟡', 
  busy: '🔴',
  offline: '⚫'
};

const TeamDirectory: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load all users
      const usersResponse = await usersAPI.getUsers();
      setUsers(usersResponse.data?.data || []);

      // Load departments
      const deptResponse = await fetch('http://localhost:5000/api/departments', {
        headers: { 'Authorization': `Bearer demo-token` }
      });
      const deptData = await deptResponse.json();
      setDepartments(deptData.departments || []);
      
    } catch (error) {
      console.error('Failed to load directory data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = searchTerm === '' || 
      user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.team.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDepartment = selectedDepartment === '' || user.department === selectedDepartment;
    const matchesRole = selectedRole === '' || user.role === selectedRole;
    const matchesStatus = selectedStatus === '' || user.status === selectedStatus;

    return matchesSearch && matchesDepartment && matchesRole && matchesStatus;
  });

  const UserCard: React.FC<{ user: User }> = ({ user }) => (
    <Card 
      sx={{ 
        height: '100%', 
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': { 
          transform: 'translateY(-4px)', 
          boxShadow: 4 
        }
      }}
    >
      <CardContent sx={{ textAlign: 'center', position: 'relative' }}>
        <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
          <Tooltip title={`${user.status.charAt(0).toUpperCase() + user.status.slice(1)}`}>
            <Circle sx={{ color: statusColors[user.status], fontSize: 12 }} />
          </Tooltip>
        </Box>
        
        <Avatar
          src={user.profilePhoto}
          sx={{ 
            width: 80, 
            height: 80, 
            margin: '0 auto 16px',
            border: `3px solid ${statusColors[user.status]}`
          }}
        >
          {user.name.firstName[0]}{user.name.lastName[0]}
        </Avatar>
        
        <Typography variant="h6" gutterBottom>
          {user.fullName}
        </Typography>
        
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {user.title}
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center', flexWrap: 'wrap', mb: 2 }}>
          <Chip 
            label={user.department} 
            size="small" 
            color="primary" 
            variant="outlined"
          />
          <Chip 
            label={user.team} 
            size="small" 
            color="secondary" 
            variant="outlined"
          />
          <Chip 
            label={user.role} 
            size="small" 
            variant="outlined"
          />
        </Box>
        
        {user.bio && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontSize: '0.85em' }}>
            {user.bio}
          </Typography>
        )}
        
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', alignItems: 'center', mb: 2 }}>
          <Tooltip title={user.email}>
            <IconButton size="small" color="primary">
              <Email fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Start chat">
            <IconButton size="small" color="secondary">
              <ChatBubbleOutline fontSize="small" />
            </IconButton>
          </Tooltip>
          {user.location && (
            <Tooltip title={user.location}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <LocationOn fontSize="small" color="action" />
                <Typography variant="caption" color="text.secondary">
                  {user.location}
                </Typography>
              </Box>
            </Tooltip>
          )}
        </Box>
        
        {user.skills && user.skills.length > 0 && (
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'center' }}>
            {user.skills.slice(0, 3).map((skill, index) => (
              <Chip 
                key={index}
                label={skill} 
                size="small" 
                sx={{ fontSize: '0.7rem', height: 20 }}
              />
            ))}
            {user.skills.length > 3 && (
              <Chip 
                label={`+${user.skills.length - 3}`} 
                size="small" 
                sx={{ fontSize: '0.7rem', height: 20 }}
                color="default"
              />
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );

  const DepartmentView: React.FC = () => (
    <Box>
      {departments.map((dept) => (
        <Accordion key={dept.id} sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
              <Business color="primary" />
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="h6">{dept.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {dept.description}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Badge badgeContent={dept.onlineCount} color="success">
                  <Group />
                </Badge>
                <Typography variant="caption" color="text.secondary">
                  {dept.userCount} members
                </Typography>
              </Box>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              {dept.teams.map((team) => (
                <Grid xs={12} sm={6} md={4} key={team.name}>
                  <Card variant="outlined" sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Group fontSize="small" color="primary" />
                      <Typography variant="subtitle2">{team.name}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        {team.userCount} members
                      </Typography>
                      <Circle sx={{ color: statusColors.online, fontSize: 8 }} />
                      <Typography variant="caption" color="success.main">
                        {team.onlineCount} online
                      </Typography>
                    </Box>
                  </Card>
                </Grid>
              ))}
            </Grid>
            
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" gutterBottom>Team Members</Typography>
              <Grid container spacing={2}>
                {filteredUsers
                  .filter(user => user.department === dept.name)
                  .map((user) => (
                    <Grid xs={12} sm={6} md={4} lg={3} key={user.id}>
                      <UserCard user={user} />
                    </Grid>
                  ))}
              </Grid>
            </Box>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Loading team directory...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          👥 Team Directory
        </Typography>
        <Typography variant="body1" color="text.secondary" gutterBottom>
          Connect with your team members across all departments
        </Typography>
      </Box>

      {/* Search and Filters */}
      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Search people, roles, departments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Department</InputLabel>
              <Select
                value={selectedDepartment}
                label="Department"
                onChange={(e) => setSelectedDepartment(e.target.value)}
              >
                <MenuItem value="">All Departments</MenuItem>
                {departments.map((dept) => (
                  <MenuItem key={dept.id} value={dept.name}>{dept.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Role</InputLabel>
              <Select
                value={selectedRole}
                label="Role"
                onChange={(e) => setSelectedRole(e.target.value)}
              >
                <MenuItem value="">All Roles</MenuItem>
                <MenuItem value="intern">Intern</MenuItem>
                <MenuItem value="junior">Junior</MenuItem>
                <MenuItem value="mid">Mid</MenuItem>
                <MenuItem value="senior">Senior</MenuItem>
                <MenuItem value="lead">Lead</MenuItem>
                <MenuItem value="manager">Manager</MenuItem>
                <MenuItem value="director">Director</MenuItem>
                <MenuItem value="vp">VP</MenuItem>
                <MenuItem value="ceo">CEO</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={selectedStatus}
                label="Status"
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <MenuItem value="">All Status</MenuItem>
                <MenuItem value="online">🟢 Online</MenuItem>
                <MenuItem value="away">🟡 Away</MenuItem>
                <MenuItem value="busy">🔴 Busy</MenuItem>
                <MenuItem value="offline">⚫ Offline</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid xs={12} md={2}>
            <Typography variant="body2" color="text.secondary">
              {filteredUsers.length} of {users.length} people
            </Typography>
          </Grid>
        </Grid>
      </Box>

      {/* Tabs */}
      <Tabs value={selectedTab} onChange={(e, newValue) => setSelectedTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="👥 All People" icon={<Person />} iconPosition="start" />
        <Tab label="🏢 By Department" icon={<Business />} iconPosition="start" />
        <Tab label="📊 Statistics" icon={<Group />} iconPosition="start" />
      </Tabs>

      {/* Content */}
      {selectedTab === 0 && (
        <Grid container spacing={3}>
          {filteredUsers.map((user) => (
            <Grid xs={12} sm={6} md={4} lg={3} key={user.id}>
              <UserCard user={user} />
            </Grid>
          ))}
        </Grid>
      )}

      {selectedTab === 1 && <DepartmentView />}

      {selectedTab === 2 && (
        <Box>
          <Grid container spacing={3}>
            <Grid xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Team Overview</Typography>
                  <List>
                    <ListItem>
                      <ListItemText 
                        primary="Total Team Members" 
                        secondary={`${users.length} people`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="Currently Online" 
                        secondary={`${users.filter(u => u.status === 'online').length} people`} 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="Departments" 
                        secondary={`${departments.length} departments`} 
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
            <Grid xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Department Breakdown</Typography>
                  {departments.map((dept) => (
                    <Box key={dept.id} sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2">{dept.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {dept.userCount} people
                        </Typography>
                      </Box>
                      <Box sx={{ 
                        width: '100%', 
                        height: 4, 
                        bgcolor: 'grey.200', 
                        borderRadius: 2,
                        mt: 0.5
                      }}>
                        <Box sx={{
                          width: `${(dept.userCount / users.length) * 100}%`,
                          height: '100%',
                          bgcolor: 'primary.main',
                          borderRadius: 2
                        }} />
                      </Box>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}
    </Box>
  );
};

export default TeamDirectory;
