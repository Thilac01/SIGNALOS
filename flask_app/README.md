# Signal Monitor Web App

A dynamic, industrial-standard Flask application for visualizing signal data.

## Features
- **Dashboard**: Real-time overview of signal metrics.
- **Dynamic Charts**: Interactive visualization of topic clusters and impact vs. sentiment.
- **Live Feed**: Sortable and filterable table of signal data.
- **Premium UI**: Dark mode, glassmorphism design, and responsive layout.

## Setup
1. Ensure you have Python installed.
2. Install dependencies (if not already):
   ```bash
   pip install flask pandas
   ```
3. Run the application:
   ```bash
   python app.py
   ```
4. Open your browser to `http://127.0.0.1:5000`.

## Data
The application reads from `data.csv` located in the root directory.
