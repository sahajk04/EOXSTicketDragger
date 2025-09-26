# Use Node.js 18 with Playwright dependencies
FROM mcr.microsoft.com/playwright:v1.44.0-jammy

# Install Xvfb and other dependencies for virtual display
RUN apt-get update && apt-get install -y \
    xvfb \
    x11-utils \
    x11-xserver-utils \
    xauth \
    && rm -rf /var/lib/apt/lists/*

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
ENV HEADLESS=false
ENV PORT=3000
ENV DISPLAY=:99

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start Xvfb and the server
CMD Xvfb :99 -screen 0 1920x1080x24 -ac +extension GLX +render -noreset & \
    sleep 2 && \
    npm start
