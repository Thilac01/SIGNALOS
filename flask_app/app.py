import os
import pandas as pd
from flask import Flask, render_template, jsonify

app = Flask(__name__)

# Configuration
DATA_FILE = os.path.join(os.path.dirname(__file__), 'data.csv')

def load_data():
    try:
        df = pd.read_csv(DATA_FILE)
        # Clean column names (strip whitespace)
        df.columns = df.columns.str.strip()
        
        # Handle missing values
        df.fillna({
            'Source': 'Unknown',
            'Title': 'No Title',
            'Summary': 'No Summary',
            'impact_score': 0,
            'sentiment_score': 0,
            'impact_level': 'Low',
            'topic_cluster': 'Uncategorized'
        }, inplace=True)
        
        return df
    except Exception as e:
        print(f"Error loading data: {e}")
        return pd.DataFrame()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/data')
def get_data():
    df = load_data()
    if df.empty:
        return jsonify([])
    
    # Convert to list of dicts
    data = df.to_dict(orient='records')
    return jsonify(data)

@app.route('/api/stats')
def get_stats():
    df = load_data()
    if df.empty:
        return jsonify({})
    
    stats = {
        'total_signals': int(len(df)),
        'avg_impact': float(df['impact_score'].mean()),
        'avg_sentiment': float(df['sentiment_score'].mean()),
        'high_impact_count': int(len(df[df['impact_level'].astype(str).str.lower() == 'high'])),
        'sources_count': int(df['Source'].nunique())
    }
    return jsonify(stats)

@app.route('/api/clusters')
def get_clusters():
    df = load_data()
    if df.empty:
        return jsonify({})
    
    # Group by topic_cluster
    clusters = df['topic_cluster'].value_counts().to_dict()
    return jsonify(clusters)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
