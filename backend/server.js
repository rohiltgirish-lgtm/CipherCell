// In /backend-api/server.js

const express = require('express');
const multer = require('multer');
const axios = require('axios'); // For making HTTP requests to IPFS
const FormData = require('form-data'); // For structuring file uploads
const fs = require('fs');
const cors = require('cors');
// const { ethers } = require('ethers'); // Import ethers later

const app = express();
app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(express.json()); // Middleware to parse JSON bodies

// --- Local IPFS Node API URL ---
const ipfsApiUrl = 'http://127.0.0.1:5001'; // Default Kubo API address

// --- Multer Setup (for handling file uploads) ---
// Store files temporarily in an 'uploads/' directory
// Create this folder if it doesn't exist
if (!fs.existsSync('./uploads')){
    fs.mkdirSync('./uploads');
}
const upload = multer({ dest: 'uploads/' });

// --- Blockchain Setup (Placeholder - Fill in later!) ---
// const provider = ...
// const contractAddress = ...
// const contractABI = ...
// const adminWallet = ...
// const contract = ...

// --- API Endpoint for Uploading Proof ---
app.post('/upload-proof', upload.single('proofFile'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No proof file uploaded.' });
    }

    const { description, amount, contractorAddress } = req.body; // Get other data
    const filePath = req.file.path;
    const fileName = req.file.originalname;

    console.log(`Received file: ${fileName} for milestone: ${description || 'N/A'}`);

    try {
        // 1. Upload file to LOCAL IPFS node
        const fileStream = fs.createReadStream(filePath);
        const formData = new FormData();
        // The Kubo API expects the file field to be named 'file'
        formData.append('file', fileStream, { filename: fileName }); 

        console.log("Uploading to local IPFS node via API...");
        const response = await axios.post(`${ipfsApiUrl}/api/v0/add`, formData, {
            headers: {
                ...formData.getHeaders(), 
            },
             params: {
                'stream-channels': true, // Kubo API option
                'progress': false // Disable progress reports for simplicity
            }
        });

        // The response.data object contains { Name, Hash (CID), Size }
        const ipfsHash = response.data.Hash; 
        console.log("Successfully added to local IPFS:", ipfsHash);

        // 2. *** TODO LATER: Call the smart contract ***
        // try { ... call contract.recordMilestone(description, amount, ipfsHash, contractorAddress) ... } catch ...

        // 3. Clean up the temporary file from the server
        fs.unlinkSync(filePath); // Delete the temp file after successful upload

        // 4. Send success response back to the frontend
        res.status(200).json({
            message: 'Proof uploaded to local IPFS successfully!',
            ipfsHash: ipfsHash,
            // Use a public gateway URL for easy viewing in the demo
            ipfsUrl: `https://ipfs.io/ipfs/${ipfsHash}` 
            // transactionHash: tx.hash // Include blockchain tx hash later
        });

    } catch (error) {
        console.error('Error processing upload:', error.response ? error.response.data : error.message);
        // Clean up the temp file even if there's an error
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        res.status(500).json({ error: 'Failed to upload file to local IPFS node.' });
    }
});

// Basic endpoint to check if the server is running
app.get('/', (req, res) => {
    res.send('Grant Tracker Backend (Local IPFS) is running!');
});

// --- Start the Server ---
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Backend server listening on port ${PORT}`);
});