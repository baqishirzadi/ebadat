/**
 * Seed Articles Script
 * Imports articles and scholars from seed data to Firestore
 * 
 * Usage: node scripts/seedArticles.js
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin (you'll need to set up service account)
// For development, you can use environment variables or a service account key
if (!admin.apps.length) {
  try {
    // Try to initialize with service account if available
    const serviceAccountPath = path.join(__dirname, '../serviceAccountKey.json');
    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = require(serviceAccountPath);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else {
      console.warn('⚠️  serviceAccountKey.json not found. Using default credentials.');
      console.warn('   Make sure you have set GOOGLE_APPLICATION_CREDENTIALS or run this in Firebase environment.');
      admin.initializeApp();
    }
  } catch (error) {
    console.error('❌ Error initializing Firebase Admin:', error.message);
    console.error('   Please set up Firebase Admin SDK credentials.');
    process.exit(1);
  }
}

const db = admin.firestore();

// Read seed data
const seedDataPath = path.join(__dirname, '../data/articles-seed.json');
const seedData = JSON.parse(fs.readFileSync(seedDataPath, 'utf8'));

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
    const scholarRef = db.collection('scholars').doc(scholarData.id);
    const scholarDoc = await scholarRef.get();

    if (scholarDoc.exists) {
      console.log(`✓ Scholar already exists: ${scholarData.fullName}`);
      return scholarData.id;
    }

    await scholarRef.set({
      email: scholarData.email,
      fullName: scholarData.fullName,
      bio: scholarData.bio,
      verified: scholarData.verified || true,
      role: 'scholar',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`✓ Created scholar: ${scholarData.fullName}`);
    return scholarData.id;
  } catch (error) {
    console.error(`❌ Error creating scholar ${scholarData.fullName}:`, error.message);
    throw error;
  }
}

/**
 * Create article
 */
async function createArticle(articleData, authorId) {
  try {
    const articlesRef = db.collection('articles');
    const readingTime = calculateReadingTime(articleData.body);
    const now = admin.firestore.Timestamp.now();

    // Check if article already exists (by title and author)
    const existingQuery = await articlesRef
      .where('title', '==', articleData.title)
      .where('authorId', '==', authorId)
      .limit(1)
      .get();

    if (!existingQuery.empty) {
      console.log(`  ⚠️  Article already exists: "${articleData.title}"`);
      return existingQuery.docs[0].id;
    }

    const articleDoc = {
      title: articleData.title,
      language: articleData.language,
      authorId: authorId,
      authorName: articleData.authorName,
      category: articleData.category,
      body: articleData.body,
      published: true,
      publishedAt: now,
      createdAt: now,
      updatedAt: now,
      readingTimeEstimate: readingTime,
      viewCount: 0,
      bookmarkCount: 0,
      notificationSent: false,
    };

    const docRef = await articlesRef.add(articleDoc);
    console.log(`  ✓ Created article: "${articleData.title}" (${articleData.language})`);
    return docRef.id;
  } catch (error) {
    console.error(`  ❌ Error creating article "${articleData.title}":`, error.message);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🌱 Starting articles seed process...\n');

  try {
    // Step 1: Create scholars
    console.log('📚 Creating scholars...');
    const scholarMap = {};
    for (const scholar of seedData.scholars) {
      const scholarId = await createScholar(scholar);
      scholarMap[scholar.id] = scholarId;
    }
    console.log('');

    // Step 2: Create articles
    console.log('📝 Creating articles...');
    let successCount = 0;
    let errorCount = 0;

    for (const article of seedData.articles) {
      try {
        const authorId = scholarMap[article.authorId];
        if (!authorId) {
          console.error(`  ❌ Author not found: ${article.authorId}`);
          errorCount++;
          continue;
        }

        await createArticle(article, authorId);
        successCount++;
      } catch (error) {
        console.error(`  ❌ Failed to create article:`, error.message);
        errorCount++;
      }
    }

    console.log('');
    console.log('✅ Seed process completed!');
    console.log(`   ✓ ${successCount} articles created successfully`);
    if (errorCount > 0) {
      console.log(`   ⚠️  ${errorCount} articles failed`);
    }
  } catch (error) {
    console.error('❌ Seed process failed:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main()
    .then(() => {
      console.log('\n🎉 All done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { main };
