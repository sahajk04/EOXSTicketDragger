# Use Node.js 18 with Playwright dependencies
FROM mcr.microsoft.com/playwright:v1.44.0-jammy

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies using npm install (more flexible than npm ci)
RUN npm install --omit=dev

# Install Playwright browsers
RUN npx playwright install chromium

# Copy application code
COPY . .

# Create screenshots directory
RUN mkdir -p /app/screenshots

# Set environment variables
ENV NODE_ENV=production
ENV HEADLESS=true
ENV PORT=3000

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start the server
CMD ["npm", "start"]