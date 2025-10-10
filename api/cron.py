import json
import math
from datetime import datetime
import os
import redis
from http.server import BaseHTTPRequestHandler # 이 라인을 추가하세요.

def cosine_similarity(vec_a, vec_b):
    """Calculate cosine similarity between two vectors."""
    if len(vec_a) != len(vec_b):
        return 0
    dot_product = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = math.sqrt(sum(a * a for a in vec_a))
    norm_b = math.sqrt(sum(b * b for b in vec_b))
    if norm_a == 0 or norm_b == 0:
        return 0
    return dot_product / (norm_a * norm_b)

def main():
    """Main function to calculate and save daily game data to Redis."""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    laws_path = os.path.join(script_dir, '../data/laws.json')
    
    try:
        redis_url = os.getenv('REDIS_URL')
        if not redis_url:
            print("Error: REDIS_URL environment variable not set.")
            return
        r = redis.from_url(redis_url, decode_responses=True, ssl_cert_reqs=None)
        r.ping()
        print("Successfully connected to Redis.")
    except redis.exceptions.ConnectionError as e:
        print(f"Error connecting to Redis: {e}")
        return

    try:
        with open(laws_path, 'r', encoding='utf-8') as f:
            laws = json.load(f)
    except FileNotFoundError:
        print(f"Error: The file {laws_path} was not found.")
        return
    except json.JSONDecodeError:
        print(f"Error: Could not decode JSON from {laws_path}.")
        return

    day_of_year = datetime.now().timetuple().tm_yday
    answer_index = (day_of_year - 1) % len(laws)
    answer_law = laws[answer_index]

    ranked_laws = []
    for law in laws:
        score = cosine_similarity(law['vector'], answer_law['vector'])
        ranked_laws.append({'id': law['id'], 'name': law['name'], 'score': score})

    ranked_laws.sort(key=lambda x: x['score'], reverse=True)
    
    final_ranking = []
    for i, law in enumerate(ranked_laws):
        law['rank'] = i + 1
        final_ranking.append(law)

    daily_data = {
        'answerId': answer_law['id'],
        'answerName': answer_law['name'],
        'answerContent': answer_law['content'],
        'ranking': final_ranking
    }
    
    law_names = [law['name'] for law in laws]

    try:
        r.set('daily_game_data', json.dumps(daily_data, ensure_ascii=False))
        r.set('law_names', json.dumps(law_names, ensure_ascii=False))
        print("Successfully saved daily game data and law names to Redis.")
    except Exception as e:
        print(f"Error saving data to Redis: {e}")

# --- 💡 오류 해결을 위한 핵심 코드 💡 ---
# Vercel이 Cron Job 요청을 보냈을 때 실행할 핸들러 클래스
class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        # GET 요청이 오면 main() 함수를 실행
        main() 
        
        # Vercel에 작업이 성공적으로 완료되었음을 알림
        self.send_response(200)
        self.send_header('Content-type', 'text/plain; charset=utf-8')
        self.end_headers()
        self.wfile.write("Cron job executed successfully.".encode('utf-8'))
        return

# 로컬에서 직접 python api/cron.py 로 테스트할 경우를 위한 코드 (Vercel 배포 시에는 사용되지 않음)
if __name__ == '__main__':
    main()