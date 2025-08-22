#!/usr/bin/env python3
import json
import random
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

class APIHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        if self.path == '/api/agents':
            agents = []
            for i in range(1, 51):
                agents.append({
                    'id': f'agent-{i}',
                    'name': f'Agent {i}',
                    'status': random.choice(['active', 'idle', 'busy']),
                    'cpuUsage': random.randint(0, 100),
                    'memoryUsage': random.randint(0, 100),
                    'taskCount': random.randint(0, 20)
                })
            self.wfile.write(json.dumps(agents).encode())
        else:
            self.wfile.write(json.dumps({'message': 'Niro Agent API', 'status': 'running'}).encode())

if __name__ == '__main__':
    server = HTTPServer(('0.0.0.0', 7777), APIHandler)
    print('API server running on port 7777')
    server.serve_forever()
