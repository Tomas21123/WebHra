# 🎮 Voxelový svět – Dedikovaný Multiplayer Server

Tato složka obsahuje kompletní zdrojový kód samostatného herního serveru pro hru **Voxelový svět**.

Server je postaven na lehkém a rychlém **Node.js** a protokolu **WebSockets**. Může běžet na tvém stolním počítači, notebooku nebo nepřetržitě 24/7 na **Raspberry Pi 4**.

---

## 🚀 Jak server spustit

### 1. Na Windows:
1. Ujisti se, že máš nainstalovaný [Node.js](https://nodejs.org/) (verze 18 nebo novější).
2. Jednoduše poklikej na soubor **`start.bat`**.
3. Skript automaticky doinstaluje potřebnou knihovnu `ws` a server spustí.

### 2. Na Raspberry Pi 4 (Linux):
1. V terminálu přejdi do této složky:
   ```bash
   cd ServerSource
   ```
2. Nastav práva ke spuštění a spusť skript:
   ```bash
   chmod +x start.sh
   ./start.sh
   ```

---

## 🌐 Jak se hráči připojí k tvému serveru

### Možnost A: Hraní na stejné Wi-Fi síti (LAN)
1. Spusť server. V konzoli nebo administraci uvidíš svou lokální IP adresu (např. `192.168.1.45:3000`).
2. Ostatní hráči v herním menu kliknou na **Multiplayer** -> **Přidat server** a zadají tuto adresu.

### Možnost B: Hraní přes internet bez nutnosti veřejné IP (DOPORUČENO)
Pokud nemáš od poskytovatele internetu veřejnou IP adresu a nechceš nastavovat router:
1. Stáhni si zdarma program [Playit.gg](https://playit.gg/).
2. Přidej v něm nový tunel typu **Custom TCP** na lokální port **3000**.
3. Playit.gg ti vygeneruje veřejnou doménu (např. `mojehra.playit.gg:12345`).
4. Tuto adresu pošleš kamarádům a ti se mohou ihned připojit odkudkoliv na světě!

### Možnost C: Veřejná IP & Port Forwarding
Pokud máš pevnou veřejnou IP adresu od poskytovatele, stačí v administraci domácího routeru povolit a přesměrovat port **3000 (TCP)** na IP adresu tvého PC nebo Raspberry Pi.

---

## 🛠️ Webová Administrace & Správa hráčů

Server má vestavěný webový panel, který otevřeš ve svém prohlížeči na adrese:
👉 **`http://localhost:3000/admin`**

V administraci můžeš:
- Vidět aktuální počet hráčů online, jejich nicky a souřadnice ve světě.
- Jedním kliknutím udělovat nebo odebírat práva **Operátora (OP)** 👑.
- Vyhazovat nevhodné hráče (**Kick**).
- Sledovat živý log chatu a posílat hromadná oznámení do hry.
- Ručně ukládat stav světa na disk.

---

## 👑 Příkazy ve hře (pro Operátory)

Hráči s právy operátora mohou přímo v chatu (klávesa `T` nebo `/`) používat tyto příkazy:
- `/help` – Zobrazí přehled příkazů
- `/list` – Seznam online hráčů
- `/spawn` – Teleportuje tě na výchozí pozici
- `/tp <x> <y> <z>` – Teleport na zadané souřadnice
- `/tp <nick>` – Teleport k vybranému hráči
- `/time den` nebo `/time noc` – Změna denní doby
- `/kick <nick>` – Vyhození hráče ze serveru
- `/op <nick>` – Jmenování nového operátora
- `/deop <nick>` – Odebrání práv operátora
- `/save` – Uložení světa na disk

---

## 💾 Struktura souborů

- `server.js` – Hlavní kód serveru, HTTP router a WebSocket logika.
- `config.json` – Nastavení názvu serveru, portu, maximálního počtu hráčů a seedu.
- `ops.json` – Seznam nicků operátorů.
- `data/world.json` – Automaticky ukládané změny terénu (položené/rozbité bloky).
- `start.bat` / `start.sh` – Rychlé spouštěče.
