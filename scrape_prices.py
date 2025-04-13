import requests
from bs4 import BeautifulSoup
import json
import time
from datetime import datetime

def get_price(url):
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    try:
        response = requests.get(url, headers=headers)
        soup = BeautifulSoup(response.text, 'html.parser')
        price = soup.select_one('.price-container .font-bold').text.strip()
        return float(price.replace('€', '').replace(',', '.'))
    except Exception as e:
        print(f"Error fetching {url}: {str(e)}")
        return None

def update_prices():
    with open('carte.json', 'r', encoding='utf-8') as f:
        cards = json.load(f)
    
    for card in cards:
        new_price = get_price(card['cardmarket_url'])
        if new_price:
            card['prezzo'] = new_price
            card['ultimo_aggiornamento'] = datetime.now().isoformat()
        time.sleep(2)
    
    with open('carte.json', 'w', encoding='utf-8') as f:
        json.dump(cards, f, indent=2, ensure_ascii=False)

if __name__ == "__main__":
    update_prices()
