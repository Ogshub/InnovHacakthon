# 🚀 LinguaLink - Quick Setup Guide

## 📋 Overview

**LinguaLink** is an AI-powered multilingual duplicate record detection engine that uses a triple-signal matching approach (semantic, phonetic, structural) combined with graph-based clustering to identify duplicate records across massive, messy, multilingual databases.

### ✨ Key Features
- **🌍 Multilingual Support**: 109+ languages with cross-language detection
- **🧠 Triple-Signal Engine**: Semantic (LaBSE) + Phonetic + Structural matching
- **📊 Interactive Dashboard**: Real-time network graphs, heatmaps, and analytics
- **📱 Fully Responsive**: Works seamlessly on desktop, tablet, and mobile
- **⚡ High Performance**: Optimized for processing thousands of records

---

## 🛠️ Prerequisites

### Required Software
- **Python 3.11+** (recommended 3.12)
- **Git** (for cloning the repository)
- **Modern web browser** (Chrome, Firefox, Safari, Edge)

### System Requirements
- **RAM**: 4GB minimum (8GB+ recommended for large datasets)
- **Storage**: 2GB free space (includes AI models)
- **Internet**: Required for first-time model download (~1.8GB)

---

## ⚡ Quick Start (3 Steps)

### Step 1: Clone & Install
```bash
git clone https://github.com/Ogshub/InnovHacakthon.git
cd InnovHacakthon
pip install -r requirements.txt
```

### Step 2: Run the Application
```bash
# Windows
py -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Mac/Linux
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Step 3: Access the Dashboard
Open your browser and go to: **http://localhost:8000**

---

## 🎯 One-Click Startup Scripts

### Windows Users
Double-click `run_windows.bat` or run:
```cmd
run_windows.bat
```

### Mac/Linux Users
Make executable and run:
```bash
chmod +x run_unix.sh
./run_unix.sh
```

---

## 📁 Project Structure

```
InnovHacakthon/
├── 📄 README.md              # Detailed documentation
├── 📄 SETUP.md               # This quick setup guide
├── 📄 requirements.txt        # Python dependencies
├── 🚀 run_windows.bat        # Windows startup script
├── 🚀 run_unix.sh           # Mac/Linux startup script
├── 📁 app/                   # Backend API
│   ├── main.py              # FastAPI application
│   ├── routes.py            # API endpoints
│   ├── embeddings.py        # LaBSE semantic engine
│   ├── phonetic.py          # Phonetic matching
│   ├── fuzzy.py             # Fuzzy string matching
│   ├── matcher.py           # Triple-signal fusion
│   └── clustering.py        # Graph clustering
├── 📁 static/                # Frontend dashboard
│   ├── index.html           # Main dashboard
│   ├── styles.css           # Responsive UI styles
│   ├── app.js               # Application logic
│   ├── graph.js             # Network visualization
│   ├── heatmap.js           # Similarity heatmap
│   └── charts.js            # Analytics charts
├── 📁 data/                  # Restructured dataset directory
│   ├── ultra_complex_multilingual_dataset.csv
│   └── ecommerce_multilingual.csv
├── 📁 docs/                  # Documentation and reference PDFs
│   └── Innov8-PS.pdf
└── 📁 scripts/               # Helper and setup scripts
    ├── generate_dataset.py
    ├── read_pdf.py
    ├── setup_and_run.bat
    └── setup_and_run.sh
```

---

## 🔧 Configuration

### Environment Variables (Optional)
Create a `.env` file for custom settings:
```env
# Server Configuration
HOST=0.0.0.0
PORT=8000
DEBUG=false

# Model Settings
MODEL_CACHE_DIR=./models
MAX_SAMPLE_SIZE=1000

# Performance
BATCH_SIZE=64
MAX_WORKERS=4
```

### Custom Datasets
Upload your own CSV/JSON files with:
- Required column: `name` (the text to analyze)
- Optional columns: `description`, `language`, `category`

---

## 📱 Access Points

Once running, you can access:

| URL | Purpose |
|-----|---------|
| **http://localhost:8000** | Main Dashboard |
| **http://localhost:8000/docs** | API Documentation |
| **http://localhost:8000/api/health** | Health Check |
| **http://localhost:8000/api/demo** | Demo Analysis |

---

## 🎮 Using the Application

### 1. **Demo Analysis**
- Select a dataset (Global Names or E-Commerce)
- Choose sample size (50-1000 records)
- Set similarity threshold (0.3-0.95)
- Click "Run Analysis"

### 2. **Upload Your Data**
- Click "Upload CSV/JSON"
- Drop your file or browse
- Configure settings
- Click "Upload & Analyze"

### 3. **Live Search**
- Type any text in any language
- Get instant cross-language matches
- View similarity scores

### 4. **Explore Results**
- **Network Graph**: Interactive duplicate clusters
- **Heatmap**: Pairwise similarity matrix
- **Charts**: Language distribution, statistics
- **Clusters**: Detailed duplicate groups

---

## 🔍 Troubleshooting

### Common Issues

#### **Port Already in Use**
```bash
# Kill existing process (Windows)
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Kill existing process (Mac/Linux)
lsof -ti:8000 | xargs kill -9
```

#### **Model Download Fails**
- Check internet connection
- Wait 5-10 minutes for 1.8GB download
- Clear cache: `rm -rf ~/.cache/huggingface`

#### **Memory Issues**
- Reduce sample size to 200-500 records
- Close other applications
- Restart the server

#### **Browser Issues**
- Clear browser cache
- Try a different browser
- Disable ad blockers temporarily

### Performance Tips
- **First run**: Slower due to model download
- **Subsequent runs**: Much faster (models cached)
- **Large datasets**: Use smaller sample sizes initially
- **Mobile**: Use smaller datasets for better performance

---

## 📚 Advanced Usage

### API Integration
```python
import requests

# Health check
response = requests.get('http://localhost:8000/api/health')

# Demo analysis
data = {
    'sample_size': 200,
    'threshold': 0.55,
    'dataset': 'ultra_complex_multilingual_dataset.csv'
}
response = requests.post('http://localhost:8000/api/demo', json=data)
```

### Custom Thresholds
- **0.30-0.40**: Very sensitive (more duplicates, some false positives)
- **0.55-0.65**: Balanced (recommended default)
- **0.70-0.80**: Strict (fewer duplicates, higher precision)
- **0.85-0.95**: Very strict (only near-exact matches)

---

## 🤝 Support

### Getting Help
- 📖 Check this guide first
- 🔍 Try the troubleshooting section
- 📊 Test with demo datasets
- 🐛 Report issues on GitHub

### Community
- ⭐ Star the repository
- 🍴 Fork and contribute
- 📝 Share feedback and suggestions
- 🐛 Report bugs and issues

---

## 📄 License

This project is open source and available under the MIT License.

---

## 🎉 Enjoy!

You're all set! Start exploring the power of multilingual duplicate detection with LinguaLink. The dashboard provides an intuitive interface for analyzing data across languages, and the responsive design works perfectly on any device.

**Happy analyzing! 🚀**
