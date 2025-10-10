
import json
import math
from datetime import datetime
import os

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
    """Main function to calculate and save daily game data."""
    # Get the absolute path of the script
    script_dir = os.path.dirname(os.path.abspath(__file__))
    # Construct paths relative to the script's location
    laws_path = os.path.join(script_dir, '../data/laws.json')
    output_path = os.path.join(script_dir, '../public/daily_game_data.json')
    output_path_law_names = os.path.join(script_dir, '../public/law_names.json')
    

    try:
        with open(laws_path, 'r', encoding='utf-8') as f:
            laws = json.load(f)
    except FileNotFoundError:
        print(f"Error: The file {laws_path} was not found.")
        return
    except json.JSONDecodeError:
        print(f"Error: Could not decode JSON from {laws_path}.")
        return

    # Determine the daily answer law (logic must match the old API)
    day_of_year = datetime.now().timetuple().tm_yday
    answer_index = (day_of_year - 1) % len(laws)
    answer_law = laws[answer_index]

    # Calculate similarity scores for all laws against the answer
    ranked_laws = []
    for law in laws:
        score = cosine_similarity(law['vector'], answer_law['vector'])
        ranked_laws.append({
            'id': law['id'],
            'name': law['name'],
            'score': score
        })

    # Sort by score and add rank
    ranked_laws.sort(key=lambda x: x['score'], reverse=True)
    
    final_ranking = []
    for i, law in enumerate(ranked_laws):
        law['rank'] = i + 1
        final_ranking.append(law)

    # Create the final data structure
    daily_data = {
        'answerId': answer_law['id'],
        'answerName': answer_law['name'],
        'answerContent': answer_law['content'],
        'ranking': final_ranking
    }

    # Save the result to the public directory
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(daily_data, f, ensure_ascii=False, indent=2)
    
    # Save the result to the public directory
    with open(output_path_law_names, 'w', encoding='utf-8') as f:
        law_names = [law['name'] for law in laws]
        json.dump(law_names, f, ensure_ascii=False, indent=2)

    print(f"Successfully generated daily game data to {output_path}")
    print(f"Successfully generated law names to {output_path_law_names}")

if __name__ == '__main__':
    main()

