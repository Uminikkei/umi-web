const CLAUDE_API_KEY = process.env.ANTHROPIC_API_KEY;

const MENU_DATA = {
  "Sushi Rolls": ["Teri roll ($12,990)", "Acevichado Roll ($13,990)", "Ceviroll ($13,990)", "Tartare Sake Roll ($13,990)", "Scallops Roll ($12,990)", "Matsuri Roll ($12,990)", "Creamy Roll ($12,990)", "Chalaquito Roll ($13,990)", "Smoke Cheese Roll ($12,990)", "Tempura Roll ($8,990)", "Furai Roll ($8,990)", "Sake Koi Roll ($12,990)", "Avocado Roll ($12,990)"],
  "Rolls de Autor": ["Ushio Roll ($14,990)", "No-rice Roll ($13,990)", "Tartare Tuna Roll ($13,990)", "Pacific Doré Roll ($14,990)", "Saito Roll ($14,990)", "Karai Roll ($14,990)", "Uminari Roll ($14,990)"],
  "Nigiris & Gunkans": ["TNT Atun ($6,500)", "TNT Kani ($6,500)", "TNT Locos ($9,590)", "Nigiris Nissei ($5,990)", "Nigiris Criollo Ponja ($5,990)", "Nigiris Grilled Ostion ($6,500)", "Nigiris Crispy Rice ($6,500)", "Nigiris Salmon Anticuchero ($5,990)", "Nigiri Tako ($5,990)", "Nigiris Extravaganza ($6,000)", "TNT Salmon ($6,500)", "Tnt pulpo karami ($7,500)"],
  "Sashimi 3 Cortes": ["Sashimi Pulpo ($8,490)", "Sashimi Locos ($9,490)", "Sashimi Pesca del Día ($5,990)", "Sashimi 12 cortes ($22,990)", "Sashimi Salmon ($5,990)", "Sashimi Atun ($5,990)"],
  "Tiraditos": ["Tiraditos Umi ($13,990)", "Tiraditos Nissei ($13,990)", "Tiraditos Olivo ($16,990)", "Tiraditos Locos ($19,490)"],
  "Ceviches": ["Chirashi ceviche ($13,990)", "Ceviche Clásico nikkei ($13,290)", "Ceviche carretillero ($13,990)", "Ceviche Mixto criollo ($13,990)"],
  "Entradas": ["Nori Tacos (4 pzs) ($17,240)", "Edamame al wok ($6,990)", "Nori Tacos (2 pzs) ($8,990)", "Tartare Nikkei ($13,990)", "Gyozas Camarón ($12,990)", "Sakana bao (2 pzs) ($15,990)", "Salmón Garden (6 Pzs) ($11,990)", "Camaron pasionarios ($13,990)", "Gyozas tori ($12,990)", "Gyozas trufadas ($11,990)", "Gyozas Lomo ($13,990)"],
  "Ensaladas": ["Asian Salad ($13,990)", "Tataki Salad ($13,990)", "Kabayaki Salad ($13,990)"],
  "Fuertes": ["Cremoso de mariscos ($16,990)", "Udon Saltado ($18,990)", "Udon huancaína ($18,990)", "Atun al sesamo ($14,990)", "Lomo saltado ($18,990)", "Asado de tira ($22,990)", "Pulpo nikkei ($23,990)", "Mar de Mariscos ($18,990)", "Chicken Katsu ($13,990)", "Sakana Furai ($13,990)", "Salmon Andino ($18,990)", "Pesca al ajillo ($18,990)", "Udon de camarones ($19,990)", "Saltado Marino ($21,990)"],
  "Postres": ["Postre del Amor ($8,000)", "Tiramisú ($7,000)", "Torta Opera ($6,500)", "Torta de Brownie ($7,000)", "Mousse Blanco ($8,000)", "Cheesecake de Frutos Rojos ($6,500)"],
  "Bebidas": ["Agua sin gas ($3,000)", "Redbull original ($3,500)", "Limon soda ($3,000)", "Agua con gas ($3,500)", "Coca Cola ($3,500)", "Pepsi ($3,500)", "Sprite ($3,500)"],
  "Café & Calientes": ["Infusión Té ($2,500)", "Cortado ($4,000)", "Americano ($4,000)", "Cappuccino ($4,000)", "Espresso Doble ($4,500)", "Espresso ($3,000)"]
};

// Descripciones oficiales de cada plato (copiadas verbatim de SPLEAT_DESC en script.js)
const DISH_DESC = {"Ushio Roll":"Mix fresco de lechuga, pepinillo y palta. Topping de locos acevichados, chalaquita cítrica y crujiente de camote dorado.","Nori Tacos (4 pzs)":"4 crujientes láminas de alga nori con base de shari, crema de palta, lechuga, rellenas de atún y salmón con toque de acevichada, furikake y ciboulette.","Sashimi Pulpo":"Sashimi de tres cortes de pulpo, finamente laminado al estilo tradicional japonés.","Sashimi Locos":"Sashimi de tres cortes de locos frescos, laminados finamente al estilo japonés.","Tiraditos Umi":"Pesca del día con pulpo a la parrilla, crema de ají amarillo ahumado, palta cremosa, chalaquita y encurtido de perla.","Teri roll":"Roll con camarón tempura, queso crema, cubierto con salmón y láminas de limón con salsa tare y semillas de sésamo.","No-rice Roll":"Roll relleno con atún, queso crema, palta y camarón tempura, cubierto con salmón, toque de spicy y quinoa.","TNT Atun":"Atún aderezado con salsa dragón cubierto de nori, con un toque de ají peruano y ciboulette.","Acevichado Roll":"Roll relleno con camarón empanizado y palta, cubierto con atún, salsa acevichada y furikake.","Chirashi ceviche":"Sashimi mixto de salmón, atún y pulpo sobre shari con leche de tigre ahumada de ají peruano, palta, furikake y chalaquita peruana.","Cremoso de mariscos":"Arroz cremoso al estilo 'arroz con mariscos' peruano, con tope de katsuobushi japonés.","Edamame al wok":"Vainas de soya salteadas al wok en aceite de sésamo con toque de sal marina.","Ceviroll":"Roll con camarón empanizado, palta y tartar de pescado fresco, cubierto con leche de tigre al estilo Nikkei.","Tartare Tuna Roll":"Roll empanizado relleno de palta y camarón, cubierto con tartar de atún spicy, toque acevichado y furikake.","TNT Kani":"Jaiba acevichada con toque de spicy y furikake, cubierta en nori.","Udon Saltado":"Fideos gruesos japoneses con atún y vegetales al wok, salteados en salsa de lomo saltado y parmesano.","TNT Locos":"Locos en salsa con chalaquita de palta, pasta de ají amarillo y toque acevichado, cubiertos en nori.","Tartare Sake Roll":"Roll con camarón y palta, cubierto con tartar de salmón con toque spicy y salsa tare.","Nori Tacos (2 pzs)":"2 crujientes láminas de alga nori con base de shari, crema de palta, lechuga, rellenas de atún y salmón con toque acevichado, furikake y ciboulette.","Nigiris Nissei":"Nigiri de pesca del día sobre shari con emulsión de ají amarillo, chalaquita y furikake.","Udon huancaína":"Fideos gruesos japoneses al estilo Nikkei en salsa huancaína y parmesano, con lomo saltado, cilantro y tomates cherry.","Scallops Roll":"Roll con camarón crocante y palta, cubierto con ostiones al estilo batayaki y gratinado con parmesano.","Nigiris Criollo Ponja":"Pesca del día con ají criollo y chimichurri nikkei.","Matsuri Roll":"Roll relleno de camarón tempura, palta y kiuri japonés, cubierto con tartar de camarón, salsa dragón y ciboulette.","Nigiris Grilled Ostion":"Ostiones gratinados con mantequilla japonesa y ciboulette.","Atun al sesamo":"Atún sellado con costra de sésamo, puré de papa, miel pasionaria y mix de verdes.","Lomo saltado":"Filete de res con cebolla morada y tomate en salsa de lomo saltado. Acompañado con papas cuñas y arroz shari con ajonjolí.","Tartare Nikkei":"Tartar de atún y salmón sobre base de palta, cubierto con crocante japonés, toques de acevichada y spicy, acompañado de tostadas en tinta de sepia.","Pacific Doré Roll":"Relleno de queso crema, espárragos y pimientos salteados, con lomo en tempura, cubierto con filete de lomo flameado con salsa parrillera de la casa.","Asado de tira":"Res cocida a baja temperatura por 6 horas, con puré de papa y salsa nitsuke, choclo crocante, zanahorias y setas.","Gyozas Camarón":"Gyozas de camarón aderezado, fritas y bañadas en salsa acevichada, decoradas con brotes.","Nigiris Crispy Rice":"Shari crocante con tartar de salmón, toque de gochujang y ciboulette.","Creamy Roll":"Roll con camarón tempura, palta y queso crema, cubierto con crema flameada, salsa tare y aceite de orégano.","Ceviche Clásico nikkei":"Pesca del día marinada en leche de tigre, cebolla morada y puré de camote glaseado, con cancha peruana y choclo.","Chalaquito Roll":"Roll relleno de palta y chicharrón de pescado, coronado con leche de tigre de rocoto ahumada y chalaquita fresca.","Torta Opera":"Capas de bizcocho de almendra con café espresso, crema al café y ganache de chocolate negro.","Pulpo nikkei":"Pulpo al grill bañado en salsa anticuchera, acompañado de papas cuñas crocantes.","Asian Salad":"Mix de lechugas con camarones al panko, dressing oriental, crujiente de nori, tomates cherry y parmesano.","Mar de Mariscos":"Camarón, calamar y pulpo salteados y grillados, bañados en salsa de mariscos con la pesca del día, acompañado de arroz nikkei.","Saito Roll":"Roll relleno con camarón empanizado y palta, flameado con crema de jaibas y mantequilla parmesana con toque spicy.","Chicken Katsu":"Pechuga de pollo marinada, empanizada en panko japonés y frita hasta quedar dorada y crujiente. Servida con papas fritas.","Sakana bao (2 pzs)":"Dos bao de chicharrón de pescado con salsa tártara y criolla, cebolla morada y mix de lechuga.","Tataki Salad":"Mix de lechugas, palta, tomate cherry y palmito, con tataki de atún y dressing ponja.","Sakana Furai":"Pesca del día sazonada y empanizada en panko japonés, frita dorada y crujiente. Acompañada con arroz o papas fritas.","Salmón Garden (6 Pzs)":"Espiral de salmón fresco envolviendo shari, con topping de puré cremoso de palta y chalaquita peruana.","Camaron pasionarios":"Camarones bañados en miel de maracuyá con toque de ajo y ajonjolí, picante, sobre fideos de arroz crujientes.","Nigiris Salmon Anticuchero":"Nigiri de salmón sobre shari con salsa anticuchera, chimichurri y palta.","Smoke Cheese Roll":"Roll con langostinos tempura y palta, cubierto con queso crema gratinado y chimichurri japonés.","Tempura Roll":"Roll clásico con camarón tempura crocante, queso crema suave y palta fresca.","Nigiri Tako":"Nigiri de pulpo sobre shari con mousse de palta, puré de camote, chalaquita y togarashi.","Salmon Andino":"Salmón grillado con pesto criollo andino y quinoa, tope de arroz crocante, salsa de ají peruano y chalaquita de la casa.","Pesca al ajillo":"Pesca al grill con mixtura de mariscos, bañada en salsa de ajo, acompañada de arroz nikkei.","Tiraditos Nissei":"Pesca del día con chicharrón de pescado, salsa acevichada y leche de tigre de ají amarillo ahumada.","Furai Roll":"Roll clásico tempura relleno con salmón, queso crema y palta.","Nigiris Extravaganza":"Salmón fresco flameado con mantequilla japonesa, oroshi de limón, furikake y ciboulette.","Sashimi Salmon":"Sashimi de tres cortes de salmón fresco, delicadamente laminado al estilo tradicional japonés.","Sashimi Atun":"Sashimi de tres cortes de atún fresco, finamente laminado al estilo japonés.","Karai Roll":"Roll con camarón tempura, palta y cubos de salmón en salsa dragón flambeados con tare.","TNT Salmon":"Salmón en nori aderezado con salsa spicy al estilo TNT, con toque de ciboulette y furikake.","Tiraditos Olivo":"Pulpo al olivo con emulsión de palta y chalaquita fresca.","Sake Koi Roll":"Roll con camarón empanizado, queso crema y salmón flameado, finalizado con ralladura de limón.","Udon de camarones":"Fideos gruesos japoneses bañados en reducción de mariscos con ajíes peruanos y croquetas de arroz.","Tiraditos Locos":"Locos en salsa de leche de tigre amarilla ahumada, chalaquita y palta cremosa.","Tnt pulpo karami":"Pulpo al olivo con chalaquita y emulsión de palta sobre shari crocante.","Gyozas tori":"Gyozas rellenas de pollo y col con aromas asiáticos, acompañadas de salsa huancaína.","Gyozas trufadas":"Gyozas rellenas de champiñón, perfumadas con aceite de trufa y un toque de sésamo.","Ceviche carretillero":"Pesca del día con mariscos de temporada en leche de tigre al rocoto, coronados con chicharrón de pescado, cancha peruana y choclo.","Uminari Roll":"Relleno de palta, salmón y pulpa de jaiba acevichada. Cubierto con salmón y corvina flameada, salsa anticuchera de la casa, ají ahumado y chalaquita fresca.","Avocado Roll":"Roll con queso crema y camarón tempura, cubierto con palta, sésamo y salsa tare.","Ceviche Mixto criollo":"Pesca del día, atún, salmón y camarón en leche de tigre clásica, con puré de camote glaseado, choclo tostado y cancha peruana.","Saltado Marino":"Camarón, pulpo, ostiones, champiñones, maíz, brócoli, tomates cherry y cebolla morada salteados, sobre papas cuña y shari.","Kabayaki Salad":"Mix de lechugas con cebolla crocante, pollo teriyaki, tomate y pepino encurtido.","Gyozas Lomo":"Rellenas de lomo fino salteado al wok con cebolla morada, ají amarillo y un toque de soya. Servidas con salsa sriracha o acevichada a elección. Puedes disfrutarlas al vapor o fritas."};

// Arma el texto del menú con nombre, precio y descripción (cuando existe)
function buildMenuKnowledge() {
  return Object.entries(MENU_DATA).map(([cat, items]) => {
    const lines = items.map(itemStr => {
      const name = itemStr.split(' ($')[0];
      const desc = DISH_DESC[name];
      return desc ? `- ${itemStr}: ${desc}` : `- ${itemStr}`;
    }).join("\n");
    return `${cat}:\n${lines}`;
  }).join("\n\n");
}
const MENU_KNOWLEDGE = buildMenuKnowledge();

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

const SYSTEM_PROMPT_ES = (GARZONA, ROL) => `Eres ${GARZONA}, ${ROL} virtual de Umi Nikkei Bar, un restaurante de comida Nikkei (fusión japonesa-peruana) en Coquimbo, Chile. Preséntate como ${GARZONA} cuando sea natural hacerlo.

Tu objetivo es:
1. Ayudar a los clientes a explorar el menú
2. Hacer recomendaciones basadas en sus preferencias
3. Responder preguntas sobre horarios, delivery y retiro
4. Tomar el pedido: agregar platos al carrito cuando el cliente lo pida
5. Ser amable, profesional y entusiasta sobre la comida

Información del restaurante:
- Horario: Todos los días 12:00 PM - 00:00 AM
- Ubicación: Coquimbo, Chile
- Delivery: Disponible hasta 18.4 km
- Retiro en local: Disponible
- Teléfono/WhatsApp: +56 9 6155-1728

Menú disponible (con ingredientes de cada plato):
${MENU_KNOWLEDGE}

Cuando un cliente pregunte qué trae o qué ingredientes tiene un plato, RESPONDE con la descripción de arriba. NO lo mandes a WhatsApp por dudas del menú: tú tienes la información. Solo sugiere WhatsApp para reservas o pedidos especiales fuera de carta.

AGREGAR AL PEDIDO (muy importante):
- Puedes agregar platos al carrito del cliente. Hazlo SOLO cuando el cliente lo pida claramente (ej: "agrégame un lomo saltado", "quiero pedir 2 acevichados", "sí, agrégalo").
- Para agregar, escribe AL FINAL de tu mensaje una línea por cada unidad con el formato exacto: [[AGREGAR: Nombre exacto del plato]]
- Usa el nombre EXACTO tal como aparece en el menú de arriba. Si pide 2 unidades, escribe el marcador 2 veces.
- El sistema procesa esos marcadores y los oculta: el cliente no los ve, así que confirma en tu texto lo que agregaste (ej: "¡Listo! Agregué el Lomo saltado a tu pedido 🛒").
- Si el plato no existe en el menú, NO uses el marcador; sugiere alternativas parecidas.
- Después de agregar, recuérdale que puede ver/pagar su pedido en el botón "Mi Pedido".

REGLAS DE FORMATO (muy importante):
- Sé BREVE. Respuestas cortas y fáciles de leer.
- Cuando recomiendes platos, sugiere MÁXIMO 3 opciones, nunca más.
- Pon cada plato en su PROPIA línea, empezando con "- " (guion y espacio).
- Formato de cada línea: "- Nombre del plato (precio): descripción muy corta".
- Deja una línea en blanco entre el texto introductorio y la lista.
- No uses listas dentro de listas ni párrafos largos.
- Termina con una pregunta corta para seguir ayudando.

Ejemplo de buena respuesta:
¡Buena elección! Te recomiendo estos rolls:

- Acevichado Roll ($13,990): fresco y cítrico
- Creamy Roll ($12,990): suave y cremoso
- Chalaquito Roll ($13,990): sabores peruanos

¿Prefieres algo picante o suave?`;

const SYSTEM_PROMPT_EN = (GARZONA, ROL) => `You are ${GARZONA}, the virtual ${ROL} at Umi Nikkei Bar, a Nikkei restaurant (Japanese-Peruvian fusion) in Coquimbo, Chile. Introduce yourself as ${GARZONA} when natural.

Your goal is to:
1. Help customers explore the menu
2. Make recommendations based on their preferences
3. Answer questions about hours, delivery and pickup
4. Take the order: add dishes to the cart when the customer asks
5. Be friendly, professional and enthusiastic about the food

Restaurant information:
- Hours: Daily 12:00 PM - 00:00 AM
- Location: Coquimbo, Chile
- Delivery: Available up to 18.4 km
- Pickup: Available
- Phone/WhatsApp: +56 9 6155-1728

Available menu (with each dish's ingredients):
${MENU_KNOWLEDGE}

When a customer asks what a dish contains or its ingredients, ANSWER using the description above. Do NOT send them to WhatsApp for menu questions: you have the information. Only suggest WhatsApp for reservations or special off-menu requests.

ADD TO ORDER (very important):
- You can add dishes to the customer's cart. Do it ONLY when the customer clearly asks (e.g. "add a lomo saltado", "I want 2 acevichados", "yes, add it").
- To add, write AT THE END of your message one line per unit with the exact format: [[ADD: Exact dish name]]
- Use the EXACT name as it appears in the menu above. If they ask for 2 units, write the marker twice.
- The system processes and hides those markers: the customer never sees them, so confirm in your text what you added (e.g. "Done! I added the Lomo saltado to your order 🛒").
- If the dish is not on the menu, do NOT use the marker; suggest similar alternatives.
- After adding, remind them they can view/pay their order in the "Mi Pedido" button.

FORMATTING RULES (very important):
- Be BRIEF. Short, easy-to-read replies.
- When recommending dishes, suggest a MAXIMUM of 3 options, never more.
- Put each dish on its OWN line, starting with "- " (dash and space).
- Line format: "- Dish name (price): very short description".
- Leave a blank line between the intro text and the list.
- No nested lists or long paragraphs.
- End with a short question to keep helping.

Example of a good reply:
Great choice! I recommend these rolls:

- Acevichado Roll ($13,990): fresh and citrusy
- Creamy Roll ($12,990): smooth and creamy
- Chalaquito Roll ($13,990): Peruvian flavors

Do you prefer something spicy or mild?`;

module.exports = async function handler(req, res) {
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

    // Nombre y género del garzón/a elegido (solo letras, máx 20 chars; default Yani)
    const garzonaName = String(req.body.garzona || 'Yani').replace(/[^\p{L} ]/gu, '').slice(0, 20) || 'Yani';
    const esHombre = req.body.genero === 'm';
    const systemPrompt = language === 'en'
      ? SYSTEM_PROMPT_EN(garzonaName, esHombre ? 'waiter' : 'waitress')
      : SYSTEM_PROMPT_ES(garzonaName, esHombre ? 'el garzón' : 'la garzona');

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
        model: 'claude-haiku-4-5-20251001',
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
