# 🌐 LinguaLink - Multilingual Duplicate Detection Engine

> **AI-powered system that identifies duplicate records across massive, messy, multilingual databases using a Triple-Signal Matching Engine, graph-based transitive clustering, and an interactive real-time dashboard.**

[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-Latest-green.svg)](https://fastapi.tiangolo.com)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Status](https://img.shields.io/badge/Status-Production--Ready-brightgreen.svg)](https://github.com/Ogshub/InnovHacakthon)

---

## 🚀 Quick Start

### 🎯 One-Click Setup
```bash
# Clone the repository
git clone https://github.com/Ogshub/InnovHacakthon.git
cd InnovHacakthon

# Run the setup script
# Windows: double-click run_windows.bat
# Mac/Linux: chmod +x run_unix.sh && ./run_unix.sh
```

### 📱 Access Points
- **Dashboard**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/api/health

---

## ✨ Features

### 🌍 **Multilingual Mastery**
- **109+ Languages**: English, Japanese, Chinese, Arabic, Hindi, Russian, and more
- **Cross-Language Detection**: Find duplicates across different languages
- **Unicode Support**: Handles all character sets and scripts

### 🧠 **Triple-Signal Engine**
1. **Semantic (55%)**: LaBSE embeddings for meaning-based matching
2. **Phonetic (25%)**: Cross-script transliteration for sound-based matching  
3. **Structural (20%)**: Fuzzy matching for typo and abbreviation handling

### 📊 **Interactive Dashboard**
- **Network Graph**: Force-directed visualization of duplicate clusters
- **Similarity Heatmap**: Pairwise similarity matrix visualization
- **Analytics Charts**: Language distribution, cluster statistics, signal contributions
- **Live Search**: Real-time cross-language search functionality

### 📱 **Responsive Design**
- **Mobile-First**: Works seamlessly on phones, tablets, and desktops
- **Touch-Friendly**: Optimized for touch interactions
- **Progressive Enhancement**: Adapts to different screen sizes

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         LinguaLink Architecture                     │
│                                                                     │
│  CSV / JSON Input                                                   │
│       │                                                             │
│       ▼                                                             │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                     FastAPI Backend                          │   │
│  │                                                              │   │
│  │  ┌─────────────────────────────────────────────────────┐    │   │
│  │  │             Triple-Signal Matching Engine           │    │   │
│  │  │                                                     │    │
│  │  │  ┌───────────┐  ┌───────────┐  ┌───────────────┐  │    │   │
│  │  │  │  LaBSE    │  │ Phonetic  │  │  RapidFuzz    │  │    │   │
│  │  │  │ Embedding │  │  Engine   │  │ Fuzzy Engine  │  │    │   │
│  │  │  │  (55%)    │  │  (25%)    │  │   (20%)       │  │    │   │
│  │  │  └─────┬─────┘  └─────┬─────┘  └──────┬────────┘  │    │   │
│  │  │        └──────────────┴───────────────┘           │    │   │
│  │  │                       │                           │    │   │
│  │  │              Weighted Fusion Score                 │    │   │
│  │  └──────────────────────┬──────────────────────────┘    │   │
│  │                         │                                │    │
│  │  ┌──────────────────────▼──────────────────────────┐    │   │
│  │  │           Graph-Based Clustering                 │    │   │
│  │  │                                                  │    │   │
│  │  │   NetworkX Graph → Louvain Community Detection   │    │   │
│  │  │                                                  │    │   │
│  │  └──────────────────────┬───────────────────────────┘   │   │
│  │                         │                                │    │
│  │                    JSON Response                         │    │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │              Interactive Dashboard (Vanilla JS + D3.js)      │   │
│  │                                                              │   │
│  │  ┌────────────┐  ┌────────────┐  ┌──────────┐  ┌────────┐  │   │
│  │  │  Network   │  │ Similarity │  │ Cluster  │  │ Live   │  │   │
│  │  │   Graph    │  │  Heatmap   │  │ Analysis │  │ Search │  │   │
│  │  └────────────┘  └────────────┘  └──────────┘  └────────┘  │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Technology Stack

### Backend
- **FastAPI**: Modern, fast web framework for building APIs
- **Uvicorn**: ASGI server for production deployment
- **sentence-transformers**: LaBSE multilingual embeddings
- **scikit-learn**: Machine learning and similarity metrics
- **NetworkX**: Graph construction and analysis
- **python-louvain**: Community detection algorithm
- **RapidFuzz**: High-performance fuzzy string matching
- **Pandas**: Data manipulation and analysis

### Frontend
- **Vanilla HTML/CSS/JS**: No build step required
- **D3.js**: Data-driven visualizations
- **Responsive Design**: Mobile-first approach
- **Modern CSS**: Custom properties, grid, flexbox

---

## 📁 Project Structure

```
InnovHacakthon/
├── 📄 README_FINAL.md        # This comprehensive guide
├── 📄 SETUP.md               # Quick setup instructions
├── 📄 requirements.txt        # Python dependencies with versions
├── 🚀 run_windows.bat        # Windows startup script
├── 🚀 run_unix.sh           # Mac/Linux startup script
├── 📁 app/                   # Backend API
│   ├── main.py              # FastAPI application factory
│   ├── routes.py            # API endpoints and orchestration
│   ├── embeddings.py        # LaBSE semantic embedding engine
│   ├── phonetic.py          # Phonetic fingerprint engine
│   ├── fuzzy.py             # RapidFuzz structural matching
│   ├── matcher.py           # Triple-signal weighted fusion
│   ├── clustering.py        # NetworkX graph + Louvain clustering
│   ├── models.py            # Pydantic request/response models
│   └── schemas.py           # Shared data schemas
├── 📁 static/                # Frontend dashboard
│   ├── index.html           # App shell with sidebar + main panel
│   ├── styles.css           # Responsive UI with mobile support
│   ├── app.js               # Core application logic + mobile handlers
│   ├── graph.js             # D3.js force-directed network graph
│   ├── heatmap.js           # Similarity heatmap visualization
│   └── charts.js            # Analytics charts (bar charts, stats)
├── 📁 frontend/             # Optional React/Vite development build
├── 📊 ultra_complex_multilingual_dataset.csv  # Primary demo dataset
├── 📊 ecommerce_multilingual.csv            # E-commerce demo dataset
└── 📄 lingualink.db          # SQLite database (optional)
```

---

## 🎮 Usage Guide

### 1. **Demo Analysis**
- Select dataset: "Global Names (21K+)" or "E-Commerce Products"
- Set sample size: 50-1000 records (start with 200)
- Configure threshold: 0.55 (default balanced setting)
- Click "Run Analysis"

### 2. **Upload Custom Data**
- Prepare CSV/JSON with `name` column (required)
- Optional: `description`, `language`, `category` columns
- Drop file or browse to upload
- Configure settings and analyze

### 3. **Live Search**
- Type any text in any language
- Get instant cross-language matches
- View similarity scores with signal breakdown

### 4. **Explore Visualizations**
- **Network Tab**: Interactive duplicate clusters
- **Heatmap Tab**: Pairwise similarity matrix
- **Charts Tab**: Language distribution, statistics
- **Clusters Tab**: Detailed cluster analysis

---

## 🔧 Configuration

### Environment Variables
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

### Similarity Thresholds
- **0.30-0.40**: Very sensitive (more duplicates, some false positives)
- **0.55-0.65**: Balanced (recommended default)
- **0.70-0.80**: Strict (fewer duplicates, higher precision)
- **0.85-0.95**: Very strict (only near-exact matches)

---

## 📊 API Reference

### Core Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Server and model status |
| `/api/demo` | POST | Run analysis on demo dataset |
| `/api/detect` | POST | Upload and analyze custom data |
| `/api/search` | POST | Live cross-language search |

### Example Usage
```python
import requests

# Demo analysis
response = requests.post('http://localhost:8000/api/demo', json={
    'sample_size': 200,
    'threshold': 0.55,
    'dataset': 'ultra_complex_multilingual_dataset.csv'
})

# Live search
response = requests.post('http://localhost:8000/api/search', json={
    'query': 'Login issue'  # Works in any language
})
```

---

## 🌍 Language Support

### Supported Languages (109+)
**Major Languages**: English, Spanish, French, German, Italian, Portuguese, Russian, Chinese, Japanese, Korean, Arabic, Hindi

**Additional Languages**: Turkish, Dutch, Swedish, Norwegian, Danish, Finnish, Polish, Czech, Hungarian, Romanian, Bulgarian, Croatian, Serbian, Slovenian, Estonian, Latvian, Lithuanian, Greek, Hebrew, Thai, Vietnamese, Indonesian, Malay, Filipino, Bengali, Tamil, Telugu, Marathi, Gujarati, Kannada, Urdu, Persian, Azerbaijani, Kazakh, Uzbek, Kyrgyz, Tajik, Mongolian, Nepali, Sinhala, Burmese, Khmer, Lao, Amharic, Swahili, Zulu, Afrikaans, Hausa, Yoruba, Igbo, Somali, Oromo, Uzbek, and many more...

### Cross-Language Examples
- `"Login Issue"` (English) ↔ `"ログインの問題"` (Japanese)
- `"Wireless Headphones"` (English) ↔ `"Auriculares Inalámbricos"` (Spanish)
- `"Apple Inc."` (English) ↔ `"苹果公司"` (Chinese)

---

## 📱 Mobile Features

### Responsive Design
- **Breakpoints**: 480px, 768px, 1024px, 1440px, 1600px
- **Mobile Layout**: Collapsible sidebar, vertical stacking
- **Touch Targets**: 44px minimum touch areas
- **Gestures**: Swipe, tap, pinch-to-zoom support

### Mobile Optimizations
- **Performance**: Reduced animations on mobile
- **Navigation**: Hamburger menu with smooth transitions
- **Typography**: Optimized font sizes for readability
- **Interactions**: Touch-friendly hover states

---

## 🔍 Troubleshooting

### Common Issues

#### **Port Already in Use**
```bash
# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:8000 | xargs kill -9
```

#### **Model Download Issues**
- Check internet connection (1.8GB download required)
- Wait 5-10 minutes for initial download
- Clear cache: `rm -rf ~/.cache/huggingface`

#### **Memory Issues**
- Reduce sample size to 200-500 records
- Close other applications
- Restart the server

#### **Browser Issues**
- Clear browser cache and cookies
- Try a different browser
- Disable ad blockers temporarily

### Performance Tips
- **First Run**: Slower due to model download
- **Subsequent Runs**: Much faster (models cached)
- **Large Datasets**: Use smaller sample sizes initially
- **Mobile**: Use smaller datasets for better performance

---

## 🚀 Deployment

### Production Deployment
```bash
# Install production server
pip install gunicorn

# Run with Gunicorn
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000

# Or with Docker
docker build -t lingualink .
docker run -p 8000:8000 lingualink
```

### Dockerfile Example
```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## 🤝 Contributing

### Development Setup
```bash
# Clone repository
git clone https://github.com/Ogshub/InnovHacakthon.git
cd InnovHacakthon

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Mac/Linux
# or venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Run development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Contributing Guidelines
- Fork the repository
- Create a feature branch
- Make your changes
- Add tests if applicable
- Submit a pull request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **LaBSE**: Language-agnostic BERT sentence embeddings (Google Research)
- **HuggingFace**: Model hosting and infrastructure
- **D3.js**: Data visualization library
- **FastAPI**: Modern Python web framework

---

## 📞 Support

### Getting Help
- 📖 Check [SETUP.md](SETUP.md) for quick setup guide
- 🔍 Try the troubleshooting section above
- 📊 Test with demo datasets first
- 🐛 Report issues on GitHub

### Community
- ⭐ Star the repository
- 🍴 Fork and contribute
- 📝 Share feedback and suggestions
- 🐛 Report bugs and feature requests

---

## 🎉 Ready to Go!

You're all set to explore the power of multilingual duplicate detection! The LinguaLink dashboard provides an intuitive interface for analyzing data across languages, and the responsive design works perfectly on any device.

**Happy analyzing! 🚀**

---

*Built with ❤️ for the Innov8 Hackathon - Problem Statement 3*
