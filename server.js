const express = require('express');
const EOXSTicketDragger = require('./eoxs_ticket_dragger');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/', (req, res) => {
    res.json({
        status: 'EOXS Automation API is running',
        version: '1.0.0',
        endpoints: {
            'POST /create-ticket': 'Create a new EOXS ticket with log note',
            'GET /health': 'Health check endpoint'
        },
        usage: {
            method: 'POST',
            url: '/create-ticket',
            body: {
                subject: 'Ticket title/subject',
                customer: 'Customer name (optional, defaults to Discount Pipe & Steel)',
                body: 'Email body content for log note',
                assignedTo: 'Person to assign to (optional, defaults to Sahaj Katiyar)'
            }
        }
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Debug endpoint to check environment variables
app.get('/debug-env', (req, res) => {
    res.json({
        hasEoxsEmail: !!process.env.EOXS_EMAIL,
        hasEoxsPassword: !!process.env.EOXS_PASSWORD,
        nodeEnv: process.env.NODE_ENV,
        headless: process.env.HEADLESS,
        emailLength: process.env.EOXS_EMAIL ? process.env.EOXS_EMAIL.length : 0,
        passwordLength: process.env.EOXS_PASSWORD ? process.env.EOXS_PASSWORD.length : 0
    });
});

// Main endpoint to create EOXS ticket
app.post('/create-ticket', async (req, res) => {
    try {
        console.log('🎯 Received ticket creation request:', req.body);
        
        const {
            subject = 'Support Request',
            customer = 'Discount Pipe & Steel',
            body = 'Email received from customer',
            assignedTo = 'Sahaj Katiyar',
            description = 'this is a task'
        } = req.body;

        // Temporarily hardcode credentials for testing
        const EOXS_EMAIL = process.env.EOXS_EMAIL || 'sahajkatiyareoxs@gmail.com';
        const EOXS_PASSWORD = process.env.EOXS_PASSWORD || 'Eoxs12345!';

        // Validate credentials (now using fallback values)
        if (!EOXS_EMAIL || !EOXS_PASSWORD) {
            return res.status(400).json({
                success: false,
                error: 'EOXS credentials not configured. Please set EOXS_EMAIL and EOXS_PASSWORD environment variables.'
            });
        }

        // Set environment variables for the automation script
        process.env.EOXS_EMAIL = EOXS_EMAIL;
        process.env.EOXS_PASSWORD = EOXS_PASSWORD;
        process.env.EMAIL_SUBJECT = subject;
        process.env.EMAIL_CUSTOMER = customer;
        process.env.EMAIL_BODY = body;

        console.log('🚀 Starting EOXS automation with:', {
            subject,
            customer,
            assignedTo,
            bodyLength: body.length
        });

        // Create and run dragger
        const dragger = new EOXSTicketDragger();
        const result = await dragger.run();

        console.log('📊 Automation result:', result);

        if (result.success) {
            res.json({
                success: true,
                message: 'Ticket drag completed',
                data: {
                    subject,
                    customer,
                    assignedTo,
                    dragCompleted: result.dragCompleted,
                    timestamp: new Date().toISOString()
                }
            });
        } else {
            res.status(500).json({
                success: false,
                error: result.error || 'Failed to drag ticket',
                details: result
            });
        }

    } catch (error) {
        console.error('❌ API Error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Batch ticket creation endpoint
app.post('/create-tickets-batch', async (req, res) => {
    try {
        const { tickets = [] } = req.body;
        
        if (!Array.isArray(tickets) || tickets.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Please provide an array of tickets to create'
            });
        }

        if (tickets.length > 5) {
            return res.status(400).json({
                success: false,
                error: 'Maximum 5 tickets can be created in a batch'
            });
        }

        console.log(`🎯 Received batch request for ${tickets.length} tickets`);

        const results = [];
        
        for (let i = 0; i < tickets.length; i++) {
            const ticket = tickets[i];
            console.log(`🔄 Processing ticket ${i + 1}/${tickets.length}:`, ticket.subject);
            
            try {
                // Set environment variables for this ticket
                process.env.EMAIL_SUBJECT = ticket.subject || 'Support Request';
                process.env.EMAIL_CUSTOMER = ticket.customer || 'Discount Pipe & Steel';
                process.env.EMAIL_BODY = ticket.body || 'Email received from customer';

                const dragger = new EOXSTicketDragger();
                const result = await dragger.run();
                
                results.push({
                    index: i + 1,
                    subject: ticket.subject,
                    success: result.success,
                    dragCompleted: result.dragCompleted,
                    error: result.error
                });

                // Add delay between tickets to avoid overwhelming the system
                if (i < tickets.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }

            } catch (error) {
                results.push({
                    index: i + 1,
                    subject: ticket.subject,
                    success: false,
                    error: error.message
                });
            }
        }

        const successCount = results.filter(r => r.success).length;
        
        res.json({
            success: successCount > 0,
            message: `Processed ${tickets.length} tickets. ${successCount} successful, ${tickets.length - successCount} failed.`,
            results,
            summary: {
                total: tickets.length,
                successful: successCount,
                failed: tickets.length - successCount
            }
        });

    } catch (error) {
        console.error('❌ Batch API Error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('❌ Unhandled error:', error);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        availableEndpoints: [
            'GET /',
            'GET /health',
            'POST /create-ticket',
            'POST /create-tickets-batch'
        ]
    });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 EOXS Automation API server running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/health`);
    console.log(`🎫 Create ticket: POST http://localhost:${PORT}/create-ticket`);
    console.log(`📧 Environment check:`, {
        hasEmail: !!process.env.EOXS_EMAIL,
        hasPassword: !!process.env.EOXS_PASSWORD,
        nodeEnv: process.env.NODE_ENV || 'development'
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 SIGINT received, shutting down gracefully...');
    process.exit(0);
});

module.exports = app;
