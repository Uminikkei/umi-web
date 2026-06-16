const CLAUDE_API_KEY = process.env.ANTHROPIC_API_KEY;

const MENU_DATA = {
  "Sushi Rolls": ["Teri roll ($12,990)", "Acevichado Roll ($13,990)", "Ceviroll ($13,990)", "Tartare Sake Roll ($13,990)", "Scallops Roll ($12,990)", "Matsuri Roll ($12,990)", "Creamy Roll ($12,990)", "Chalaquito Roll ($13,990)", "Smoke Cheese Roll ($12,990)", "Tempura Roll ($8,990)", "Furai Roll ($8,990)", "Sake Koi Roll ($12,990)", "Avocado Roll ($12,990)"],
  "Rolls de Autor": ["Ushio Roll ($14,990)", "No-rice Roll ($13,990)", "Tartare Tuna Roll ($13,990)", "Pacific Doré Roll ($14,990)", "Saito Roll ($14,990)", "Karai Roll ($14,990)", "Uminari Roll ($14,990)"],
  "Nigiris & Gunkans": ["TNT Atun ($6,500)", "TNT Kani ($6,500)", "TNT Locos ($9,590)", "Nigiris Nissei ($5,990)", "Nigiris Criollo Ponja ($5,990)", "Nigiris Grilled Ostion ($6,500)", "Nigiris Crispy Rice ($6,500)", "Nigiris Salmon Anticuchero ($5,990)", "Nigiri Tako ($5,990)", "Nigiris Extravaganza ($6,000)", "TNT Salmon ($6,500)", "Tnt pulpo karami ($7,500)"],
  "Sashimi 3 Cortes": ["Sashimi Pulpo ($8,490)", "Sashimi Locos ($9,490)", "Sashimi Pesca del Día ($5,990)", "Sashimi 12 cortes ($22,990)", "Sashimi Salmon ($5,990)", "Sashimi Atun ($5,990)"],
  "Tiraditos": ["Tiraditos Umi ($13,990)", "Tiraditos Nissei ($13,990)", "Tiraditos Olivo ($16,990)", "Tiraditos Locos ($19,490)"],
  "Ceviches": ["Chirashi ceviche ($13,990)", "Ceviche Clásico nikkei ($13,290)", "Ceviche carretillero ($13,990)", "Ceviche Mixto criollo ($13,990)"],
  "Entradas": ["Nori Tacos (4 pzs) ($17,240)", "Edamame al wok ($6,990)", "Nori Tacos (2 pzs) ($8,990)", "Tartare Nikkei ($13,990)", "Gyozas Camarón ($12,990)", "Sakana bao (2 pzs) ($15,990)", "Salmón Garden (6 Pzs) ($11,990)", "Camaron pasionarios ($13,990)", "Gyozas tori ($12,990)", "Gyozas trufadas ($11,990)"],
  "Ensaladas": ["Asian Salad ($13,990)", "Tataki Salad ($13,990)", "Kabayaki Salad ($13,990)"],
  "Fuertes": ["Cremoso de mariscos ($16,990)", "Udon Saltado ($18,990)", "Udon huancaína ($18,990)", "Atun al sesamo ($14,990)", "Lomo saltado ($18,990)", "Asado de tira ($22,990)", "Pulpo nikkei ($23,990)", "Mar de Mariscos ($18,990)", "Chicken Katsu ($13,990)", "Sakana Furai ($13,990)", "Salmon Andino ($18,990)", "Pesca al ajillo ($18,990)", "Udon de camarones ($19,990)", "Saltado Marino ($21,990)"],
  "Postres": ["Postre del Amor ($8,000)", "Tiramisú ($7,000)", "Torta Opera ($6,500)", "Torta de Brownie ($7,000)", "Mousse Blanco ($8,000)", "Cheesecake de Frutos Rojos ($6,500)"],
  "Bebidas": ["Agua sin gas ($3,000)", "Redbull original ($3,500)", "Limon soda ($3,000)", "Agua con gas ($3,500)", "Coca Cola ($3,500)", "Pepsi ($3,500)", "Sprite ($3,500)"],
  "Café & Calientes": ["Infusión Té ($2,500)", "Cortado ($4,000)", "Americano ($4,000)", "Cappuccino ($4,000)", "Espresso Doble ($4,500)", "Espresso ($3,000)"]
};

const RESTAURANT_INFO = {
  name: "Umi Nikkei Bar",
  location: "Coquimbo, Chile",
  hours: "Todos los días 12:00 PM - 00:00 AM",
  phone: "+56 9 6155-1728",
  whatsapp: "https://wa.me/56961551728",
  delivery: {
    maxKm: 18.4,
    tiers: [
      { km: 3.4, price: 2500 },
      { km: 4.4, price: 3000 },
      { km: 5.4, price: 3500 },
      { km: 6.4, price: 4000 },
      { km: 7.4, price: 4500 },
      { km: 8.4, price: 5000 },
      { km: 9.4, price: 5500 },
      { km: 10.4, price: 6000 }
    ]
  }
};

const SYSTEM_PROMPT_ES = `Eres un mesonero profesional y amable de Umi Nikkei Bar, un restaurante de comida Nikkei (fusión japonesa-peruana) en Coquimbo, Chile.

Tu objetivo es:
1. Ayudar a los clientes a explorar el menú
2. Hacer recomendaciones basadas en sus preferencias
3. Responder preguntas sobre horarios, delivery y retiro
4. Ser amable, profesional y entusiasta sobre la comida

Información del restaurante:
- Horario: Todos los días 12:00 PM - 00:00 AM
- Ubicación: Coquimbo, Chile
- Delivery: Disponible hasta 18.4 km
- Retiro en local: Disponible
- Teléfono/WhatsApp: +56 9 6155-1728

Menú disponible:
${Object.entries(MENU_DATA).map(([cat, items]) => `${cat}: ${items.join(", ")}`).join("\n")}

Sé conciso, amable y siempre ofrece ayuda para hacer pedidos.`;

const SYSTEM_PROMPT_EN = `You are a professional and friendly waiter at Umi Nikkei Bar, a Nikkei restaurant (Japanese-Peruvian fusion) in Coquimbo, Chile.

Your goal is to:
1. Help customers explore the menu
2. Make recommendations based on their preferences
3. Answer questions about hours, delivery and pickup
4. Be friendly, professional and enthusiastic about the food

Restaurant information:
- Hours: Daily 12:00 PM - 00:00 AM
- Location: Coquimbo, Chile
- Delivery: Available up to 18.4 km
- Pickup: Available
- Phone/WhatsApp: +56 9 6155-1728

Available menu:
${Object.entries(MENU_DATA).map(([cat, items]) => `${cat}: ${items.join(", ")}`).join("\n")}

Be concise, friendly and always offer help to place orders.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!CLAUDE_API_KEY) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const { message, language = 'es', conversationHistory = [] } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const systemPrompt = language === 'en' ? SYSTEM_PROMPT_EN : SYSTEM_PROMPT_ES;

    const messages = [
      ...conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      {
        role: 'user',
        content: message
      }
    ];

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 500,
        system: systemPrompt,
        messages: messages
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[CHAT] Claude API error:', errorData);
      return res.status(500).json({ error: 'Failed to get response from AI' });
    }

    const data = await response.json();
    const assistantMessage = data.content[0].text;

    return res.status(200).json({
      message: assistantMessage,
      conversationHistory: [
        ...messages,
        {
          role: 'assistant',
          content: assistantMessage
        }
      ]
    });
  } catch (error) {
    console.error('[CHAT] Error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
