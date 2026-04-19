import pandas as pd
import random

def generate_ecommerce_dataset():
    """Generates a multilingual e-commerce product dataset with duplicates/typos."""
    data = []
    _id = 1
    cluster_id = 1
    
    base_products = [
        {"en": "Wireless Gaming Mouse RGB", "es": "Ratón Gaming Inalámbrico RGB", "ja": "ワイヤレス ゲーミングマウス RGB", "fr": "Souris Gamer Sans Fil RGB"},
        {"en": "Noise Cancelling Headphones 700", "es": "Auriculares con Cancelación de Ruido 700", "ja": "ノイズキャンセリング ヘッドホン 700", "fr": "Casque Réduction Bruit 700"},
        {"en": "Mechanical Keyboard Blue Switches", "es": "Teclado Mecánico Switches Azules", "ja": "メカニカルキーボード 青軸", "fr": "Clavier Mécanique Switch Bleu"},
        {"en": "Smartphone 128GB Black", "es": "Teléfono Inteligente 128GB Negro", "ja": "スマートフォン 128GB ブラック", "fr": "Smartphone 128Go Noir"},
        {"en": "4K Ultra HD Smart TV", "es": "Smart TV 4K Ultra HD", "ja": "4K Ultra HD スマートテレビ", "fr": "Smart TV 4K Ultra Haute Définition"},
        {"en": "Ergonomic Office Chair Mesh", "es": "Silla de Oficina Ergonómica Malla", "ja": "人間工学 オフィスチェア メッシュ", "fr": "Chaise de Bureau Ergonomique Maille"},
        {"en": "Bluetooth Speaker Waterproof", "es": "Altavoz Bluetooth Impermeable", "ja": "防水 Bluetooth スピーカー", "fr": "Enceinte Bluetooth Imperméable"},
        {"en": "Running Shoes Men Size 10", "es": "Zapatillas de Running Hombre Talla 10", "ja": "ランニングシューズ メンズ サイズ10", "fr": "Chaussures de Course Homme Taille 10"},
        {"en": "Stainless Steel Water Bottle 32oz", "es": "Botella de Agua de Acero Inoxidable 32oz", "ja": "ステンレス水筒 32オンス", "fr": "Bouteille Eau Acier Inoxydable 32oz"},
        {"en": "Virtual Reality Headset Pro", "es": "Gafas de Realidad Virtual Pro", "ja": "バーチャルリアリティヘッドセット Pro", "fr": "Casque Réalité Virtuelle Pro"},
    ]
    
    # Categories mapped to clusters roughly
    categories = [
        "Electronics", "Audio", "Computers", "Mobiles", "TV/Video",
        "Furniture", "Audio", "Apparel", "Kitchen", "Gaming"
    ]
    
    for idx, base in enumerate(base_products):
        cat = categories[idx]
        
        # 1. Exact Match (EN)
        data.append({"id": _id, "name": base["en"], "language": "en", "category": cat, "duplicate_type": "Original", "cluster_id": cluster_id})
        _id += 1
        
        # 2. Translated (ES)
        data.append({"id": _id, "name": base["es"], "language": "es", "category": cat, "duplicate_type": "Exact Translation", "cluster_id": cluster_id})
        _id += 1
        
        # 3. Translated (JA)
        data.append({"id": _id, "name": base["ja"], "language": "ja", "category": cat, "duplicate_type": "Exact Translation", "cluster_id": cluster_id})
        _id += 1
        
        # 4. Translated (FR)
        data.append({"id": _id, "name": base["fr"], "language": "fr", "category": cat, "duplicate_type": "Exact Translation", "cluster_id": cluster_id})
        _id += 1
        
        # 5. Typo in EN
        typo_en = base["en"].replace(" ", "", 1) # remove first space
        if len(base["en"]) > 5:
            # swap two chars
            i = len(base["en"]) // 2
            typo_en = base["en"][:i-1] + base["en"][i] + base["en"][i-1] + base["en"][i+1:]
        data.append({"id": _id, "name": typo_en, "language": "en", "category": cat, "duplicate_type": "Typo", "cluster_id": cluster_id})
        _id += 1
        
        # 6. Abbreviation/Phonetic
        short_en = base["en"].replace("Gaming", "Gmn").replace("Wireless", "Wirelss").replace("Smartphone", "Smartfone")
        data.append({"id": _id, "name": short_en, "language": "en", "category": cat, "duplicate_type": "Abbreviation/Phonetic", "cluster_id": cluster_id})
        _id += 1
        
        cluster_id += 1

    # Add some random noise records
    noise_items = [
        "Generic USB Cable 1m", "Mousepad Standard Size", "AA Batteries 4-Pack",
        "Monitor Stand Riser", "Desk Lamp LED", "Cable Ties 100pcs"
    ]
    for noise in noise_items:
        data.append({"id": _id, "name": noise, "language": "en", "category": "Accessories", "duplicate_type": "Unique", "cluster_id": cluster_id})
        _id += 1
        cluster_id += 1
        
    # Scale up dataset to ~100 records by doing slightly modified variants
    import uuid
    for i in range(40):
        base_choice = random.choice(base_products)
        cat = "Mixed"
        lang = random.choice(["en", "es", "ja", "fr"])
        text = base_choice[lang]
        
        if random.random() > 0.5:
            text = text.lower() + " " + str(random.randint(2022, 2024))
            dtype = "Formatting"
        else:
            text = "Buy " + text + " Cheap"
            dtype = "SEO Spam"
            
        # We don't guarantee strict cluster ID here, just creating raw inputs
        data.append({"id": _id, "name": text, "language": lang, "category": cat, "duplicate_type": dtype, "cluster_id": -1})
        _id += 1

    df = pd.DataFrame(data)
    # Shuffle
    df = df.sample(frac=1, random_state=42).reset_index(drop=True)
    
    # Save
    df.to_csv("ecommerce_multilingual.csv", index=False)
    print(f"Generated {len(df)} records in ecommerce_multilingual.csv")

if __name__ == "__main__":
    generate_ecommerce_dataset()
