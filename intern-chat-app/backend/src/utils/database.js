import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const options = {
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    };

    const conn = await mongoose.connect(process.env.MONGODB_URI, options);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
    
    // Handle connection events
    mongoose.connection.on('disconnected', () => {
      console.log('❌ MongoDB Disconnected');
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB Connection Error:', err);
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB Reconnected');
    });

  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    
    // Exit process with failure if initial connection fails
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    } else {
      console.log('🔄 Retrying database connection in 5 seconds...');
      setTimeout(connectDB, 5000);
    }
  }
};

// Graceful shutdown handler
const gracefulShutdown = () => {
  mongoose.connection.close(() => {
    console.log('📦 MongoDB connection closed through app termination');
    process.exit(0);
  });
};

// Listen for termination signals
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

export default connectDB;