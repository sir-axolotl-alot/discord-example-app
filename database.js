import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BUGS_FILE = path.join(__dirname, 'data', 'bugs.csv');
const FEATURES_FILE = path.join(__dirname, 'data', 'features.csv');

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

// Initialize CSV files if they don't exist
function initializeFile(filePath, headers) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, headers.join(',') + '\n');
  }
}

// Initialize both CSV files with upvotes column
initializeFile(BUGS_FILE, ['id', 'user_id', 'username', 'description', 'steps', 'created_at', 'status', 'upvotes']);
initializeFile(FEATURES_FILE, ['id', 'user_id', 'username', 'feature', 'reason', 'created_at', 'status', 'upvotes']);

// Helper function to read CSV file
function readCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  return parse(content, {
    columns: true,
    skip_empty_lines: true
  });
}

// Helper function to write CSV file
function writeCSV(filePath, data) {
  const content = stringify(data, { header: true });
  fs.writeFileSync(filePath, content);
}

// Get next ID from CSV file
function getNextId(filePath) {
  const data = readCSV(filePath);
  if (data.length === 0) return 1;
  return Math.max(...data.map(row => parseInt(row.id))) + 1;
}

// Helper function to check for similar entries
function findSimilarEntries(entries, searchText, threshold = 0.7) {
  const newWords = searchText.toLowerCase().split(/\s+/);
  return entries.filter(entry => {
    const entryText = entry.description || entry.feature;
    const entryWords = entryText.toLowerCase().split(/\s+/);
    const commonWords = newWords.filter(word => entryWords.includes(word));
    return commonWords.length / Math.max(newWords.length, entryWords.length) >= threshold;
  });
}

// Helper function to upvote an entry
function upvoteEntry(filePath, entryId) {
  const entries = readCSV(filePath);
  const entry = entries.find(e => parseInt(e.id) === parseInt(entryId));
  if (entry) {
    entry.upvotes = (parseInt(entry.upvotes) || 0) + 1;
    writeCSV(filePath, entries);
    return true;
  }
  return false;
}

// Save bug report
export async function saveBugReport(userId, username, description, steps) {
  const bugs = readCSV(BUGS_FILE);
  
  // Check for similar bugs
  const similarBugs = findSimilarEntries(bugs, description);
  
  if (similarBugs.length > 0) {
    return {
      isDuplicate: true,
      similarEntries: similarBugs
    };
  }

  const newBug = {
    id: getNextId(BUGS_FILE),
    user_id: userId,
    username: username,
    description: description.replace(/,/g, ';'),
    steps: steps.replace(/,/g, ';'),
    created_at: new Date().toISOString(),
    status: 'open',
    upvotes: '0'
  };
  
  bugs.push(newBug);
  writeCSV(BUGS_FILE, bugs);
  return {
    isDuplicate: false,
    id: newBug.id
  };
}

// Save feature request
export async function saveFeatureRequest(userId, username, feature, reason) {
  const features = readCSV(FEATURES_FILE);
  
  // Check for similar features
  const similarFeatures = findSimilarEntries(features, feature);
  
  if (similarFeatures.length > 0) {
    return {
      isDuplicate: true,
      similarEntries: similarFeatures
    };
  }

  const newFeature = {
    id: getNextId(FEATURES_FILE),
    user_id: userId,
    username: username,
    feature: feature.replace(/,/g, ';'),
    reason: reason.replace(/,/g, ';'),
    created_at: new Date().toISOString(),
    status: 'pending',
    upvotes: '0'
  };
  
  features.push(newFeature);
  writeCSV(FEATURES_FILE, features);
  return {
    isDuplicate: false,
    id: newFeature.id
  };
}

// Get all bug reports
export async function getBugReports() {
  return readCSV(BUGS_FILE);
}

// Get all feature requests
export async function getFeatureRequests() {
  return readCSV(FEATURES_FILE);
}

// Upvote a bug
export async function upvoteBug(bugId) {
  const bugs = readCSV(BUGS_FILE);
  const bugIndex = bugs.findIndex(bug => bug.id === bugId);
  
  if (bugIndex === -1) return false;
  
  // Convert upvotes to number, increment, and convert back to string
  bugs[bugIndex].upvotes = (parseInt(bugs[bugIndex].upvotes || '0') + 1).toString();
  writeCSV(BUGS_FILE, bugs);
  return true;
}

// Upvote a feature
export async function upvoteFeature(featureId) {
  const features = readCSV(FEATURES_FILE);
  const featureIndex = features.findIndex(feature => feature.id === featureId);
  
  if (featureIndex === -1) return false;
  
  // Convert upvotes to number, increment, and convert back to string
  features[featureIndex].upvotes = (parseInt(features[featureIndex].upvotes || '0') + 1).toString();
  writeCSV(FEATURES_FILE, features);
  return true;
} 