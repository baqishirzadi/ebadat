/**
 * Seed Articles Script (Supabase Version)
 * Imports articles and scholars from seed data to Supabase
 * 
 * Usage: 
 *   1. Make sure .env file exists with Supabase credentials
 *   2. Run: node scripts/seedArticlesWeb.js
 * 
 * Requirements:
 *   - .env file with EXPO_PUBLIC_SUPABASE_* variables
 *   - Supabase project with database tables created
 *   - Database schema applied (run supabase/migrations/001_initial_schema.sql)
 */

// Load environment variables from .env file
try {
  require('dotenv').config();
} catch (e) {
  // dotenv not installed, try to read .env manually
  const fs = require('fs');
  const path = require('path');
  const envPath = path.join(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=:#]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });
  }
}

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase configuration from environment variables
// Prefer Service Role Key for seeding (bypasses RLS), fallback to anon key
const supabaseConfig = {
  url: process.env.EXPO_PUBLIC_SUPABASE_URL,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
};

// Validate configuration
function validateConfig() {
  const required = ['url'];
  const missing = required.filter(key => !supabaseConfig[key] || supabaseConfig[key].length === 0 || supabaseConfig[key].includes('your-'));
  
  if (missing.length > 0) {
    console.error('❌ Missing Supabase configuration:');
    missing.forEach(key => {
      const envKey = key === 'url' ? 'EXPO_PUBLIC_SUPABASE_URL' : 'EXPO_PUBLIC_SUPABASE_ANON_KEY';
      console.error(`   - ${envKey}`);
    });
    console.error('\n💡 Please create .env file with Supabase credentials.');
    console.error('   See .env.example for template.\n');
    process.exit(1);
  }

  // Check for at least one key (service role preferred, but anon key works too)
  if (!supabaseConfig.serviceRoleKey && !supabaseConfig.anonKey) {
    console.error('❌ Missing Supabase API key:');
    console.error('   - SUPABASE_SERVICE_ROLE_KEY (recommended for seeding)');
    console.error('   - OR EXPO_PUBLIC_SUPABASE_ANON_KEY (fallback)');
    console.error('\n💡 For seeding, Service Role Key is recommended as it bypasses RLS.');
    console.error('   Find it in: Supabase Dashboard > Project Settings > API > service_role key\n');
    process.exit(1);
  }
}

// Initialize Supabase
let supabase;

function initializeSupabase() {
  try {
    validateConfig();
    
    // Use Service Role Key if available (bypasses RLS), otherwise use anon key
    const apiKey = supabaseConfig.serviceRoleKey || supabaseConfig.anonKey;
    const keyType = supabaseConfig.serviceRoleKey ? 'Service Role' : 'Anon';
    
    supabase = createClient(supabaseConfig.url, apiKey);
    
    if (supabaseConfig.serviceRoleKey) {
      console.log('✅ Supabase initialized with Service Role Key (RLS bypassed)\n');
    } else {
      console.log('✅ Supabase initialized with Anon Key');
      console.log('⚠️  Note: If you get RLS errors, use SUPABASE_SERVICE_ROLE_KEY instead\n');
    }
  } catch (error) {
    console.error('❌ Error initializing Supabase:', error.message);
    process.exit(1);
  }
}

// Read seed data
function loadSeedData() {
  const seedDataPath = path.join(__dirname, '../data/articles-seed.json');
  
  if (!fs.existsSync(seedDataPath)) {
    console.error(`❌ Seed data file not found: ${seedDataPath}`);
    process.exit(1);
  }
  
  try {
    const data = JSON.parse(fs.readFileSync(seedDataPath, 'utf8'));
    console.log(`📚 Loaded seed data:`);
    console.log(`   - ${data.scholars.length} scholars`);
    console.log(`   - ${data.articles.length} articles\n`);
    return data;
  } catch (error) {
    console.error('❌ Error reading seed data:', error.message);
    process.exit(1);
  }
}

/**
 * Calculate reading time estimate
 */
function calculateReadingTime(body) {
  const text = body.replace(/<[^>]*>/g, '').replace(/\n/g, ' ');
  const words = text.trim().split(/\s+/).filter((w) => w.length > 0);
  const wordsPerMinute = 200;
  const minutes = Math.ceil(words.length / wordsPerMinute);
  return Math.max(1, minutes);
}

/**
 * Create or update scholar
 */
async function createScholar(scholarData) {
  try {
    // Check if scholar exists
    const { data: existing } = await supabase
      .from('scholars')
      .select('id')
      .eq('id', scholarData.id)
      .single();

    if (existing) {
      console.log(`   ⚠️  Scholar already exists: ${scholarData.fullName}`);
      return scholarData.id;
    }

    // Insert new scholar
    // Note: In Supabase, we need to use UUID or generate one
    // For now, we'll use the ID from seed data as text (if it's not UUID format)
    const scholarRow = {
      id: scholarData.id, // This should be UUID or we need to generate one
      email: scholarData.email,
      full_name: scholarData.fullName,
      bio: scholarData.bio,
      verified: scholarData.verified !== undefined ? scholarData.verified : true,
      role: 'scholar',
    };

    const { data, error } = await supabase
      .from('scholars')
      .insert(scholarRow)
      .select('id')
      .single();

    if (error) {
      // If error is about duplicate key, scholar already exists
      if (error.code === '23505' || error.message.includes('duplicate')) {
        console.log(`   ⚠️  Scholar already exists: ${scholarData.fullName}`);
        return scholarData.id;
      }
      throw error;
    }

    console.log(`   ✓ Created scholar: ${scholarData.fullName}`);
    return data.id;
  } catch (error) {
    console.error(`   ❌ Error creating scholar ${scholarData.fullName}:`, error.message);
    throw error;
  }
}

/**
 * Create article
 */
async function createArticle(articleData, authorId) {
  try {
    // Check if article already exists (by title and author)
    const { data: existing } = await supabase
      .from('articles')
      .select('id')
      .eq('title', articleData.title)
      .eq('author_id', authorId)
      .single();

    if (existing) {
      console.log(`   ⚠️  Article already exists: "${articleData.title}"`);
      return existing.id;
    }

    const readingTime = calculateReadingTime(articleData.body);
    const now = new Date().toISOString();

    const articleRow = {
      title: articleData.title,
      language: articleData.language,
      author_id: authorId,
      author_name: articleData.authorName,
      category: articleData.category,
      body: articleData.body,
      published: true,
      published_at: now,
      reading_time_estimate: readingTime,
      view_count: 0,
      bookmark_count: 0,
      draft: false,
      notification_sent: false,
    };

    const { data, error } = await supabase
      .from('articles')
      .insert(articleRow)
      .select('id')
      .single();

    if (error) {
      throw error;
    }

    console.log(`   ✓ Created article: "${articleData.title}" (${articleData.language})`);
    return data.id;
  } catch (error) {
    console.error(`   ❌ Error creating article "${articleData.title}":`, error.message);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🌱 Starting articles seed process (Supabase)...\n');

  try {
    // Initialize Supabase
    initializeSupabase();

    // Load seed data
    const seedData = loadSeedData();

    // Step 1: Create scholars
    console.log('📚 Step 1: Creating scholars...');
    const scholarMap = {};
    let scholarSuccess = 0;
    let scholarErrors = 0;

    for (const scholar of seedData.scholars) {
      try {
        // Use the ID from seed data (TEXT format is supported)
        const scholarId = await createScholar(scholar);
        scholarMap[scholar.id] = scholarId;
        scholarSuccess++;
      } catch (error) {
        console.error(`   ❌ Failed to create scholar ${scholar.fullName}:`, error.message);
        scholarErrors++;
      }
    }

    console.log(`\n   ✅ ${scholarSuccess} scholars processed`);
    if (scholarErrors > 0) {
      console.log(`   ⚠️  ${scholarErrors} scholars failed\n`);
    } else {
      console.log('');
    }

    // Step 2: Create articles
    console.log('📝 Step 2: Creating articles...');
    let articleSuccess = 0;
    let articleErrors = 0;

    for (const article of seedData.articles) {
      try {
        const authorId = scholarMap[article.authorId];
        if (!authorId) {
          console.error(`   ❌ Author not found: ${article.authorId}`);
          articleErrors++;
          continue;
        }

        await createArticle(article, authorId);
        articleSuccess++;
      } catch (error) {
        console.error(`   ❌ Failed to create article "${article.title}":`, error.message);
        articleErrors++;
      }
    }

    console.log(`\n   ✅ ${articleSuccess} articles processed`);
    if (articleErrors > 0) {
      console.log(`   ⚠️  ${articleErrors} articles failed`);
    }

    console.log('\n✅ Seed process completed!');
    console.log(`\n📊 Summary:`);
    console.log(`   ✓ Scholars: ${scholarSuccess}/${seedData.scholars.length}`);
    console.log(`   ✓ Articles: ${articleSuccess}/${seedData.articles.length}`);
    
    if (scholarErrors === 0 && articleErrors === 0) {
      console.log('\n🎉 All articles imported successfully!');
      console.log('   You can now see them in the app after refreshing.');
    }
  } catch (error) {
    console.error('\n❌ Seed process failed:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { main };
