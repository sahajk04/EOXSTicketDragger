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
    projectUrl: process.env.PROJECT_URL || '',
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
        timeout: 120000, // Increased for Railway
        navigationTimeout: 60000 // Increased for Railway
    },
    browser: {
        headless: process.env.HEADLESS === 'true', // Only headless if explicitly set to true
        slowMo: 100, // Add delay between actions for better reliability
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
                slowMo: CONFIG.browser.headless ? 0 : CONFIG.browser.slowMo, // No delay in headless mode
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--disable-gpu',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor',
                    '--disable-extensions',
                    '--disable-plugins',
                    '--disable-images', // Faster loading in headless mode
                    ...(CONFIG.browser.headless ? ['--headless=new'] : ['--start-maximized'])
                ]
            });

            // Create browser context
            this.context = await this.browser.newContext({
                viewport: CONFIG.browser.headless ? { width: 1920, height: 1080 } : null,
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                ignoreHTTPSErrors: true,
                ...(CONFIG.browser.headless && {
                    // Optimize for headless mode
                    reducedMotion: 'reduce',
                    forcedColors: 'none'
                })
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
            
            // If PROJECT_URL is provided, use it directly (Railway optimization)
            if (CONFIG.projectUrl) {
                try {
                    console.log('🔗 Using PROJECT_URL for direct navigation');
                    await this.page.goto(CONFIG.projectUrl, {
                        waitUntil: 'networkidle',
                        timeout: CONFIG.waitOptions.navigationTimeout
                    });
                    await this.page.waitForTimeout(3000);
                    
                    // Verify we're on the kanban board by checking for columns
                    const hasColumns = await this.page.locator('.o_kanban_group:has-text("Resolved"), .o_kanban_group:has-text("Tickets")').first().isVisible({ timeout: 10000 }).catch(() => false);
                    if (hasColumns) {
                        console.log('✅ Successfully opened kanban board via PROJECT_URL');
                        return true;
                    } else {
                        console.log('⚠️ PROJECT_URL did not show expected columns, falling back to UI navigation');
                    }
                } catch (e) {
                    console.log('⚠️ PROJECT_URL failed, falling back to UI navigation:', e.message);
                }
            }
            
            // Fallback to UI navigation with increased timeouts for Railway
            await this.page.waitForTimeout(3000);
            
            // Click sidebar menu with longer timeouts
            const sidebarMenuSelectors = ['.o_menu_apps', '.o_menu_toggle', '.fa-th'];
            let sidebarOpened = false;
            for (const selector of sidebarMenuSelectors) {
                try {
                    if (await this.page.locator(selector).first().isVisible({ timeout: 8000 })) {
                        await this.clickElement(selector);
                        sidebarOpened = true;
                        console.log(`✅ Clicked sidebar menu: ${selector}`);
                        await this.page.waitForTimeout(2000);
                        break;
                    }
                } catch (error) {
                    continue;
                }
            }
            
            if (!sidebarOpened) {
                throw new Error('Could not open sidebar menu');
            }
            
            // Click Projects with longer timeouts
            const projectsSelectors = ['text=Projects', 'text=Project'];
            let projectsClicked = false;
            for (const selector of projectsSelectors) {
                try {
                    if (await this.page.locator(selector).first().isVisible({ timeout: 8000 })) {
                        await this.clickElement(selector);
                        projectsClicked = true;
                        console.log(`✅ Clicked Projects: ${selector}`);
                        await this.page.waitForLoadState('networkidle');
                        break;
                    }
                } catch (error) {
                    continue;
                }
            }
            
            if (!projectsClicked) {
                throw new Error('Could not find Projects section');
            }
            
            await this.page.waitForTimeout(3000);
            
            // Click Test Support project with longer timeouts
            const supportSelectors = [
                '.o_kanban_record:has-text("Test Support")',
                'text=Test Support'
            ];
            
            let supportClicked = false;
            for (const selector of supportSelectors) {
                try {
                    if (await this.page.locator(selector).first().isVisible({ timeout: 10000 })) {
                        await this.clickElement(selector);
                        supportClicked = true;
                        console.log(`✅ Clicked Test Support: ${selector}`);
                        await this.page.waitForLoadState('networkidle');
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

    async changeTicketStage() {
        try {
            console.log('🔧 Attempting to change ticket stage via form...');
            
            // Wait for form to load
            await this.page.waitForTimeout(2000);
            
            // Look for stage/status controls in the form with more comprehensive selectors
            const stageSelectors = [
                'select[name="stage_id"]',
                'select[name="stage"]',
                'select[name="kanban_state"]',
                'div[name="stage_id"]',
                'div[name="stage"]',
                'div[name="kanban_state"]',
                '.o_field_widget[name="stage_id"]',
                '.o_field_widget[name="stage"]',
                '.o_field_widget[name="kanban_state"]',
                '.o_statusbar_status select',
                '.o_statusbar_status div[name*="stage"]',
                '.o_statusbar_status div[name*="state"]'
            ];
            
            for (const selector of stageSelectors) {
                try {
                    const field = this.page.locator(selector).first();
                    if (await field.isVisible({ timeout: 2000 })) {
                        console.log(`✅ Found stage field: ${selector}`);
                        
                        // If it's a select dropdown
                        if (selector.includes('select')) {
                            // Try different option selection methods
                            try {
                                await field.selectOption({ label: 'Tickets' });
                                console.log('✅ Selected "Tickets" from dropdown by label');
                            } catch (e1) {
                                try {
                                    await field.selectOption({ index: 1 }); // Try second option
                                    console.log('✅ Selected option by index');
                                } catch (e2) {
                                    // Try clicking the select to open it first
                                    await field.click();
                                    await this.page.waitForTimeout(500);
                                    const option = this.page.locator('option:has-text("Tickets"), option:has-text("Open"), option:has-text("New")').first();
                                    if (await option.isVisible({ timeout: 2000 })) {
                                        await option.click();
                                        console.log('✅ Clicked option after opening select');
                                    }
                                }
                            }
                        } else {
                            // If it's a div field, try clicking it to open dropdown
                            await field.click();
                            await this.page.waitForTimeout(500);
                            
                            // Try to click "Tickets" option with multiple selectors
                            const optionSelectors = [
                                'li:has-text("Tickets")',
                                '.o_dropdown_item:has-text("Tickets")',
                                'option:has-text("Tickets")',
                                'li:has-text("Open")',
                                '.o_dropdown_item:has-text("Open")',
                                'option:has-text("Open")'
                            ];
                            
                            for (const optSel of optionSelectors) {
                                try {
                                    const option = this.page.locator(optSel).first();
                                    if (await option.isVisible({ timeout: 1000 })) {
                                        await option.click();
                                        console.log(`✅ Clicked option using: ${optSel}`);
                                        break;
                                    }
                                } catch (e) { /* try next */ }
                            }
                        }
                        
                        // Save the form
                        const saveSelectors = [
                            'button[name="action_save"]', 
                            'button:has-text("Save")', 
                            '.o_form_button_save',
                            'button[type="submit"]',
                            '.o_form_button_edit',
                            'button:has-text("Edit")'
                        ];
                        
                        for (const saveSel of saveSelectors) {
                            try {
                                const saveBtn = this.page.locator(saveSel).first();
                                if (await saveBtn.isVisible({ timeout: 2000 })) {
                                    await saveBtn.click();
                                    console.log(`✅ Saved form using: ${saveSel}`);
                                    break;
                                }
                            } catch (e) { /* ignore */ }
                        }
                        
                        await this.page.waitForLoadState('networkidle');
                        await this.page.waitForTimeout(3000);
                        return true;
                    }
                } catch (e) { /* try next */ }
            }
            
            console.log('⚠️ No stage field found');
            return false;
        } catch (error) {
            console.log('⚠️ Stage change failed:', error.message);
            return false;
        }
    }

    async performDragOperation(sourceTicket, destinationSection) {
        try {
            console.log('🎯 Performing drag operation as fallback...');
            
            // Ensure source and destination are in view
            await sourceTicket.scrollIntoViewIfNeeded();
            await destinationSection.scrollIntoViewIfNeeded();
            await this.page.waitForTimeout(300);

            // Use Playwright's dragTo method
            await sourceTicket.dragTo(destinationSection);
            console.log('✅ Drag operation completed');
            this.dragSuccess = true;
            
        } catch (error) {
            console.log('⚠️ Drag operation failed:', error.message);
            this.dragSuccess = false;
        }
    }

    async dragTicketToTicketsSection() {
        try {
            console.log(`🎯 Starting drag operation: "${CONFIG.dragOperation.ticketTitle}" from Resolved to Tickets...`);
            
            // Wait for page to load completely
            await this.page.waitForTimeout(3000);
            
            // Find the specified ticket in Resolved section
            console.log(`🔍 Looking for "${CONFIG.dragOperation.ticketTitle}" ticket in Resolved section...`);
            
            // Try multiple approaches to find the ticket
            const sourceTicketSelectors = [
                `.o_kanban_group:has-text("Resolved") .o_kanban_record:has-text("${CONFIG.dragOperation.ticketTitle}")`,
                `.o_kanban_record:has-text("${CONFIG.dragOperation.ticketTitle}")`,
                // Try with partial text matching
                `.o_kanban_group:has-text("Resolved") .o_kanban_record:has-text("CUSTOM TITLE TEST")`,
                `.o_kanban_record:has-text("CUSTOM TITLE TEST")`,
                `.o_kanban_group:has-text("Resolved") .o_kanban_record:has-text("Dynamic Environment")`,
                `.o_kanban_record:has-text("Dynamic Environment")`
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
            
            // Skip drag operations in headless mode and go straight to form-based stage change
            console.log('🚀 Headless mode detected - using form-based stage change instead of drag...');
            
            // Open the ticket card directly
            try {
                console.log('🖱️ Clicking on ticket card...');
                await sourceTicket.click();
                await this.page.waitForLoadState('networkidle');
                await this.page.waitForTimeout(2000);
                console.log('✅ Opened ticket card for stage change');
                
                // Try to change stage via form
                console.log('🔧 Attempting form-based stage change...');
                const stageChanged = await this.changeTicketStage();
                if (stageChanged) {
                    console.log('✅ Stage changed successfully via form');
                    this.dragSuccess = true;
                } else {
                    console.log('⚠️ Form stage change failed, trying drag as fallback');
                    // Fallback to drag if form change fails
                    await this.performDragOperation(sourceTicket, destinationSection);
                }
            } catch (error) {
                console.log('⚠️ Card click failed:', error.message);
                console.log('🔄 Trying drag operation as fallback...');
                await this.performDragOperation(sourceTicket, destinationSection);
            }
            
            // Wait for any UI updates
            await this.page.waitForTimeout(2000);
            
            // Verify the drag was successful
            console.log('🔍 Verifying drag operation...');
            let verifyInTickets = false;
            try {
                verifyInTickets = await this.page.locator(`.o_kanban_group:has-text("Tickets") .o_kanban_record:has-text("${CONFIG.dragOperation.ticketTitle}")`).first().isVisible({ timeout: 4000 });
            } catch (error) {
                verifyInTickets = false;
            }
                
                if (verifyInTickets) {
                    console.log(`✅ Verification successful: "${CONFIG.dragOperation.ticketTitle}" ticket is now in Tickets section`);
                    this.dragSuccess = true;
                return true;
            }

            // Fallback: open the card and set stage to Tickets via form statusbar or dropdown
            console.log('🛠️ Drag verification failed, trying fallback: open card and change stage to "Tickets"...');
            try {
                // Find and click the ticket card
                const sourceSelectors = [
                    `.o_kanban_group:has-text("Resolved") .o_kanban_record:has-text("${CONFIG.dragOperation.ticketTitle}")`,
                    `.o_kanban_record:has-text("${CONFIG.dragOperation.ticketTitle}")`
                ];
                
                let cardClicked = false;
                for (const sel of sourceSelectors) {
                    try {
                        const card = this.page.locator(sel).first();
                        if (await card.isVisible({ timeout: 3000 })) {
                            await card.click();
                            cardClicked = true;
                            console.log(`✅ Opened card via: ${sel}`);
                            break;
                        }
                    } catch (e) { /* try next */ }
                }
                
                if (!cardClicked) {
                    console.log('⚠️ Could not open ticket card');
                    return false;
                }
                
                await this.page.waitForLoadState('networkidle');
                await this.page.waitForTimeout(2000);

                // Try multiple approaches to change stage
                let stageChanged = false;

                // Approach 1: Statusbar buttons (Odoo specific)
                const statusbarSelectors = [
                    '.o_statusbar_status button:has-text("Tickets")',
                    '.o_statusbar_status .btn:has-text("Tickets")',
                    '.o_statusbar_buttons button:has-text("Tickets")',
                    '.o_statusbar_status button[data-value*="ticket"]',
                    '.o_statusbar_status button[data-value*="Ticket"]',
                    'button[data-value="tickets"]',
                    'button[data-value="Tickets"]',
                    // Try clicking any statusbar button that's not "Resolved"
                    '.o_statusbar_status button:not([class*="btn-secondary"]):not(:has-text("Resolved"))'
                ];

                for (const sel of statusbarSelectors) {
                    try {
                        const btn = this.page.locator(sel).first();
                        if (await btn.isVisible({ timeout: 2000 })) {
                            await btn.click();
                            stageChanged = true;
                            console.log(`✅ Changed stage via statusbar: ${sel}`);
                            break;
                        }
                    } catch (e) { /* try next */ }
                }

                // Approach 2: Stage dropdown field
                if (!stageChanged) {
                    const stageFieldSelectors = [
                        'select[name="stage_id"]',
                        'select[name="stage"]',
                        'div[name="stage_id"]',
                        'div[name="stage"]',
                        '.o_field_widget[name="stage_id"]',
                        '.o_field_widget[name="stage"]'
                    ];

                    for (const sel of stageFieldSelectors) {
                        try {
                            const field = this.page.locator(sel).first();
                            if (await field.isVisible({ timeout: 2000 })) {
                                // If it's a select dropdown
                                if (sel.includes('select')) {
                                    await field.selectOption({ label: 'Tickets' });
                } else {
                                    // If it's a div field, try clicking it to open dropdown
                                    await field.click();
                                    await this.page.waitForTimeout(500);
                                    // Try to click "Tickets" option
                                    const option = this.page.locator('li:has-text("Tickets"), .o_dropdown_item:has-text("Tickets")').first();
                                    if (await option.isVisible({ timeout: 2000 })) {
                                        await option.click();
                                        stageChanged = true;
                                        console.log(`✅ Changed stage via dropdown: ${sel}`);
                                        break;
                                    }
                                }
                            }
                        } catch (e) { /* try next */ }
                    }
                }

                // Approach 3: Generic "Tickets" button/link anywhere in form
                if (!stageChanged) {
                    const genericSelectors = [
                        'button:has-text("Tickets")',
                        'a:has-text("Tickets")',
                        'span:has-text("Tickets")',
                        '.badge:has-text("Tickets")'
                    ];

                    for (const sel of genericSelectors) {
                        try {
                            const el = this.page.locator(sel).first();
                            if (await el.isVisible({ timeout: 2000 })) {
                                await el.click();
                                stageChanged = true;
                                console.log(`✅ Changed stage via generic selector: ${sel}`);
                                break;
                            }
                        } catch (e) { /* try next */ }
                    }
                }

                if (stageChanged) {
                    // Save the form
                    const saveSelectors = [
                        'button[name="action_save"]', 
                        'button:has-text("Save")', 
                        '.o_form_button_save',
                        'button[type="submit"]'
                    ];
                    
                    for (const sel of saveSelectors) {
                        try {
                            const btn = this.page.locator(sel).first();
                            if (await btn.isVisible({ timeout: 2000 })) {
                                await btn.click();
                                console.log(`💾 Saved form using: ${sel}`);
                                break;
                            }
                        } catch (e) { /* ignore */ }
                    }

                    await this.page.waitForLoadState('networkidle');
                    await this.page.waitForTimeout(3000);

                    // Navigate back to board to verify
                    try {
                        await this.page.goBack();
                        await this.page.waitForLoadState('networkidle');
                        await this.page.waitForTimeout(2000);
                    } catch (e) {
                        // If goBack fails, try navigating to project again
                        console.log('⚠️ Go back failed, trying to navigate back to board');
                    }

                    // Re-verify in Tickets column
                    try {
                        verifyInTickets = await this.page.locator(`.o_kanban_group:has-text("Tickets") .o_kanban_record:has-text("${CONFIG.dragOperation.ticketTitle}")`).first().isVisible({ timeout: 5000 });
                    } catch (e) {
                        verifyInTickets = false;
                    }

                    if (verifyInTickets) {
                        console.log('✅ Fallback successful: ticket is now in Tickets section');
                        this.dragSuccess = true;
                        return true;
                    }
                }

                console.log('⚠️ Fallback did not successfully move ticket to Tickets');
            } catch (fallbackError) {
                console.log('⚠️ Fallback move failed:', fallbackError.message);
            }

            // Final attempt: Force page refresh and check again
            console.log('🔄 Final attempt: refreshing page and re-checking...');
            try {
                await this.page.reload({ waitUntil: 'networkidle' });
                await this.page.waitForTimeout(3000);
                
                // One final check
                const finalCheck = await this.page.locator(`.o_kanban_group:has-text("Tickets") .o_kanban_record:has-text("${CONFIG.dragOperation.ticketTitle}")`).first().isVisible({ timeout: 5000 }).catch(() => false);
                
                if (finalCheck) {
                    console.log('✅ SUCCESS after refresh: ticket is now in Tickets section');
                    this.dragSuccess = true;
                    return true;
                }
            } catch (e) {
                console.log('⚠️ Final refresh check failed');
            }

            // Ultimate fallback: Force stage change via JavaScript
            console.log('🚨 ULTIMATE FALLBACK: Force stage change via JavaScript...');
            try {
                const jsResult = await this.page.evaluate((ticketTitle) => {
                    // Find the ticket card
                    const cards = Array.from(document.querySelectorAll('.o_kanban_record'));
                    const targetCard = cards.find(card => card.textContent.includes(ticketTitle));
                    
                    if (!targetCard) {
                        return { success: false, error: 'Ticket card not found' };
                    }
                    
                    // Try to find and click any stage/status button that's not "Resolved"
                    const statusButtons = Array.from(targetCard.querySelectorAll('button, .badge, span'));
                    const nonResolvedButton = statusButtons.find(btn => 
                        btn.textContent && 
                        !btn.textContent.toLowerCase().includes('resolved') &&
                        (btn.textContent.toLowerCase().includes('ticket') || 
                         btn.textContent.toLowerCase().includes('open') ||
                         btn.textContent.toLowerCase().includes('new'))
                    );
                    
                    if (nonResolvedButton) {
                        nonResolvedButton.click();
                        return { success: true, method: 'button_click' };
                    }
                    
                    // Try to find stage dropdown and change it
                    const stageSelects = Array.from(document.querySelectorAll('select[name*="stage"], select[name*="status"]'));
                    for (const select of stageSelects) {
                        const options = Array.from(select.options);
                        const ticketOption = options.find(opt => 
                            opt.textContent.toLowerCase().includes('ticket') ||
                            opt.textContent.toLowerCase().includes('open')
                        );
                        if (ticketOption) {
                            select.value = ticketOption.value;
                            select.dispatchEvent(new Event('change', { bubbles: true }));
                            return { success: true, method: 'select_change' };
                        }
                    }
                    
                    return { success: false, error: 'No stage change method found' };
                }, CONFIG.dragOperation.ticketTitle);
                
                if (jsResult.success) {
                    console.log(`✅ JavaScript stage change successful: ${jsResult.method}`);
                    await this.page.waitForTimeout(2000);
                    
                    // Final verification
                    const finalVerify = await this.page.locator(`.o_kanban_group:has-text("Tickets") .o_kanban_record:has-text("${CONFIG.dragOperation.ticketTitle}")`).first().isVisible({ timeout: 5000 }).catch(() => false);
                    if (finalVerify) {
                        console.log('✅ ULTIMATE FALLBACK SUCCESS: Ticket moved to Tickets');
                        this.dragSuccess = true;
                        return true;
                    }
                }
            } catch (e) {
                console.log('⚠️ Ultimate fallback failed:', e.message);
            }

            console.log(`❌ FAILED: Could not move "${CONFIG.dragOperation.ticketTitle}" to Tickets section`);
            this.dragSuccess = false;
            return false;
            
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
