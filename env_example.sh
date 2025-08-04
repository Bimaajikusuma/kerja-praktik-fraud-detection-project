# Server Configuration
PORT=3000
NODE_ENV=development

# Email Configuration (for Gmail)
EMAIL_USER=owensilaban2018@gmail.com
EMAIL_PASS=your-app-password

# Database Configuration (if you want to add database later)
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=fraud_detection
# DB_USER=your_db_user
# DB_PASS=your_db_password

# File Upload Configuration
MAX_FILE_SIZE=104857600  # 100MB in bytes
ALLOWED_FILE_TYPES=.csv,.xlsx,.xls

# Security
JWT_SECRET=your-super-secret-jwt-key
API_RATE_LIMIT=100  # requests per minute

# External Services (if needed)
# ML_API_URL=http://localhost:5000
# ML_API_KEY=your-ml-api-key