# App Meteorología - MeteoPlus

## Descripción
Aplicación web moderna de clima usando **Open-Meteo API** (gratuita, sin key). 

**Características:**
- Búsqueda de ciudades (prioriza Chile para 'Santiago').
- 📍 Geolocalización actual.
- Pronóstico actual, por horas (24h), 5 días.
- 🌙 Modo oscuro/claro (persiste).
- Fondos dinámicos por clima, animaciones.
- Responsive/mobile.

## Archivos
````
.
├── index.html     # Estructura + particles canvas
├── css/style.css  # Estilos modernos, temas, animaciones
├── js/app.js      # Lógica API, render, geoloc
└── README.md      # Este archivo
````

## Cómo ejecutar
1. Abre terminal en `c:/Users/RSmar/OneDrive/Desktop/app meteorologia`
2. `python -m http.server 8000`
3. Abre http://localhost:8000
4. Busca ciudad, 📍 ubicación, alterna 🌙/☀️.

¡Funciona offline para UI, online para API!

Desarrollado con BLACKBOXAI.
