import os
from dotenv import load_dotenv

load_dotenv()

# API Keys
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
HF_API_KEY = os.getenv("HF_API_KEY")
REDIS_URL = os.getenv("REDIS_URL")  # Redis Cloud connection string

# Models
GROQ_MODEL = "llama-3.3-70b-versatile"

# Chunking
CHUNK_SIZE = 500
CHUNK_OVERLAP = 100
TOP_K_CHUNKS = 3

# Chat memory
MAX_HISTORY_MESSAGES = 10
SUMMARIZE_AFTER = 6

# Session
SESSION_TTL_SECONDS = 60 * 60 * 2  # 2 hours

# Concurrency — cap simultaneous Groq calls
GROQ_CONCURRENCY_LIMIT = 3