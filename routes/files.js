const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Files
 *   description: File upload and management
 */

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Invalid file type'));
        }
    }
});

// All routes require authentication
router.use(authenticateToken);

/**
 * @swagger
 * /api/files/upload:
 *   post:
 *     tags: [Files]
 *     summary: Upload file
 *     description: Upload a file (image, PDF, document)
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               type:
 *                 type: string
 *                 enum: [product_image, receipt, document]
 *               entity_id:
 *                 type: integer
 *                 description: ID of related entity (product, sale, etc.)
 *     responses:
 *       200:
 *         description: File uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 fileUrl:
 *                   type: string
 *                 filename:
 *                   type: string
 */
router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const fileUrl = `/uploads/${req.file.filename}`;
        
        res.json({
            message: 'File uploaded successfully',
            fileUrl,
            filename: req.file.filename,
            originalName: req.file.originalname,
            size: req.file.size
        });
    } catch (error) {
        res.status(500).json({ message: 'File upload failed', error: error.message });
    }
});

/**
 * @swagger
 * /api/files/{filename}:
 *   get:
 *     tags: [Files]
 *     summary: Get file
 *     description: Retrieve an uploaded file
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: File retrieved
 *       404:
 *         description: File not found
 */
router.get('/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '../uploads', filename);
    
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).json({ message: 'File not found' });
    }
});

/**
 * @swagger
 * /api/files/{filename}:
 *   delete:
 *     tags: [Files]
 *     summary: Delete file
 *     description: Delete an uploaded file
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: File deleted
 *       404:
 *         description: File not found
 */
router.delete('/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '../uploads', filename);
    
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        res.json({ message: 'File deleted successfully' });
    } else {
        res.status(404).json({ message: 'File not found' });
    }
});

/**
 * @swagger
 * /api/files/list:
 *   get:
 *     tags: [Files]
 *     summary: List files
 *     description: List all uploaded files
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [product_image, receipt, document]
 *     responses:
 *       200:
 *         description: Files listed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 files:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       filename:
 *                         type: string
 *                       size:
 *                         type: number
 *                       uploadDate:
 *                         type: string
 */
router.get('/list', (req, res) => {
    const uploadsPath = path.join(__dirname, '../uploads');
    
    if (!fs.existsSync(uploadsPath)) {
        return res.json({ files: [] });
    }
    
    const files = fs.readdirSync(uploadsPath).map(filename => {
        const filePath = path.join(uploadsPath, filename);
        const stats = fs.statSync(filePath);
        return {
            filename,
            size: stats.size,
            uploadDate: stats.mtime
        };
    });
    
    res.json({ files });
});

module.exports = router;
