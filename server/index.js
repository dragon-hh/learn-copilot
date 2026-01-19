import express from 'express';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Storage directory
const STORAGE_DIR = path.join(__dirname, 'storage');

// Ensure storage directory exists
if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

// Helper functions
const getUserStoragePath = (userId) => path.join(STORAGE_DIR, `${userId}`);
const getFilePath = (userId, fileName) => path.join(getUserStoragePath(userId), `${fileName}.json`);

const ensureUserDir = (userId) => {
    const userDir = getUserStoragePath(userId);
    if (!fs.existsSync(userDir)) {
        fs.mkdirSync(userDir, { recursive: true });
    }
};

const readJsonFile = (filePath) => {
    try {
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf-8');
            return JSON.parse(data);
        }
        return null;
    } catch (error) {
        console.error(`Error reading ${filePath}:`, error);
        return null;
    }
};

const writeJsonFile = (filePath, data) => {
    try {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
        return true;
    } catch (error) {
        console.error(`Error writing ${filePath}:`, error);
        return false;
    }
};

// --- AUTH ENDPOINTS ---

/**
 * GET /api/users
 * Get all users
 */
app.get('/api/users', (req, res) => {
    try {
        const usersFile = path.join(STORAGE_DIR, 'users.json');
        const users = readJsonFile(usersFile) || [];
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/auth/register
 * Register a new user
 */
app.post('/api/auth/register', (req, res) => {
    try {
        const { username, password, avatar } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }

        const usersFile = path.join(STORAGE_DIR, 'users.json');
        const users = readJsonFile(usersFile) || [];

        if (users.find(u => u.username === username)) {
            return res.status(409).json({ error: 'User already exists' });
        }

        const newUser = {
            id: 'user-' + Date.now(),
            username,
            // In production, use bcrypt to hash password
            password: password,
            avatar: avatar || null,
            createdAt: new Date().toISOString()
        };

        users.push(newUser);
        writeJsonFile(usersFile, users);

        // Create user storage directory
        ensureUserDir(newUser.id);

        // Initialize empty user data
        writeJsonFile(getFilePath(newUser.id, 'knowledge_bases'), []);
        writeJsonFile(getFilePath(newUser.id, 'assessment_results'), []);
        writeJsonFile(getFilePath(newUser.id, 'assessment_history'), []);
        writeJsonFile(getFilePath(newUser.id, 'ai_insights'), null);

        res.status(201).json({
            id: newUser.id,
            username: newUser.username,
            avatar: newUser.avatar
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/auth/login
 * Login user
 */
app.post('/api/auth/login', (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }

        const usersFile = path.join(STORAGE_DIR, 'users.json');
        const users = readJsonFile(usersFile) || [];
        const user = users.find(u => u.username === username && u.password === password);

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        res.json({
            id: user.id,
            username: user.username,
            avatar: user.avatar
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- KNOWLEDGE BASE ENDPOINTS ---

/**
 * GET /api/users/:userId/knowledge-bases
 * Get all knowledge bases for a user
 */
app.get('/api/users/:userId/knowledge-bases', (req, res) => {
    try {
        const { userId } = req.params;
        const data = readJsonFile(getFilePath(userId, 'knowledge_bases')) || [];
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/users/:userId/knowledge-bases
 * Save/update knowledge bases for a user
 */
app.post('/api/users/:userId/knowledge-bases', (req, res) => {
    try {
        const { userId } = req.params;
        const data = req.body; // Array of KnowledgeBase objects

        ensureUserDir(userId);
        const success = writeJsonFile(getFilePath(userId, 'knowledge_bases'), data);

        if (success) {
            res.json({ message: 'Knowledge bases saved', data });
        } else {
            res.status(500).json({ error: 'Failed to save knowledge bases' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- ASSESSMENT RESULTS ENDPOINTS ---

/**
 * GET /api/users/:userId/assessment-results
 * Get assessment results for a user
 */
app.get('/api/users/:userId/assessment-results', (req, res) => {
    try {
        const { userId } = req.params;
        const data = readJsonFile(getFilePath(userId, 'assessment_results')) || [];
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/users/:userId/assessment-results
 * Save assessment results for a user
 */
app.post('/api/users/:userId/assessment-results', (req, res) => {
    try {
        const { userId } = req.params;
        const data = req.body; // Array of AssessmentResult objects

        ensureUserDir(userId);
        const success = writeJsonFile(getFilePath(userId, 'assessment_results'), data);

        if (success) {
            res.json({ message: 'Assessment results saved', data });
        } else {
            res.status(500).json({ error: 'Failed to save assessment results' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- ASSESSMENT HISTORY ENDPOINTS ---

/**
 * GET /api/users/:userId/assessment-history
 * Get assessment history for a user
 */
app.get('/api/users/:userId/assessment-history', (req, res) => {
    try {
        const { userId } = req.params;
        const data = readJsonFile(getFilePath(userId, 'assessment_history')) || [];
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/users/:userId/assessment-history
 * Save assessment history for a user
 */
app.post('/api/users/:userId/assessment-history', (req, res) => {
    try {
        const { userId } = req.params;
        const data = req.body; // Array of AssessmentHistoryLog objects

        ensureUserDir(userId);
        const success = writeJsonFile(getFilePath(userId, 'assessment_history'), data);

        if (success) {
            res.json({ message: 'Assessment history saved', data });
        } else {
            res.status(500).json({ error: 'Failed to save assessment history' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- AI INSIGHTS ENDPOINTS ---

/**
 * GET /api/users/:userId/ai-insights
 * Get AI insights for a user
 */
app.get('/api/users/:userId/ai-insights', (req, res) => {
    try {
        const { userId } = req.params;
        const data = readJsonFile(getFilePath(userId, 'ai_insights'));
        res.json(data || null);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/users/:userId/ai-insights
 * Save AI insights for a user
 */
app.post('/api/users/:userId/ai-insights', (req, res) => {
    try {
        const { userId } = req.params;
        const data = req.body; // AiInsightsData object

        ensureUserDir(userId);
        const success = writeJsonFile(getFilePath(userId, 'ai_insights'), data);

        if (success) {
            res.json({ message: 'AI insights saved', data });
        } else {
            res.status(500).json({ error: 'Failed to save AI insights' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- MODEL CONFIG ENDPOINTS ---

/**
 * GET /api/model-config
 * Get global model configuration
 */
app.get('/api/model-config', (req, res) => {
    try {
        const configFile = path.join(STORAGE_DIR, 'model_config.json');
        const config = readJsonFile(configFile) || {
            modelName: 'gemini-3-flash-preview',
            baseUrl: '',
            apiKey: ''
        };
        res.json(config);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/model-config
 * Save global model configuration
 */
app.post('/api/model-config', (req, res) => {
    try {
        const config = req.body;
        const configFile = path.join(STORAGE_DIR, 'model_config.json');
        const success = writeJsonFile(configFile, config);

        if (success) {
            res.json({ message: 'Model config saved', data: config });
        } else {
            res.status(500).json({ error: 'Failed to save model config' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- PROMPTS CONFIG ENDPOINTS ---

/**
 * GET /api/prompts-config
 * Get global prompts configuration
 */
app.get('/api/prompts-config', (req, res) => {
    try {
        const promptsFile = path.join(STORAGE_DIR, 'prompts_config.json');
        const prompts = readJsonFile(promptsFile) || {};
        res.json(prompts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/prompts-config
 * Save global prompts configuration
 */
app.post('/api/prompts-config', (req, res) => {
    try {
        const prompts = req.body;
        const promptsFile = path.join(STORAGE_DIR, 'prompts_config.json');
        const success = writeJsonFile(promptsFile, prompts);

        if (success) {
            res.json({ message: 'Prompts config saved', data: prompts });
        } else {
            res.status(500).json({ error: 'Failed to save prompts config' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- BACKUP & RESTORE ENDPOINTS ---

/**
 * POST /api/backup
 * Create a full backup
 */
app.post('/api/backup', (req, res) => {
    try {
        const backup = {};
        
        // Collect all data from storage directory
        const readDirRecursive = (dir) => {
            const files = fs.readdirSync(dir);
            files.forEach(file => {
                const filePath = path.join(dir, file);
                const stat = fs.statSync(filePath);
                
                if (stat.isDirectory()) {
                    readDirRecursive(filePath);
                } else if (file.endsWith('.json')) {
                    const relativePath = path.relative(STORAGE_DIR, filePath);
                    backup[relativePath] = readJsonFile(filePath);
                }
            });
        };

        readDirRecursive(STORAGE_DIR);
        res.json({ message: 'Backup created', data: backup });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/restore
 * Restore from a backup
 */
app.post('/api/restore', (req, res) => {
    try {
        const backup = req.body;

        Object.keys(backup).forEach(relativePath => {
            const filePath = path.join(STORAGE_DIR, relativePath);
            writeJsonFile(filePath, backup[relativePath]);
        });

        res.json({ message: 'Backup restored successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- HEALTH CHECK ---

app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`📁 Storage directory: ${STORAGE_DIR}`);
});

export default app;
