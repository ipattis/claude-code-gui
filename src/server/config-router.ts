import express from 'express';

export const configRouter = express.Router();

let mockSettings: any = {};

configRouter.post('/get-settings', (req, res) => {
    // In a real app we would read from ~/.claude/settings.json or the DB
    res.json({ settings: mockSettings });
});

configRouter.post('/save-settings', (req, res) => {
    const { data } = req.body;
    mockSettings = { ...mockSettings, ...data };
    res.json({ success: true });
});

configRouter.post('/get-mcp-servers', (req, res) => {
    res.json({ servers: {} });
});

// Implement more config, skills, agents endpoints as needed.
// These mock the behaviour that would normally write config locally on the user's machine.
// In App Runner, these could optionally map to an S3 bucket or DynamoDB,
// or just be kept in-memory for the duration of the sandbox.
