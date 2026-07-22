# StockFlow — GitHub Push Script
# Run these commands in PowerShell AFTER the npm install finishes
# Replace YOUR_USERNAME with your actual GitHub username

# 1. Navigate to project
Set-Location "C:\Users\PMYLS\OneDrive\Desktop\GReporting\StockFlow"

# 2. Install all dependencies fresh
npm install --legacy-peer-deps

# 3. Stage all files
git add .

# 4. Commit
git commit -m "feat: StockFlow v1.0 - complete stock management app with PDF export, i18n, and backup"

# 5. Add your GitHub remote (CHANGE YOUR_USERNAME below!)
git remote add origin https://github.com/YOUR_USERNAME/StockFlow.git

# 6. Push
git branch -M main
git push -u origin main
