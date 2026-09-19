const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(
        "mongodb+srv://utkarsh:1234@nodetuts.wa1varh.mongodb.net/?retryWrites=true&w=majority",
        {
          dbName: "thinkpro-lms",
        }
      );  
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Migration to remove subject, school, and module references from resources
const removeSubjectReferences = async () => {
  try {
    console.log('Starting migration: Remove subject, school, and module references from resources...');
    
    // Get the resources collection
    const db = mongoose.connection.db;
    const resourcesCollection = db.collection('resources');
    
    // Update all resources to remove subject, school, and module fields
    const result = await resourcesCollection.updateMany(
      {}, // Update all documents
      {
        $unset: {
          subject: "",
          school: "",
          module: "",
          grade: ""
        }
      }
    );
    
    console.log(`Migration completed successfully:`);
    console.log(`- Matched ${result.matchedCount} documents`);
    console.log(`- Modified ${result.modifiedCount} documents`);
    console.log(`- Removed subject, school, module, and grade fields from all resources`);
    
    // Also remove any indexes that reference these fields
    try {
      await resourcesCollection.dropIndex('subject_1_grade_1');
      console.log('- Dropped index: subject_1_grade_1');
    } catch (error) {
      console.log('- Index subject_1_grade_1 not found or already dropped');
    }
    
    try {
      await resourcesCollection.dropIndex('school_1');
      console.log('- Dropped index: school_1');
    } catch (error) {
      console.log('- Index school_1 not found or already dropped');
    }
    
    try {
      await resourcesCollection.dropIndex('module_1');
      console.log('- Dropped index: module_1');
    } catch (error) {
      console.log('- Index module_1 not found or already dropped');
    }
    
    console.log('Migration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
};

// Run the migration
const runMigration = async () => {
  try {
    await connectDB();
    await removeSubjectReferences();
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  }
};

// Run if this file is executed directly
if (require.main === module) {
  runMigration();
}

module.exports = { removeSubjectReferences };
