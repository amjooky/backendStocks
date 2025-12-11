import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const server = createServer(app);

// Initialize Socket.IO with CORS configuration
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global Chat Platform Data
const chatCategories = {
  'general': {
    name: 'General',
    description: 'General discussions and introductions',
    topics: ['Welcome', 'Random', 'Help', 'Announcements']
  },
  'technology': {
    name: 'Technology',
    description: 'All about tech, programming, and innovation',
    topics: ['Programming', 'AI/ML', 'Web Development', 'Mobile Apps', 'Gaming']
  },
  'lifestyle': {
    name: 'Lifestyle',
    description: 'Life, hobbies, and personal interests',
    topics: ['Travel', 'Food', 'Music', 'Books', 'Movies', 'Sports']
  },
  'business': {
    name: 'Business',
    description: 'Entrepreneurship, startups, and business discussions',
    topics: ['Startups', 'Marketing', 'Finance', 'Career', 'Networking']
  },
  'creative': {
    name: 'Creative',
    description: 'Art, design, and creative pursuits',
    topics: ['Art', 'Design', 'Photography', 'Writing', 'Music Production']
  },
  'learning': {
    name: 'Learning',
    description: 'Education, courses, and knowledge sharing',
    topics: ['Study Groups', 'Tutorials', 'Languages', 'Science', 'History']
  }
};

const statusOptions = ['online', 'away', 'busy', 'offline'];
const locations = [
  'New York, USA', 'London, UK', 'Tokyo, Japan', 'Berlin, Germany', 
  'Toronto, Canada', 'Sydney, Australia', 'Mumbai, India', 'São Paulo, Brazil',
  'Paris, France', 'Singapore', 'Dubai, UAE', 'Remote'
];

const interestCategories = {
  'Technology': ['Programming', 'AI/ML', 'Cybersecurity', 'Blockchain', 'IoT'],
  'Creative': ['Art', 'Design', 'Photography', 'Writing', 'Music'],
  'Business': ['Entrepreneurship', 'Marketing', 'Finance', 'Leadership'],
  'Lifestyle': ['Travel', 'Food', 'Fitness', 'Movies', 'Books'],
  'Sports': ['Football', 'Basketball', 'Tennis', 'Gaming', 'Cycling'],
  'Science': ['Physics', 'Biology', 'Chemistry', 'Space', 'Environment']
};

const generateUser = (id, firstName, lastName, email, interests, location, status = 'online') => {
  const username = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
  return {
    id: id.toString(),
    email,
    username,
    name: { firstName, lastName },
    fullName: `${firstName} ${lastName}`,
    interests: interests || ['General', 'Technology'],
    profilePhoto: `https://i.pravatar.cc/200?u=${email}`,
    status,
    lastSeen: status === 'offline' ? new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString() : new Date().toISOString(),
    isActive: status !== 'offline',
    bio: `Hello! I'm ${firstName}, interested in ${interests.join(', ')}. Always excited to meet new people and chat!`,
    location,
    timezone: 'UTC-8',
    joinedAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
    settings: {
      notifications: { 
        email: Math.random() > 0.3, 
        push: Math.random() > 0.2, 
        mentions: true,
        sounds: Math.random() > 0.4
      },
      privacy: { 
        showOnlineStatus: Math.random() > 0.1, 
        showLastSeen: Math.random() > 0.2,
        showEmail: Math.random() > 0.7
      },
      theme: ['light', 'dark', 'auto'][Math.floor(Math.random() * 3)]
    },
    createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString()
  };
};

// Generate diverse global users with varied interests
const generateRandomInterests = () => {
  const allInterests = Object.values(interestCategories).flat();
  const count = Math.floor(Math.random() * 4) + 2; // 2-5 interests
  const selected = [];
  
  while (selected.length < count && selected.length < allInterests.length) {
    const interest = allInterests[Math.floor(Math.random() * allInterests.length)];
    if (!selected.includes(interest)) {
      selected.push(interest);
    }
  }
  return selected;
};

// Generate diverse global user database
let users = [];
let userId = 1;

// Diverse global users with various interests and backgrounds
const globalUsers = [
  // Tech enthusiasts
  ['Sarah', 'Johnson', 'sarah.johnson@gmail.com'],
  ['Alex', 'Martinez', 'alex.martinez@outlook.com'],
  ['Jordan', 'Lee', 'jordan.lee@yahoo.com'],
  ['Taylor', 'Brown', 'taylor.brown@protonmail.com'],
  ['Casey', 'Wilson', 'casey.wilson@icloud.com'],
  
  // Creative people
  ['Morgan', 'Davis', 'morgan.davis@gmail.com'],
  ['Riley', 'Miller', 'riley.miller@outlook.com'],
  ['Avery', 'Garcia', 'avery.garcia@yahoo.com'],
  ['Quinn', 'Rodriguez', 'quinn.rodriguez@gmail.com'],
  ['Cameron', 'Hernandez', 'cameron.hernandez@outlook.com'],
  
  // Business minded
  ['Sage', 'Lopez', 'sage.lopez@gmail.com'],
  ['River', 'Gonzalez', 'river.gonzalez@yahoo.com'],
  ['Phoenix', 'Perez', 'phoenix.perez@protonmail.com'],
  ['Skyler', 'Sanchez', 'skyler.sanchez@icloud.com'],
  ['Rowan', 'Ramirez', 'rowan.ramirez@gmail.com'],
  
  // Lifestyle enthusiasts
  ['Emery', 'Foster', 'emery.foster@outlook.com'],
  ['Finley', 'Gonzales', 'finley.gonzales@yahoo.com'],
  ['Hayden', 'Bryant', 'hayden.bryant@gmail.com'],
  ['Indigo', 'Alexander', 'indigo.alexander@protonmail.com'],
  ['Kai', 'Russell', 'kai.russell@icloud.com'],
  
  // International users
  ['Akira', 'Tanaka', 'akira.tanaka@gmail.com'],
  ['Priya', 'Sharma', 'priya.sharma@outlook.com'],
  ['Lars', 'Nielsen', 'lars.nielsen@yahoo.com'],
  ['Sophia', 'Müller', 'sophia.muller@gmail.com'],
  ['Carlos', 'Silva', 'carlos.silva@outlook.com'],
  
  // More diverse names
  ['Zara', 'Ahmed', 'zara.ahmed@gmail.com'],
  ['Marcus', 'Johnson', 'marcus.johnson@yahoo.com'],
  ['Elena', 'Popov', 'elena.popov@protonmail.com'],
  ['David', 'Kim', 'david.kim@icloud.com'],
  ['Aisha', 'Okonkwo', 'aisha.okonkwo@gmail.com'],
  
  // Creative professionals
  ['Luna', 'Chang', 'luna.chang@outlook.com'],
  ['Felix', 'Anderson', 'felix.anderson@yahoo.com'],
  ['Maya', 'Patel', 'maya.patel@gmail.com'],
  ['Noah', 'Thompson', 'noah.thompson@protonmail.com'],
  ['Aria', 'Williams', 'aria.williams@icloud.com'],
  
  // Sports and fitness enthusiasts
  ['Jake', 'Robinson', 'jake.robinson@gmail.com'],
  ['Zoe', 'Martin', 'zoe.martin@outlook.com'],
  ['Leo', 'White', 'leo.white@yahoo.com'],
  ['Mia', 'Jackson', 'mia.jackson@gmail.com'],
  ['Ryan', 'Harris', 'ryan.harris@protonmail.com'],
  
  // Science and learning focused
  ['Ava', 'Clark', 'ava.clark@icloud.com'],
  ['Ethan', 'Lewis', 'ethan.lewis@gmail.com'],
  ['Grace', 'Walker', 'grace.walker@outlook.com'],
  ['Owen', 'Hall', 'owen.hall@yahoo.com'],
  ['Chloe', 'Young', 'chloe.young@gmail.com'],
  
  // Music and art lovers
  ['Liam', 'King', 'liam.king@protonmail.com'],
  ['Emma', 'Wright', 'emma.wright@icloud.com'],
  ['Lucas', 'Green', 'lucas.green@gmail.com'],
  ['Olivia', 'Adams', 'olivia.adams@outlook.com'],
  ['Mason', 'Baker', 'mason.baker@yahoo.com'],
  
  // Travel enthusiasts
  ['Isabella', 'Nelson', 'isabella.nelson@gmail.com'],
  ['Logan', 'Carter', 'logan.carter@protonmail.com'],
  ['Sophia', 'Mitchell', 'sophia.mitchell@icloud.com'],
  ['Jackson', 'Perez', 'jackson.perez@gmail.com'],
  ['Amelia', 'Roberts', 'amelia.roberts@outlook.com']
];

// Generate all users with random interests and locations
globalUsers.forEach(([firstName, lastName, email]) => {
  const interests = generateRandomInterests();
  const location = locations[Math.floor(Math.random() * locations.length)];
  const status = statusOptions[Math.floor(Math.random() * statusOptions.length)];
  
  users.push(generateUser(userId++, firstName, lastName, email, interests, location, status));
});

// Generate realistic chat channels and message history
let chats = [];
let messages = [];
let currentUserId = null;
let chatId = 1;
let messageId = 1;

// Helper functions for generating realistic chat data
const createGroupChat = (name, description, department, participants, isPublic = true, category = 'General') => {
  const chat = {
    _id: (chatId++).toString(),
    name,
    description,
    type: 'group',
    isPublic,
    category,
    department,
    participants: participants.map(user => ({
      user,
      role: user.role === 'director' || user.role === 'manager' ? 'admin' : 'member',
      joinedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      lastRead: new Date(Date.now() - Math.random() * 2 * 24 * 60 * 60 * 1000).toISOString(),
      notifications: Math.random() > 0.3
    })),
    settings: {
      allowFileSharing: true,
      allowTaskAssignment: true,
      retentionDays: department === 'Executive' ? 365 : 90,
      isArchived: false,
      isPinned: Math.random() > 0.8
    },
    tags: generateChatTags(department, name),
    createdBy: participants.find(p => p.role === 'director' || p.role === 'manager')?.id || participants[0].id,
    isActive: true,
    memberCount: participants.length,
    lastActivity: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString()
  };
  chats.push(chat);
  return chat;
};

const generateChatTags = (department, name) => {
  const tags = [];
  if (name.toLowerCase().includes('urgent') || name.toLowerCase().includes('critical')) tags.push('urgent');
  if (name.toLowerCase().includes('announcement')) tags.push('announcement');
  if (name.toLowerCase().includes('project')) tags.push('project');
  if (name.toLowerCase().includes('meeting')) tags.push('meeting');
  if (department) tags.push(department.toLowerCase());
  return tags;
};

const generateMessage = (chatId, sender, content, type = 'text', timestamp = null) => {
  const message = {
    _id: (messageId++).toString(),
    chat: chatId,
    sender,
    type,
    content: typeof content === 'string' ? { text: content } : content,
    metadata: {
      edited: { isEdited: false },
      mentions: extractMentions(content),
      reactions: generateReactions(),
      isPinned: Math.random() > 0.95,
      thread: Math.random() > 0.9 ? { count: Math.floor(Math.random() * 5), lastReply: new Date().toISOString() } : null
    },
    readBy: [{ user: sender, readAt: timestamp || new Date().toISOString() }],
    status: 'sent',
    isDeleted: false,
    createdAt: timestamp || new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: timestamp || new Date().toISOString()
  };
  messages.push(message);
  return message;
};

const extractMentions = (content) => {
  if (typeof content !== 'string') return [];
  const mentions = [];
  const mentionRegex = /@(\w+)/g;
  let match;
  while ((match = mentionRegex.exec(content)) !== null) {
    const mentioned = users.find(u => u.name.firstName.toLowerCase() === match[1].toLowerCase() || u.name.lastName.toLowerCase() === match[1].toLowerCase());
    if (mentioned) mentions.push({ user: mentioned, position: match.index });
  }
  return mentions;
};

const generateReactions = () => {
  const reactions = [];
  const emojis = ['👍', '❤️', '😄', '😮', '😢', '👏', '🔥', '💯'];
  const reactionCount = Math.floor(Math.random() * 4);
  for (let i = 0; i < reactionCount; i++) {
    const emoji = emojis[Math.floor(Math.random() * emojis.length)];
    const reactors = users.slice(0, Math.floor(Math.random() * 3) + 1);
    if (!reactions.find(r => r.emoji === emoji)) {
      reactions.push({
        emoji,
        users: reactors,
        count: reactors.length
      });
    }
  }
  return reactions;
};

// Create department-specific channels
const deptUsers = {
  engineering: users.filter(u => u.department === 'Engineering'),
  marketing: users.filter(u => u.department === 'Marketing'),
  sales: users.filter(u => u.department === 'Sales'),
  product: users.filter(u => u.department === 'Product'),
  operations: users.filter(u => u.department === 'Operations'),
  executive: users.filter(u => u.department === 'Executive')
};

// Company-wide channels
createGroupChat('🏢 General', 'Company-wide announcements and discussions', 'Company', users.slice(0, 40), true, 'General');
createGroupChat('🎉 Social', 'Non-work conversations, events, and fun', 'Company', users.slice(0, 35), true, 'Social');
createGroupChat('💡 Innovation', 'Ideas, suggestions, and innovation discussions', 'Company', users.filter(u => ['senior', 'lead', 'manager', 'director'].includes(u.role)), true, 'Innovation');
createGroupChat('🚨 Urgent', 'Critical issues and urgent communications', 'Company', users.filter(u => ['lead', 'manager', 'director', 'vp', 'ceo'].includes(u.role)), false, 'Critical');

// Engineering channels
createGroupChat('💻 Engineering', 'Engineering team discussions', 'Engineering', deptUsers.engineering, true, 'Department');
createGroupChat('🔧 DevOps', 'DevOps and infrastructure discussions', 'Engineering', deptUsers.engineering.filter(u => ['DevOps', 'Backend', 'Architecture'].includes(u.team)), true, 'Technical');
createGroupChat('🎨 Frontend Guild', 'Frontend development discussions', 'Engineering', deptUsers.engineering.filter(u => ['Frontend', 'Mobile'].includes(u.team)), true, 'Technical');
createGroupChat('🔐 Security', 'Security discussions and updates', 'Engineering', deptUsers.engineering.filter(u => ['senior', 'lead', 'manager', 'director'].includes(u.role)), false, 'Security');

// Marketing channels  
createGroupChat('📢 Marketing', 'Marketing team coordination', 'Marketing', deptUsers.marketing, true, 'Department');
createGroupChat('📊 Analytics', 'Data analysis and insights', 'Marketing', deptUsers.marketing.filter(u => ['Analytics', 'Growth'].includes(u.team)), true, 'Analytics');
createGroupChat('✍️ Content Team', 'Content creation and strategy', 'Marketing', deptUsers.marketing.filter(u => ['Content', 'Brand'].includes(u.team)), true, 'Content');

// Sales channels
createGroupChat('💰 Sales', 'Sales team discussions', 'Sales', deptUsers.sales, true, 'Department');
createGroupChat('🎯 Enterprise Deals', 'Enterprise sales discussions', 'Sales', deptUsers.sales.filter(u => u.team === 'Enterprise'), false, 'Sales');
createGroupChat('🤝 Customer Success', 'Customer success and support', 'Sales', deptUsers.sales.filter(u => u.team === 'Customer Success'), true, 'Customer');

// Product channels
createGroupChat('🎯 Product', 'Product team coordination', 'Product', deptUsers.product, true, 'Department');
createGroupChat('🎨 Design System', 'Design system and UI discussions', 'Product', deptUsers.product.filter(u => ['UX Design', 'UI Design'].includes(u.team)), true, 'Design');
createGroupChat('📋 Product Planning', 'Product roadmap and planning', 'Product', deptUsers.product.filter(u => ['Product Management', 'Strategy'].includes(u.team)), false, 'Planning');

// Operations channels
createGroupChat('⚙️ Operations', 'Operations team discussions', 'Operations', deptUsers.operations, true, 'Department');
createGroupChat('💼 HR Announcements', 'HR policies and announcements', 'Operations', [...deptUsers.operations, ...users.filter(u => ['manager', 'director', 'vp'].includes(u.role))], true, 'HR');
createGroupChat('💵 Finance Updates', 'Financial updates and budget discussions', 'Operations', [...deptUsers.operations.filter(u => u.team === 'Finance'), ...users.filter(u => ['director', 'vp', 'ceo'].includes(u.role))], false, 'Finance');

// Executive channels
createGroupChat('👔 Leadership', 'Executive team discussions', 'Executive', deptUsers.executive, false, 'Executive');
createGroupChat('📈 Board Meetings', 'Board meeting preparations', 'Executive', deptUsers.executive.filter(u => ['vp', 'ceo'].includes(u.role)), false, 'Board');

// Project-specific channels
createGroupChat('🚀 Project Alpha', 'Next-gen platform development', 'Engineering', [...deptUsers.engineering.slice(0, 8), ...deptUsers.product.slice(0, 3)], false, 'Project');
createGroupChat('📱 Mobile App 2.0', 'Mobile application redesign', 'Engineering', [...deptUsers.engineering.filter(u => u.team === 'Mobile'), ...deptUsers.product.slice(0, 2)], false, 'Project');
createGroupChat('🎨 Rebrand 2024', 'Company rebranding project', 'Marketing', [...deptUsers.marketing, ...deptUsers.product.filter(u => u.team.includes('Design'))], false, 'Project');

// Generate realistic message history for each chat
const messageTemplates = {
  general: [
    "Good morning everyone! 🌅",
    "Quick reminder about the team meeting at 2 PM today",
    "Great job on the quarterly results! 🎉",
    "Don't forget to submit your timesheets by Friday",
    "Welcome to our new team members! 👋",
    "Office will be closed on Monday for the holiday",
    "Congratulations to the @sarah team for the successful launch!",
    "Please review the updated company policies in your email",
    "Coffee machine is working again! ☕",
    "Remember to update your emergency contacts in HR system"
  ],
  technical: [
    "The new API endpoint is ready for testing",
    "Database migration completed successfully ✅",
    "Can someone review this PR? It's blocking the deployment",
    "Server maintenance scheduled for this weekend",
    "New security patch needs to be applied ASAP",
    "Performance improvements show 40% faster load times!",
    "Docker containers are now using the latest base images",
    "CI/CD pipeline is running smoothly after the update",
    "Need help debugging this production issue 🐛",
    "Code review meeting moved to Thursday at 10 AM"
  ],
  marketing: [
    "Campaign performance exceeded expectations by 25%! 📈",
    "New blog post is live, please share on social media",
    "Brand guidelines updated, check the design system",
    "Press release going out tomorrow morning",
    "Social media engagement is up 45% this month",
    "Competitor analysis report is ready for review",
    "Influencer partnership contracts signed ✍️",
    "Email campaign CTR improved to 3.2%",
    "Website traffic spike after the feature announcement",
    "Marketing budget allocation for Q4 needs approval"
  ],
  sales: [
    "Closed the biggest deal of the quarter! 🎉💰",
    "New lead qualification criteria working well",
    "Customer demo scheduled for Friday at 3 PM",
    "Pipeline looks strong for this quarter",
    "Renewal rate improved to 94% this month",
    "New pricing strategy showing positive results",
    "Enterprise client wants to expand their contract",
    "Sales training session next Tuesday",
    "CRM data cleanup completed ahead of schedule",
    "Q3 sales targets exceeded by 15%! 🚀"
  ],
  product: [
    "User feedback survey results are very positive",
    "New feature rollout scheduled for next sprint",
    "A/B test results favor the new design approach",
    "Product roadmap updated with stakeholder input",
    "User research session planned for next week",
    "Prototype testing revealed interesting insights",
    "Feature usage analytics show great adoption",
    "Design system components library updated",
    "Customer interviews scheduled for Thursday",
    "Product metrics dashboard is now live"
  ]
};

// Generate messages for each chat
chats.forEach(chat => {
  const messageCount = Math.floor(Math.random() * 50) + 20; // 20-70 messages per chat
  const chatParticipants = chat.participants.map(p => p.user);
  
  // Determine message template category
  let templateCategory = 'general';
  if (chat.category === 'Technical' || chat.department === 'Engineering') templateCategory = 'technical';
  else if (chat.department === 'Marketing') templateCategory = 'marketing';
  else if (chat.department === 'Sales') templateCategory = 'sales';
  else if (chat.department === 'Product') templateCategory = 'product';
  
  const templates = messageTemplates[templateCategory] || messageTemplates.general;
  
  for (let i = 0; i < messageCount; i++) {
    const sender = chatParticipants[Math.floor(Math.random() * chatParticipants.length)];
    const template = templates[Math.floor(Math.random() * templates.length)];
    const timestamp = new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000).toISOString();
    
    generateMessage(chat._id, sender, template, 'text', timestamp);
  }
  
  // Add some file sharing messages
  if (Math.random() > 0.7) {
    const fileSender = chatParticipants[Math.floor(Math.random() * chatParticipants.length)];
    const fileMessages = [
      { name: 'project-requirements.pdf', size: '2.1 MB', type: 'application/pdf' },
      { name: 'design-mockups.zip', size: '15.7 MB', type: 'application/zip' },
      { name: 'quarterly-report.xlsx', size: '892 KB', type: 'application/vnd.ms-excel' },
      { name: 'meeting-notes.docx', size: '234 KB', type: 'application/msword' },
      { name: 'screenshot.png', size: '1.3 MB', type: 'image/png' }
    ];
    const randomFile = fileMessages[Math.floor(Math.random() * fileMessages.length)];
    
    generateMessage(chat._id, fileSender, {
      file: {
        name: randomFile.name,
        size: randomFile.size,
        type: randomFile.type,
        url: `/uploads/${randomFile.name}`
      },
      caption: 'Here\'s the file we discussed'
    }, 'file');
  }
});

console.log(`🎭 Demo data generated:`);
console.log(`   👥 ${users.length} users across ${Object.keys(departments).length} departments`);
console.log(`   💬 ${chats.length} chat channels`);
console.log(`   📝 ${messages.length} messages with realistic history`);

// Demo authentication middleware
const authenticate = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (token === 'demo-token') {
    req.user = users[0]; // Default to first user
    currentUserId = users[0].id;
    next();
  } else {
    res.status(401).json({ message: 'Authentication required' });
  }
};

// Demo Socket.IO authentication
const authenticateSocket = (socket, next) => {
  const token = socket.handshake.auth.token;
  if (token === 'demo-token') {
    socket.userId = users[0].id;
    socket.user = users[0];
    next();
  } else {
    next(new Error('Authentication error'));
  }
};

// Auth routes
app.post('/api/auth/login', (req, res) => {
  const { identifier, password } = req.body;
  
  // Demo login - accept any credentials
  const user = users.find(u => 
    u.email.toLowerCase() === identifier.toLowerCase() || 
    u.companyId.toUpperCase() === identifier.toUpperCase()
  ) || users[0];
  
  res.json({
    message: 'Login successful',
    token: 'demo-token',
    user
  });
});

app.post('/api/auth/register', (req, res) => {
  const { email, companyId, firstName, lastName, department, role } = req.body;
  
  const newUser = {
    id: (users.length + 1).toString(),
    email,
    companyId,
    name: { firstName, lastName },
    fullName: `${firstName} ${lastName}`,
    role: role || 'intern',
    department,
    profilePhoto: null,
    status: 'online',
    lastSeen: new Date().toISOString(),
    isActive: true,
    settings: {
      notifications: { email: true, push: true, mentions: true },
      privacy: { showOnlineStatus: true, showLastSeen: true }
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  users.push(newUser);
  
  res.status(201).json({
    message: 'Registration successful',
    token: 'demo-token',
    user: newUser
  });
});

app.get('/api/auth/verify', authenticate, (req, res) => {
  res.json({
    valid: true,
    user: req.user
  });
});

// Enhanced Chat API
app.get('/api/chats', authenticate, (req, res) => {
  const { category, department, type, search } = req.query;
  
  let userChats = chats.filter(chat => 
    chat.participants.some(p => p.user.id === req.user.id)
  );
  
  // Apply filters
  if (category) {
    userChats = userChats.filter(chat => chat.category === category);
  }
  if (department) {
    userChats = userChats.filter(chat => chat.department === department);
  }
  if (type) {
    userChats = userChats.filter(chat => chat.type === type);
  }
  if (search) {
    userChats = userChats.filter(chat => 
      chat.name?.toLowerCase().includes(search.toLowerCase()) ||
      chat.description?.toLowerCase().includes(search.toLowerCase())
    );
  }
  
  // Add unread message counts and last message info
  const enhancedChats = userChats.map(chat => {
    const chatMessages = messages.filter(m => m.chat === chat._id);
    const lastMessage = chatMessages[chatMessages.length - 1];
    const participant = chat.participants.find(p => p.user.id === req.user.id);
    const unreadCount = chatMessages.filter(m => 
      new Date(m.createdAt) > new Date(participant?.lastRead || 0)
    ).length;
    
    return {
      ...chat,
      lastMessage,
      unreadCount,
      messageCount: chatMessages.length,
      isParticipant: true
    };
  });
  
  // Sort by last activity
  enhancedChats.sort((a, b) => 
    new Date(b.lastActivity || b.createdAt) - new Date(a.lastActivity || a.createdAt)
  );
  
  res.json({ 
    chats: enhancedChats,
    total: enhancedChats.length,
    categories: [...new Set(chats.map(c => c.category))],
    departments: [...new Set(chats.map(c => c.department))]
  });
});

app.get('/api/chats/public', authenticate, (req, res) => {
  const { department, category, limit = 20 } = req.query;
  
  let publicChats = chats.filter(chat => chat.isPublic);
  
  if (department) {
    publicChats = publicChats.filter(chat => chat.department === department);
  }
  if (category) {
    publicChats = publicChats.filter(chat => chat.category === category);
  }
  
  // Add member count and activity info
  const enhancedChats = publicChats.map(chat => {
    const isParticipant = chat.participants.some(p => p.user.id === req.user.id);
    const chatMessages = messages.filter(m => m.chat === chat._id);
    const lastMessage = chatMessages[chatMessages.length - 1];
    
    return {
      ...chat,
      isParticipant,
      lastMessage,
      messageCount: chatMessages.length
    };
  }).slice(0, parseInt(limit));
  
  res.json({ chats: enhancedChats });
});

app.get('/api/chats/:chatId', authenticate, (req, res) => {
  const { chatId } = req.params;
  const chat = chats.find(c => c._id === chatId);
  
  if (!chat) {
    return res.status(404).json({ message: 'Chat not found' });
  }
  
  const isParticipant = chat.participants.some(p => p.user.id === req.user.id);
  if (!chat.isPublic && !isParticipant) {
    return res.status(403).json({ message: 'Access denied' });
  }
  
  const chatMessages = messages.filter(m => m.chat === chatId);
  const lastMessage = chatMessages[chatMessages.length - 1];
  
  res.json({
    chat: {
      ...chat,
      messageCount: chatMessages.length,
      lastMessage,
      isParticipant
    }
  });
});

app.post('/api/chats/:chatId/join', authenticate, (req, res) => {
  const { chatId } = req.params;
  const chat = chats.find(c => c._id === chatId);
  
  if (!chat) {
    return res.status(404).json({ message: 'Chat not found' });
  }
  
  if (!chat.isPublic) {
    return res.status(403).json({ message: 'Cannot join private chat' });
  }
  
  const isAlreadyParticipant = chat.participants.some(p => p.user.id === req.user.id);
  if (isAlreadyParticipant) {
    return res.status(400).json({ message: 'Already a participant' });
  }
  
  chat.participants.push({
    user: req.user,
    role: 'member',
    joinedAt: new Date().toISOString(),
    lastRead: new Date().toISOString(),
    notifications: true
  });
  chat.memberCount = chat.participants.length;
  chat.updatedAt = new Date().toISOString();
  
  res.json({ message: 'Successfully joined chat', chat });
});

app.post('/api/chats/:chatId/leave', authenticate, (req, res) => {
  const { chatId } = req.params;
  const chat = chats.find(c => c._id === chatId);
  
  if (!chat) {
    return res.status(404).json({ message: 'Chat not found' });
  }
  
  const participantIndex = chat.participants.findIndex(p => p.user.id === req.user.id);
  if (participantIndex === -1) {
    return res.status(400).json({ message: 'Not a participant' });
  }
  
  chat.participants.splice(participantIndex, 1);
  chat.memberCount = chat.participants.length;
  chat.updatedAt = new Date().toISOString();
  
  res.json({ message: 'Successfully left chat' });
});

app.post('/api/chats/individual', authenticate, (req, res) => {
  const { participantId } = req.body;
  const otherUser = users.find(u => u.id === participantId);
  
  if (!otherUser) {
    return res.status(404).json({ message: 'User not found' });
  }
  
  // Check if chat already exists
  let existingChat = chats.find(c => 
    c.type === 'individual' && 
    c.participants.some(p => p.user.id === req.user.id) &&
    c.participants.some(p => p.user.id === participantId)
  );
  
  if (!existingChat) {
    const newChat = {
      _id: (chats.length + 1).toString(),
      type: 'individual',
      participants: [
        { user: req.user, role: 'member', joinedAt: new Date().toISOString(), lastRead: new Date().toISOString() },
        { user: otherUser, role: 'member', joinedAt: new Date().toISOString(), lastRead: new Date().toISOString() }
      ],
      settings: {
        allowFileSharing: true,
        allowTaskAssignment: true,
        retentionDays: 0,
        isArchived: false,
        isPinned: false
      },
      createdBy: req.user.id,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    chats.push(newChat);
    existingChat = newChat;
  }
  
  res.json({
    message: 'Chat created successfully',
    chat: existingChat
  });
});

// Enhanced Messages API
app.get('/api/messages/chat/:chatId', authenticate, (req, res) => {
  const { chatId } = req.params;
  const { page = 1, limit = 50, search, type, before, after } = req.query;
  
  const chat = chats.find(c => c._id === chatId);
  if (!chat) {
    return res.status(404).json({ message: 'Chat not found' });
  }
  
  const isParticipant = chat.participants.some(p => p.user.id === req.user.id);
  if (!chat.isPublic && !isParticipant) {
    return res.status(403).json({ message: 'Access denied' });
  }
  
  let chatMessages = messages.filter(m => m.chat === chatId && !m.isDeleted);
  
  // Apply filters
  if (search) {
    chatMessages = chatMessages.filter(m => 
      (m.content.text && m.content.text.toLowerCase().includes(search.toLowerCase())) ||
      (m.content.file && m.content.file.name.toLowerCase().includes(search.toLowerCase())) ||
      m.sender.fullName.toLowerCase().includes(search.toLowerCase())
    );
  }
  
  if (type) {
    chatMessages = chatMessages.filter(m => m.type === type);
  }
  
  if (before) {
    chatMessages = chatMessages.filter(m => new Date(m.createdAt) < new Date(before));
  }
  
  if (after) {
    chatMessages = chatMessages.filter(m => new Date(m.createdAt) > new Date(after));
  }
  
  // Sort by creation date (newest first for pagination)
  chatMessages.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  // Pagination
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + parseInt(limit);
  const paginatedMessages = chatMessages.slice(startIndex, endIndex);
  
  // Reverse to show chronological order
  paginatedMessages.reverse();
  
  res.json({
    messages: paginatedMessages,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: chatMessages.length,
      hasMore: endIndex < chatMessages.length
    },
    filters: { search, type, before, after }
  });
});

app.get('/api/messages/search', authenticate, (req, res) => {
  const { query, chatId, userId, type, limit = 20, page = 1 } = req.query;
  
  if (!query || query.length < 2) {
    return res.status(400).json({ message: 'Search query must be at least 2 characters' });
  }
  
  // Get user's accessible chats
  const userChats = chats.filter(chat => 
    chat.isPublic || chat.participants.some(p => p.user.id === req.user.id)
  ).map(c => c._id);
  
  let searchResults = messages.filter(m => 
    userChats.includes(m.chat) &&
    !m.isDeleted &&
    (
      (m.content.text && m.content.text.toLowerCase().includes(query.toLowerCase())) ||
      (m.content.file && m.content.file.name.toLowerCase().includes(query.toLowerCase())) ||
      m.sender.fullName.toLowerCase().includes(query.toLowerCase())
    )
  );
  
  // Apply additional filters
  if (chatId) {
    searchResults = searchResults.filter(m => m.chat === chatId);
  }
  if (userId) {
    searchResults = searchResults.filter(m => m.sender.id === userId);
  }
  if (type) {
    searchResults = searchResults.filter(m => m.type === type);
  }
  
  // Sort by relevance (newest first)
  searchResults.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  // Pagination
  const startIndex = (page - 1) * limit;
  const paginatedResults = searchResults.slice(startIndex, startIndex + parseInt(limit));
  
  // Add chat context to results
  const enhancedResults = paginatedResults.map(message => {
    const chat = chats.find(c => c._id === message.chat);
    return {
      ...message,
      chat: {
        _id: chat._id,
        name: chat.name,
        type: chat.type,
        department: chat.department
      }
    };
  });
  
  res.json({
    results: enhancedResults,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: searchResults.length,
      hasMore: startIndex + parseInt(limit) < searchResults.length
    },
    query
  });
});

app.post('/api/messages/:messageId/react', authenticate, (req, res) => {
  const { messageId } = req.params;
  const { emoji } = req.body;
  
  const message = messages.find(m => m._id === messageId);
  if (!message) {
    return res.status(404).json({ message: 'Message not found' });
  }
  
  const chat = chats.find(c => c._id === message.chat);
  const isParticipant = chat.participants.some(p => p.user.id === req.user.id);
  if (!chat.isPublic && !isParticipant) {
    return res.status(403).json({ message: 'Access denied' });
  }
  
  // Find existing reaction
  const existingReaction = message.metadata.reactions.find(r => r.emoji === emoji);
  
  if (existingReaction) {
    // Toggle reaction
    const userIndex = existingReaction.users.findIndex(u => u.id === req.user.id);
    if (userIndex > -1) {
      // Remove reaction
      existingReaction.users.splice(userIndex, 1);
      existingReaction.count = existingReaction.users.length;
      
      if (existingReaction.count === 0) {
        const reactionIndex = message.metadata.reactions.findIndex(r => r.emoji === emoji);
        message.metadata.reactions.splice(reactionIndex, 1);
      }
    } else {
      // Add reaction
      existingReaction.users.push(req.user);
      existingReaction.count = existingReaction.users.length;
    }
  } else {
    // Create new reaction
    message.metadata.reactions.push({
      emoji,
      users: [req.user],
      count: 1
    });
  }
  
  message.updatedAt = new Date().toISOString();
  
  res.json({
    message: 'Reaction updated',
    reactions: message.metadata.reactions
  });
});

app.post('/api/messages/:messageId/pin', authenticate, (req, res) => {
  const { messageId } = req.params;
  const message = messages.find(m => m._id === messageId);
  
  if (!message) {
    return res.status(404).json({ message: 'Message not found' });
  }
  
  const chat = chats.find(c => c._id === message.chat);
  const participant = chat.participants.find(p => p.user.id === req.user.id);
  
  if (!participant || (participant.role !== 'admin' && chat.createdBy !== req.user.id)) {
    return res.status(403).json({ message: 'Permission denied' });
  }
  
  message.metadata.isPinned = !message.metadata.isPinned;
  message.updatedAt = new Date().toISOString();
  
  res.json({
    message: `Message ${message.metadata.isPinned ? 'pinned' : 'unpinned'}`,
    isPinned: message.metadata.isPinned
  });
});

app.get('/api/messages/pinned/:chatId', authenticate, (req, res) => {
  const { chatId } = req.params;
  
  const chat = chats.find(c => c._id === chatId);
  if (!chat) {
    return res.status(404).json({ message: 'Chat not found' });
  }
  
  const isParticipant = chat.participants.some(p => p.user.id === req.user.id);
  if (!chat.isPublic && !isParticipant) {
    return res.status(403).json({ message: 'Access denied' });
  }
  
  const pinnedMessages = messages.filter(m => 
    m.chat === chatId && 
    m.metadata.isPinned && 
    !m.isDeleted
  ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  res.json({ messages: pinnedMessages });
});

// Enhanced Users API
app.get('/api/users/search/:term', authenticate, (req, res) => {
  const { term } = req.params;
  const { department, role, status, limit = 50 } = req.query;
  
  let searchResults = users.filter(u => 
    u.id !== req.user.id &&
    (u.name.firstName.toLowerCase().includes(term.toLowerCase()) ||
     u.name.lastName.toLowerCase().includes(term.toLowerCase()) ||
     u.email.toLowerCase().includes(term.toLowerCase()) ||
     u.companyId.toLowerCase().includes(term.toLowerCase()) ||
     u.department?.toLowerCase().includes(term.toLowerCase()) ||
     u.team?.toLowerCase().includes(term.toLowerCase()))
  );
  
  // Apply filters
  if (department) {
    searchResults = searchResults.filter(u => u.department === department);
  }
  if (role) {
    searchResults = searchResults.filter(u => u.role === role);
  }
  if (status) {
    searchResults = searchResults.filter(u => u.status === status);
  }
  
  // Limit results
  searchResults = searchResults.slice(0, parseInt(limit));
  
  res.json({ 
    users: searchResults,
    total: searchResults.length,
    filters: { department, role, status, limit }
  });
});

app.get('/api/users/colleagues', authenticate, (req, res) => {
  const colleagues = users.filter(u => 
    u.id !== req.user.id && 
    u.department === req.user.department
  );
  
  res.json({ 
    colleagues,
    department: req.user.department,
    total: colleagues.length
  });
});

app.get('/api/users/:userId', authenticate, (req, res) => {
  const { userId } = req.params;
  const user = users.find(u => u.id === userId);
  
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  
  res.json({ user });
});

app.get('/api/departments', authenticate, (req, res) => {
  const departmentStats = Object.entries(departments).map(([key, dept]) => {
    const deptUsers = users.filter(u => u.department === key);
    const onlineCount = deptUsers.filter(u => u.status === 'online').length;
    
    return {
      ...dept,
      id: key,
      userCount: deptUsers.length,
      onlineCount,
      teams: dept.teams.map(team => {
        const teamUsers = deptUsers.filter(u => u.team === team);
        return {
          name: team,
          userCount: teamUsers.length,
          onlineCount: teamUsers.filter(u => u.status === 'online').length
        };
      })
    };
  });
  
  res.json({ departments: departmentStats });
});

app.get('/api/users', authenticate, (req, res) => {
  const { page = 1, limit = 20, department, role, status, sort = 'name' } = req.query;
  
  let filteredUsers = users.filter(u => u.id !== req.user.id);
  
  // Apply filters
  if (department) filteredUsers = filteredUsers.filter(u => u.department === department);
  if (role) filteredUsers = filteredUsers.filter(u => u.role === role);
  if (status) filteredUsers = filteredUsers.filter(u => u.status === status);
  
  // Sort users
  filteredUsers.sort((a, b) => {
    switch (sort) {
      case 'name':
        return a.fullName.localeCompare(b.fullName);
      case 'department':
        return a.department.localeCompare(b.department);
      case 'role':
        return roles.indexOf(a.role) - roles.indexOf(b.role);
      case 'status':
        return statusOptions.indexOf(a.status) - statusOptions.indexOf(b.status);
      default:
        return 0;
    }
  });
  
  // Pagination
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + parseInt(limit);
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);
  
  res.json({
    users: paginatedUsers,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: filteredUsers.length,
      pages: Math.ceil(filteredUsers.length / limit)
    },
    filters: { department, role, status, sort }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK - Demo Mode', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Socket.IO authentication middleware
io.use(authenticateSocket);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`Demo: User ${socket.userId} connected`);
  
  socket.on('join_rooms', () => {
    // Join user's chats
    chats.forEach(chat => {
      if (chat.participants.some(p => p.user.id === socket.userId)) {
        socket.join(chat._id);
      }
    });
    socket.join(`user_${socket.userId}`);
  });
  
  socket.on('join_chat', ({ chatId }) => {
    socket.join(chatId);
    socket.emit('joined_chat', { chatId, message: 'Joined chat successfully' });
  });
  
  socket.on('send_message', (data) => {
    const { chatId, content, tempId } = data;
    
    const newMessage = {
      _id: (messages.length + 1).toString(),
      chat: chatId,
      sender: socket.user,
      type: 'text',
      content: { text: content.text },
      metadata: {
        edited: { isEdited: false },
        mentions: [],
        reactions: [],
        isPinned: false
      },
      readBy: [{ user: socket.user, readAt: new Date().toISOString() }],
      status: 'sent',
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    messages.push(newMessage);
    
    // Broadcast to all in chat
    io.to(chatId).emit('new_message', { message: newMessage });
    
    // Send confirmation to sender
    socket.emit('message_sent', {
      tempId,
      messageId: newMessage._id,
      timestamp: newMessage.createdAt
    });
  });
  
  socket.on('disconnect', (reason) => {
    console.log(`Demo: User ${socket.userId} disconnected: ${reason}`);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error stack:', err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error'
  });
});

// Handle 404 routes
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Demo Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
  console.log(`🌐 CORS origin: ${process.env.CORS_ORIGIN}`);
  console.log(`🎭 Demo Mode: No database required`);
});

export { io };