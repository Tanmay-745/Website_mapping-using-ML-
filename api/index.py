import sys
import os

# Add the backend directory to the path so we can import the app
sys.path.append(os.path.join(os.path.dirname(__file__), '../backend'))

from main import app as handler

# This file acts as the entry point for Vercel Serverless Functions
# It imports the FastAPI app from the /backend folder
