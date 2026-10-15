# Hand Gesture 3D - Computer Vision & 3D Web App

Real vaqt rejimida veb-kamera orqali foydalanuvchining qo'l harakatlari va barmoq jestlarini (Hand Tracking & Gesture Recognition) aniqlab, ekranda 3D geometrik figuralarni (Kub, Piramida, Silindr, Sfera, Torus) aks ettiruvchi va ular bilan interaktiv o'zaro ta'sirlashuvchi zamonaviy veb-ilova.

---

## 🚀 Texnologiyalar Stacki

- **Three.js (WebGL)**: 3D sahnani chizish, geometriyalar (Box, Cone, Cylinder, Icosahedron, Torus), fizik va shaffof materiallar (`MeshPhysicalMaterial`), dinamik nur effektlari va zarrachalar (Particle Field).
- **Google MediaPipe Hands**: Real vaqt rejimida 21 ta qo'l nuqtalarini (landmarks) aniqlash, ko'p qo'lli kuzatuv, barmoqlar holatini hisoblash.
- **HTML5 & CSS3**: Zamonaviy futuristik Glassmorphism va Cyberpunk Dark HUD uslubidagi interfeys, PiP (Picture-in-Picture) video rejim, neon effektlar.
- **Web Audio API**: Figuralar o'zgarganda va jestlar bajarilganda ishlaydigan procedural ovoz effektlari (Sintizator).

---

## 🖐️ Barmoq Jestlari va Funksiyalar

| Jest / Barmoqlar | Natija / Figura | Tavsif |
|---|---|---|
| **0 ta barmoq (Musht / Fist)** | 💎 **Qulflash (Freeze)** | Harakatni to'xtatish va figurani fiksatsiya qilish |
| **1 ta barmoq (Ko'rsatkich)** | 📦 **Kub (Cube)** | Simmetrik qirrali neon kub |
| **2 ta barmoq (Victory ✌️)** | 🔺 **Piramida (Pyramid)** | 4 qirrali zamonaviy piramida |
| **3 ta barmoq** | 🛢️ **Silindr (Cylinder)** | Silliq 3D silindr |
| **4 ta barmoq** | 🌐 **Sfera (Sphere)** | Yaltiroq ko'p qirrali geo-sfera |
| **5 ta barmoq (Ochiq kaft 🖐️)** | 🍩 **Torus (Halqa)** | Aylanuvchi kosmik halqa |
| **Pinch (Bosh + Ko'rsatkich 🤏)** | 🔍 **Masshtablash (Scale)** | Bosh va ko'rsatkich barmoq masofasiga qarab o'lchamni kattalashtirish/kichraytirish |
| **Qo'l harakati (Tracking)** | 🎯 **Ergashish (Move)** | 3D figura silliq tarzda qo'l kaftiga ergashadi |
| **Kaft burchagi (Tilt / Roll)** | 🔄 **Burilish (Rotate)** | Qo'l burchagiga mos ravishda 3D obyekt buriladi |
| **Ikkala qo'l (Two Hands)** | ↔️ **Global Scale** | Ikki qo'l orasidagi masofa orqali kattalashtirish |

---

## 🛠️ Qanday Ishga Tushiriladi?

Brauzerlarning xavfsizlik qoidalariga ko'ra, veb-kameradan (`getUserMedia`) foydalanish uchun sahifa **`http://localhost`** yoki **`https://`** protokoli orqali ochilishi kerak.

### ⚡ Eng oson usul: `run.bat` orqali (1-klik bilan)
Loyiha papkasidagi **`run.bat`** faylini sichqoncha bilan ikki marta bosing (Double Click).
U avtomatik ravishda:
1. Mahalliy serverni ishga tushiradi (`localhost:3000`).
2. Brauzeringizni ochib dasturni ishga tushiradi.

---

### 1-usul: Python orqali (Terminalda)
Loyiha papkasida terminalni oching va quyidagi buyruqni bering:
```bash
python -m http.server 3000
```
So'ngra brauzeringizda oching:
👉 **`http://localhost:3000`**

### 2-usul: Node.js / npx orqali
```bash
npx serve .
```

### 3-usul: VS Code Live Server
VS Code da loyiha papkasini oching va `index.html` faylini o'ng tugma bilan bosib **"Open with Live Server"** ni tanlang.

---

## 🎨 Qo'shimcha Sozlamalar va Tugmalar

- **🔄 Aylanish**: Figuraning avtomatik aylanishini yoqish yoki o'chirish.
- **🕸️ Wireframe**: To'liq silliq jism va simli karkas (wireframe) rejimini almashtirish.
- **🔊 Ovoz**: Procedural sci-fi ovozlarini yoqish yoki o'chirish.
- **📷 Fon rejimi**: PiP (kichik mini oyna), to'liq shaffof kamera foni yoki qorong'u fazo rejimlari.
- **Ranglar palitrasi**: Neon Cyan, Magenta Pink, Emerald Green, Solar Gold, Cyber Purple.
- **Klaviatura tezkor tugmalari**: Klaviaturadagi `0`, `1`, `2`, `3`, `4`, `5` tugmalarini bosib ham shakllarni sinab ko'rishingiz mumkin.
