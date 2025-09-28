require('dotenv').config();
const { supabaseAdmin } = require('../lib/supabase');
const oldStore = require('../api/_store');

async function migrateData() {
  try {
    console.log('🔄 Starting data migration from old storage to Supabase...');

    // Load existing data from the old storage system
    console.log('📂 Loading existing data...');
    const existingData = await oldStore.loadSubmissions();
    
    if (!existingData || existingData.length === 0) {
      console.log('ℹ️  No existing data found to migrate.');
      return true;
    }

    console.log(`📊 Found ${existingData.length} records to migrate.`);

    // Check if Supabase table already has data
    const { data: existingSupabaseData, error: countError } = await supabaseAdmin
      .from('feedback_submissions')
      .select('id', { count: 'exact' });

    if (countError) {
      console.error('❌ Error checking existing Supabase data:', countError.message);
      console.log('💡 Make sure you have run the database schema setup first.');
      return false;
    }

    if (existingSupabaseData && existingSupabaseData.length > 0) {
      console.log(`⚠️  Supabase already contains ${existingSupabaseData.length} records.`);
      console.log('🤔 Do you want to continue? This will add the data without removing existing records.');
      // For safety, we'll proceed but not clear existing data
    }

    // Convert data format for Supabase
    console.log('🔄 Converting data format...');
    const supabaseData = existingData.map(record => ({
      id: record.id,
      created_at: record.createdAt,
      meal_preference: record.mealPreference,
      taste: record.taste,
      service: record.service,
      wait_time: record.wait,
      overall: record.overall,
      favourite_item: record.favouriteItem,
      improvements: record.improvements,
      experience_index: record.experienceIndex,
      sentiment: record.sentiment
    }));

    // Insert data in batches to avoid potential issues with large datasets
    const batchSize = 100;
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < supabaseData.length; i += batchSize) {
      const batch = supabaseData.slice(i, i + batchSize);
      console.log(`📤 Inserting batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(supabaseData.length / batchSize)} (${batch.length} records)...`);

      const { data, error } = await supabaseAdmin
        .from('feedback_submissions')
        .insert(batch);

      if (error) {
        console.error(`❌ Error inserting batch ${Math.floor(i / batchSize) + 1}:`, error.message);
        errorCount += batch.length;
      } else {
        successCount += batch.length;
        console.log(`✅ Successfully inserted ${batch.length} records.`);
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`✅ Successfully migrated: ${successCount} records`);
    console.log(`❌ Failed to migrate: ${errorCount} records`);
    console.log(`📊 Total processed: ${successCount + errorCount} records`);

    if (successCount > 0) {
      console.log('\n🎉 Migration completed successfully!');
      console.log('💡 You can now test your application with the migrated data.');
      
      if (errorCount === 0) {
        console.log('🧹 Consider backing up and removing the old data files after verifying everything works correctly.');
      }
    }

    return errorCount === 0;

  } catch (error) {
    console.error('❌ Migration failed with error:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Make sure you have set up the database schema in Supabase');
    console.log('2. Verify your environment variables are correct');
    console.log('3. Check that your Supabase service role key has the necessary permissions');
    return false;
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  migrateData()
    .then(success => {
      process.exit(success ? 0 : 1);
    });
}

module.exports = { migrateData };
