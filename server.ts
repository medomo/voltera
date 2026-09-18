import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Security hardening
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  app.use(express.json({ limit: '10mb' }));

  // API Health Check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // AI Alley Detection Endpoint
  app.post('/api/ai/detect-alleys', async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY is missing' });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const { mapCenter, bounds, imageBase64 } = req.body;

      const lat = mapCenter?.lat || 31.95;
      const lng = mapCenter?.lng || 35.91;
      const north = bounds?.north || lat + 0.003;
      const south = bounds?.south || lat - 0.003;
      const east = bounds?.east || lng + 0.003;
      const west = bounds?.west || lng - 0.003;

      const promptText = `أنت خبير مساح جغرافي ذكي متخصص في تحليل صور خرائط جوجل والأقمار الصناعية (Google Maps Satellite View & Visual Path Extraction).

إذا تم إرفاق صورة جوية أو صورة لقطة شاشة لخرائط جوجل (مضبوطة على العرض الفضائي Satellite):
1. قم بتحليل الطرق المائية والترابية والرمادية والأزقة الضيقة (Side streets, alleys, dirt tracks) الظاهرة باللون الرمادي أو الترابي بين المباني والفلل والمحلات (مثل المناطق المحيطة بـ "محطة بيت الشاطبي للغاز"، "فلة عبدالله مسعد عطية"، "منزل عبدالله عبد العليم الحميدي"، "طريق 90 متر"، إلخ).
2. قم بتعقب مسارات تلك الشوارع الفرعية والأزقة بدقة متناهية وترجمتها إلى خطوط متعددة النقاط (Polylines) من إحداثيات (lat, lng).
3. استخرج من 3 إلى 8 أزقة أو شوارع فرعية ترابية وضيقة واضحة في الصورة، وسمّها بأسماء واضحة تصف موقعها (مثل: "طريق محطة بيت الشاطبي الفرعي"، "زقاق الفلل الخلفي"، "ممر أنس المؤيد الترابي"، "شارع الخدمة الموازي للطريق الرئيسي"، إلخ).

إذا لم ترفق صورة، استخدم النطاق الجغرافي المحدد:
- المركز: [${lat}, ${lng}]
- الحدود: شمال [${north}]، جنوب [${south}]، شرق [${east}]، غرب [${west}]

المطلوب إرجاعه لكل زقاق أو شارع فرعي:
- id: معرف فريد
- name: اسم الشارع/الزقاق باللغة العربية
- type: 'alley' | 'dirt_path' | 'side_street' | 'shortcut'
- confidence: نسبة الثقة من 85 إلى 99
- description: وصف تحليلي لفائدة هذا الشارع الفرعي والاختصار الذي يوفره للسيارات أو الماشين أو الدراجات
- path: قائمة إحداثيات متتالية [[lat, lng], [lat, lng], ...] تمثل مسار الشارع بالضبط.

قم بإرجاع النتيجة بتنسيق JSON فقط مطابق للشكل المحدد.`;

      const contentsParts: any[] = [];

      if (imageBase64 && typeof imageBase64 === 'string') {
        const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
        contentsParts.push({
          inlineData: {
            mimeType: 'image/png',
            data: cleanBase64,
          },
        });
      }

      contentsParts.push({ text: promptText });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: contentsParts },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              alleys: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    name: { type: Type.STRING },
                    type: {
                      type: Type.STRING,
                      description: 'alley | dirt_path | side_street | shortcut',
                    },
                    confidence: { type: Type.NUMBER },
                    description: { type: Type.STRING },
                    path: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.ARRAY,
                        items: { type: Type.NUMBER },
                        description: '[latitude, longitude]',
                      },
                    },
                  },
                  required: ['id', 'name', 'type', 'confidence', 'description', 'path'],
                },
              },
            },
            required: ['alleys'],
          },
        },
      });

      const responseText = response.text || '{}';
      const parsed = JSON.parse(responseText);

      return res.json(parsed);
    } catch (err: any) {
      console.error('Error in AI Alley Detection:', err);
      return res.status(500).json({
        error: 'Failed to analyze satellite imagery for alleys',
        details: err?.message || String(err),
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production bundled CJS, __dirname is the directory containing server.cjs (inside dist/) or root
    const distPath = typeof __dirname !== 'undefined'
      ? (path.basename(__dirname) === 'dist' ? __dirname : path.join(__dirname, 'dist'))
      : path.join(process.cwd(), 'dist');

    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
