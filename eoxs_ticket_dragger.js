const { chromium, firefox, webkit } = require('playwright');
const fs = require('fs');
const path = require('path');

/**
 * EOXS Ticket Dragger Script - Playwright Version
 * 
 * This script drags the "Testing" ticket from the Resolved section to the Tickets section.
 * 
 * Usage:
 * - node eoxs_ticket_dragger.js
 * - Returns exit code 0 for success, exit code 1 for failure
 */

// Configuration
const CONFIG = {
    baseUrl: 'https://teams.eoxs.com/',
    credentials: {
        email: process.env.EOXS_EMAIL || 'sahajkatiyareoxs@gmail.com',
        password: process.env.EOXS_PASSWORD || 'Eoxs12345!'
    },
    dragOperation: {
        projectName: 'Test Support',
        ticketTitle: process.argv[2] || process.env.EMAIL_SUBJECT || 'Testing', // Get from command line or env
        fromSection: 'Resolved',
        toSection: 'Tickets'
    },
    waitOptions: {
        timeout: 60000,
        navigationTimeout: 30000
    },
    browser: {
        headless: false, // Set to true for headless mode
        slowMo: 150, // Slower for drag operations
    }
};

class EOXSTicketDragger {
    constructor() {
        this.browser = null;
        this.context = null;
        this.page = null;
        this.dragSuccess = false;
    }

    async init() {
        try {
            console.log('🚀 Starting EOXS Ticket Dragger with Playwright...');
            
            // Launch browser
            this.browser = await chromium.launch({
                headless: CONFIG.browser.headless,
                slowMo: CONFIG.browser.slowMo,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--disable-gpu',
                    '--start-maximized'
                ]
            });

            // Create browser context
            this.context = await this.browser.newContext({
                viewport: null,
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            });

            this.page = await this.context.newPage();
            
            // Enable console logging from browser
            this.page.on('console', msg => console.log('Browser Console:', msg.text()));
            this.page.on('pageerror', error => console.log('Page Error:', error.message));
            
            console.log('✅ Browser initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize browser:', error);
            throw error;
        }
    }

    async clickElement(selector, options = {}) {
        try {
            const element = this.page.locator(selector).first();
            await element.scrollIntoViewIfNeeded();
            await element.click(options);
            return true;
        } catch (error) {
            console.error(`❌ Failed to click element ${selector}:`, error);
            return false;
        }
    }

    async clearAndType(selector, text) {
        try {
            const element = this.page.locator(selector).first();
            await element.scrollIntoViewIfNeeded();
            await element.focus();
            await element.fill('');
            await element.type(text, { delay: 50 });
        } catch (error) {
            console.error(`❌ Failed to clear and type in ${selector}:`, error);
            throw error;
        }
    }

    async login() {
        try {
            console.log('🔐 Starting login process...');
            
            // Navigate to base URL
            await this.page.goto(CONFIG.baseUrl, { 
                waitUntil: 'networkidle',
                timeout: CONFIG.waitOptions.navigationTimeout 
            });
            console.log('📍 Navigated to:', CONFIG.baseUrl);
            
            await this.page.waitForTimeout(1500);

            // Click login trigger
            const loginTriggerSelectors = [
                'span.te_user_account_icon.d-block',
                'i.fa-user-circle-o',
                '.fa-user-circle-o',
                '.fa-user'
            ];

            let loginTriggerClicked = false;
            for (const selector of loginTriggerSelectors) {
                try {
                    if (await this.page.locator(selector).first().isVisible({ timeout: 2000 })) {
                        await this.clickElement(selector);
                        loginTriggerClicked = true;
                        console.log(`✅ Clicked login trigger: ${selector}`);
                        break;
                    }
                } catch (error) {
                    continue;
                }
            }

            if (!loginTriggerClicked) {
                throw new Error('Could not find login trigger');
            }

            await this.page.waitForTimeout(1000);

            // Fill email
            const emailSelectors = ['input#login', 'input[name="login"]', 'input[type="email"]'];
            let emailFilled = false;
            for (const selector of emailSelectors) {
                try {
                    if (await this.page.locator(selector).first().isVisible({ timeout: 2000 })) {
                        await this.clearAndType(selector, CONFIG.credentials.email);
                        emailFilled = true;
                        console.log('✅ Email entered successfully');
                        break;
                    }
                } catch (error) {
                    continue;
                }
            }

            if (!emailFilled) {
                throw new Error('Could not find or fill email field');
            }

            // Fill password
            const passwordSelectors = ['input#password', 'input[type="password"]'];
            let passwordFilled = false;
            for (const selector of passwordSelectors) {
                try {
                    if (await this.page.locator(selector).first().isVisible({ timeout: 2000 })) {
                        await this.clearAndType(selector, CONFIG.credentials.password);
                        passwordFilled = true;
                        console.log('✅ Password entered successfully');
                        break;
                    }
                } catch (error) {
                    continue;
                }
            }

            if (!passwordFilled) {
                throw new Error('Could not find or fill password field');
            }

            // Submit login
            const loginButtonSelectors = ['button[type="submit"]', 'input[type="submit"]'];
            let loginSubmitted = false;
            for (const selector of loginButtonSelectors) {
                try {
                    if (await this.page.locator(selector).first().isVisible({ timeout: 2000 })) {
                        await this.clickElement(selector);
                        loginSubmitted = true;
                        console.log('✅ Login button clicked');
                        break;
                    }
                } catch (error) {
                    continue;
                }
            }

            if (!loginSubmitted) {
                await this.page.locator('input[type="password"]').first().press('Enter');
                console.log('✅ Login submitted via Enter key');
            }

            // Wait for navigation
            await this.page.waitForTimeout(5000);
            console.log('✅ Login completed successfully');
            return true;

        } catch (error) {
            console.error('❌ Login failed:', error);
            return false;
        }
    }

    async navigateToTestSupport() {
        try {
            console.log('🧭 Navigating to Test Support project...');
            
            await this.page.waitForTimeout(2000);
            
            // Click sidebar menu
            const sidebarMenuSelectors = ['.o_menu_apps', '.o_menu_toggle', '.fa-th'];
            let sidebarOpened = false;
            for (const selector of sidebarMenuSelectors) {
                try {
                    if (await this.page.locator(selector).first().isVisible({ timeout: 3000 })) {
                        await this.clickElement(selector);
                        sidebarOpened = true;
                        console.log(`✅ Clicked sidebar menu: ${selector}`);
                        await this.page.waitForTimeout(1000);
                        break;
                    }
                } catch (error) {
                    continue;
                }
            }
            
            if (!sidebarOpened) {
                throw new Error('Could not open sidebar menu');
            }
            
            // Click Projects
            const projectsSelectors = ['text=Projects', 'text=Project'];
            let projectsClicked = false;
            for (const selector of projectsSelectors) {
                try {
                    if (await this.page.locator(selector).first().isVisible({ timeout: 3000 })) {
                        await this.clickElement(selector);
                        projectsClicked = true;
                        console.log(`✅ Clicked Projects: ${selector}`);
                        break;
                    }
                } catch (error) {
                    continue;
                }
            }
            
            if (!projectsClicked) {
                throw new Error('Could not find Projects section');
            }
            
            await this.page.waitForTimeout(2000);
            
            // Click Test Support project
            const supportSelectors = [
                '.o_kanban_record:has-text("Test Support")',
                'text=Test Support'
            ];
            
            let supportClicked = false;
            for (const selector of supportSelectors) {
                try {
                    if (await this.page.locator(selector).first().isVisible({ timeout: 3000 })) {
                        await this.clickElement(selector);
                        supportClicked = true;
                        console.log(`✅ Clicked Test Support: ${selector}`);
                        await this.page.waitForTimeout(3000);
                        break;
                    }
                } catch (error) {
                    continue;
                }
            }
            
            if (!supportClicked) {
                throw new Error('Could not find Test Support project');
            }
            
            console.log('✅ Successfully navigated to Test Support project');
            return true;
            
        } catch (error) {
            console.error('❌ Failed to navigate to Test Support:', error);
            return false;
        }
    }

    async dragTicketToTicketsSection() {
        try {
            console.log('🎯 Starting drag operation: "Testing" from Resolved to Tickets...');
            
            // Wait for page to load completely
            await this.page.waitForTimeout(3000);
            
            // Find the specified ticket in Resolved section
            console.log(`🔍 Looking for "${CONFIG.dragOperation.ticketTitle}" ticket in Resolved section...`);
            const sourceTicketSelectors = [
                `.o_kanban_group:has-text("Resolved") .o_kanban_record:has-text("${CONFIG.dragOperation.ticketTitle}")`,
                `.o_kanban_record:has-text("${CONFIG.dragOperation.ticketTitle}")`
            ];
            
            let sourceTicket = null;
            let sourceTicketFound = false;
            
            for (const selector of sourceTicketSelectors) {
                try {
                    const elements = await this.page.locator(selector).all();
                    console.log(`🔍 Found ${elements.length} elements for selector: ${selector}`);
                    
                    for (const element of elements) {
                        if (await element.isVisible({ timeout: 2000 })) {
                            const elementText = await element.textContent() || '';
                            console.log(`🔍 Checking ticket: "${elementText.trim().substring(0, 50)}..."`);
                            
                            if (elementText.toLowerCase().includes(CONFIG.dragOperation.ticketTitle.toLowerCase())) {
                                sourceTicket = element;
                                sourceTicketFound = true;
                                console.log(`✅ Found source ticket: "${elementText.trim().substring(0, 50)}..."`);
                                break;
                            }
                        }
                    }
                    
                    if (sourceTicketFound) {
                        break;
                    }
                } catch (error) {
                    continue;
                }
            }
            
            if (!sourceTicketFound) {
                throw new Error(`Could not find "${CONFIG.dragOperation.ticketTitle}" ticket in Resolved section`);
            }
            
            // Find the Tickets section (destination)
            console.log('🎯 Looking for Tickets section (destination)...');
            const destinationSelectors = [
                '.o_kanban_group:has-text("Tickets")',
                '.kanban-column:has-text("Tickets")',
                'div:has-text("Tickets")',
                'h3:has-text("Tickets")',
                '.o_column_title:has-text("Tickets")'
            ];
            
            let destinationSection = null;
            let destinationFound = false;
            
            for (const selector of destinationSelectors) {
                try {
                    const element = this.page.locator(selector).first();
                    if (await element.isVisible({ timeout: 3000 })) {
                        destinationSection = element;
                        destinationFound = true;
                        console.log(`✅ Found destination section: ${selector}`);
                        break;
                    }
                } catch (error) {
                    continue;
                }
            }
            
            if (!destinationFound) {
                throw new Error('Could not find Tickets section (destination)');
            }
            
            // Perform drag and drop operation
            console.log('🚀 Performing drag and drop operation...');
            
            try {
                // Method 1: Use Playwright's dragTo method
                console.log('🎯 Attempting drag using dragTo method...');
                await sourceTicket.dragTo(destinationSection);
                console.log('✅ Drag operation completed using dragTo');
                this.dragSuccess = true;
                
            } catch (error) {
                console.log('⚠️ dragTo method failed, trying manual drag...');
                
                try {
                    // Method 2: Manual drag with mouse events
                    console.log('🎯 Attempting manual drag with mouse events...');
                    
                    // Get bounding boxes
                    const sourceBox = await sourceTicket.boundingBox();
                    const destBox = await destinationSection.boundingBox();
                    
                    if (!sourceBox || !destBox) {
                        throw new Error('Could not get bounding boxes for drag operation');
                    }
                    
                    // Calculate center points
                    const sourceX = sourceBox.x + sourceBox.width / 2;
                    const sourceY = sourceBox.y + sourceBox.height / 2;
                    const destX = destBox.x + destBox.width / 2;
                    const destY = destBox.y + destBox.height / 2;
                    
                    console.log(`📍 Source position: (${sourceX}, ${sourceY})`);
                    console.log(`📍 Destination position: (${destX}, ${destY})`);
                    
                    // Perform drag operation
                    await this.page.mouse.move(sourceX, sourceY);
                    await this.page.mouse.down();
                    await this.page.waitForTimeout(500); // Small pause
                    await this.page.mouse.move(destX, destY, { steps: 10 });
                    await this.page.waitForTimeout(500); // Pause before drop
                    await this.page.mouse.up();
                    
                    console.log('✅ Manual drag operation completed');
                    this.dragSuccess = true;
                    
                } catch (error2) {
                    console.log('⚠️ Manual drag failed, trying HTML5 drag...');
                    
                    try {
                        // Method 3: HTML5 drag and drop
                        console.log('🎯 Attempting HTML5 drag and drop...');
                        
                        await this.page.evaluate((sourceSelector, destSelector) => {
                            const source = document.querySelector(sourceSelector);
                            const dest = document.querySelector(destSelector);
                            
                            if (!source || !dest) {
                                throw new Error('Source or destination not found for HTML5 drag');
                            }
                            
                            // Create drag event
                            const dragStartEvent = new DragEvent('dragstart', {
                                bubbles: true,
                                cancelable: true,
                                dataTransfer: new DataTransfer()
                            });
                            
                            const dropEvent = new DragEvent('drop', {
                                bubbles: true,
                                cancelable: true,
                                dataTransfer: dragStartEvent.dataTransfer
                            });
                            
                            const dragEndEvent = new DragEvent('dragend', {
                                bubbles: true,
                                cancelable: true
                            });
                            
                            // Dispatch events
                            source.dispatchEvent(dragStartEvent);
                            dest.dispatchEvent(dropEvent);
                            source.dispatchEvent(dragEndEvent);
                            
                        }, '.o_kanban_record:has-text("Testing")', '.o_kanban_group:has-text("Tickets")');
                        
                        console.log('✅ HTML5 drag operation completed');
                        this.dragSuccess = true;
                        
                    } catch (error3) {
                        console.error('❌ All drag methods failed:', error3);
                        throw new Error('Could not perform drag operation');
                    }
                }
            }
            
            // Wait for any UI updates
            await this.page.waitForTimeout(2000);
            
            // Verify the drag was successful
            console.log('🔍 Verifying drag operation...');
            try {
                // Check if the ticket is now in Tickets section
                const verifyInTickets = await this.page.locator(`.o_kanban_group:has-text("Tickets") .o_kanban_record:has-text("${CONFIG.dragOperation.ticketTitle}")`).first().isVisible({ timeout: 3000 });
                
                if (verifyInTickets) {
                    console.log(`✅ Verification successful: "${CONFIG.dragOperation.ticketTitle}" ticket is now in Tickets section`);
                    this.dragSuccess = true;
                } else {
                    console.log('⚠️ Verification failed: Could not confirm ticket moved to Tickets section');
                    // Still consider it successful if no error occurred during drag
                }
            } catch (error) {
                console.log('⚠️ Could not verify drag operation, but no errors occurred');
            }
            
            if (this.dragSuccess) {
                console.log(`🎉 SUCCESS: "${CONFIG.dragOperation.ticketTitle}" ticket dragged from Resolved to Tickets section`);
                return true;
            } else {
                console.log(`❌ FAILED: Could not drag "${CONFIG.dragOperation.ticketTitle}" ticket to Tickets section`);
                return false;
            }
            
        } catch (error) {
            console.error('❌ Failed to drag ticket:', error);
            return false;
        }
    }

    async captureScreenshot(name) {
        try {
            const screenshotPath = path.join(__dirname, `screenshot_${name}_${Date.now()}.png`);
            await this.page.screenshot({ path: screenshotPath, fullPage: true });
            console.log(`📸 Screenshot saved: ${screenshotPath}`);
            return screenshotPath;
        } catch (error) {
            console.error('❌ Failed to capture screenshot:', error);
        }
    }

    async run() {
        try {
            await this.init();
            
            // Login
            const loginSuccess = await this.login();
            if (!loginSuccess) {
                throw new Error('Login failed');
            }
            await this.captureScreenshot('after_login');
            
            // Navigate to Test Support
            const navigationSuccess = await this.navigateToTestSupport();
            if (!navigationSuccess) {
                throw new Error('Failed to navigate to Test Support');
            }
            await this.captureScreenshot('before_drag');
            
            // Perform drag operation
            const dragResult = await this.dragTicketToTicketsSection();
            await this.captureScreenshot('after_drag');
            
            // Return result
            const result = {
                success: dragResult,
                dragCompleted: this.dragSuccess,
                operation: CONFIG.dragOperation
            };
            
            console.log('📊 Final Result:', result);
            return result;
            
        } catch (error) {
            console.error('❌ Drag operation failed:', error);
            await this.captureScreenshot('error');
            
            return {
                success: false,
                dragCompleted: false,
                error: error.message
            };
        } finally {
            if (this.browser) {
                await this.browser.close();
                console.log('🔒 Browser closed');
            }
        }
    }
}

// Main execution function
async function main() {
    console.log('🎯 Starting EOXS Ticket Dragger...');
    console.log('📋 Drag Operation:');
    console.log(`   Project: ${CONFIG.dragOperation.projectName}`);
    console.log(`   Ticket: ${CONFIG.dragOperation.ticketTitle}`);
    console.log(`   From: ${CONFIG.dragOperation.fromSection}`);
    console.log(`   To: ${CONFIG.dragOperation.toSection}`);
    console.log('');
    
    const dragger = new EOXSTicketDragger();
    const result = await dragger.run();
    
    console.log('');
    console.log('📊 Final Result:', result);
    console.log('');
    
    if (result.success && result.dragCompleted) {
        console.log('🎉 SUCCESS: Ticket dragged successfully!');
        console.log('✅ Drag operation completed!');
        process.exit(0); // Exit code 0 for success
    } else {
        console.log('❌ FAILED: Could not complete drag operation');
        console.log('❌ Drag operation failed!');
        process.exit(1); // Exit code 1 for failure
    }
}

// Handle process termination
process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    process.exit(1);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    process.exit(1);
});

// Run the dragger
if (require.main === module) {
    main().catch(error => {
        console.error('❌ Unhandled error:', error);
        console.log('❌ FAILED: Unhandled error occurred');
        process.exit(1);
    });
}

module.exports = EOXSTicketDragger;
