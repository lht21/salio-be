import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Lesson } from '../models/index.js';

dotenv.config();

async function getLessonIds() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const lessons = await Lesson.find({}, { _id: 1, title: 1, order: 1 }).sort({ order: 1 });
    console.log('\n📋 Real Lesson IDs:');
    lessons.forEach(lesson => {
      console.log(`ID: ${lesson._id}, Title: ${lesson.title}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

getLessonIds();