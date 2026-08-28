# Home & Games – Product Cards (plugin WordPress)

Riproduce la sezione "Novità" del mockup (card arrotondate, disponibilità,
prezzo, bottone **+ Carrello** collegato a WooCommerce, link **Ordina su
WhatsApp**) senza bisogno di Elementor Pro: basta lo shortcode `[hg_products]`
inserito con il widget gratuito **Shortcode** di Elementor.

## 1. Installazione

1. Comprimi la cartella `home-games-product-cards/` in uno `.zip`
   (deve contenere direttamente il file `home-games-product-cards.php`).
2. Sul sito WordPress: **Plugin → Aggiungi nuovo → Carica plugin** → seleziona
   lo zip → **Installa ora** → **Attiva**.
3. Richiede WooCommerce attivo (per prendere prodotti, prezzo, stato scorte
   e carrello).

## 2. Uso in Elementor

1. Modifica la pagina con Elementor.
2. Trascina il widget **Shortcode** (categoria "Generale", gratuito, non Pro)
   nel punto dove vuoi la sezione prodotti.
3. Incolla ad esempio:

   ```
   [hg_products title="Novità" subtitle="Gli ultimi arrivi in negozio." limit="8" view_all_url="https://www.shophomegames.it/nuovi-arrivi/"]
   ```

4. Salva e aggiorna l'anteprima.

Puoi anche usarlo su un template Elementor Theme Builder (es. footer o
sezione della home), o direttamente nel contenuto di una pagina/articolo con
il blocco "Shortcode" di Gutenberg.

## 3. Parametri disponibili

| Parametro       | Valori                                  | Default            |
|-----------------|------------------------------------------|---------------------|
| `title`         | testo titolo sezione                      | `Novità`             |
| `subtitle`      | testo sottotitolo                         | `Gli ultimi arrivi in negozio.` |
| `limit`         | numero prodotti da mostrare               | `8`                  |
| `category`      | slug categoria prodotto (anche più slug separati da virgola) | tutte |
| `orderby`       | `date` \| `price` \| `popularity` \| `rating` \| `title` | `date` |
| `order`         | `ASC` \| `DESC`                           | `DESC`               |
| `layout`        | `scroll` (scorrimento orizzontale, come nel mockup) \| `grid` | `scroll` |
| `columns`       | colonne quando `layout="grid"`            | `4`                  |
| `view_all_url`  | link del bottone "Vedi tutte" (vuoto = nascosto) | vuoto        |
| `whatsapp`      | numero WhatsApp, solo cifre con prefisso internazionale | `393397400306` |
| `show_whatsapp` | `yes` \| `no`                             | `yes`                |
| `show_wishlist` | `yes` \| `no` (cuoricino, solo visivo)    | `yes`                |

Esempi:

```
[hg_products title="Funko Pop" category="funko-pop-originali-da-collezione" limit="6"]

[hg_products title="Tutti i prodotti" layout="grid" columns="4" limit="12"]
```

## 4. Cosa fa concretamente

- Interroga WooCommerce con `WP_Query`, quindi mostra sempre prodotti reali
  e aggiornati (prezzo, immagine, disponibilità) — nessun contenuto statico
  da aggiornare a mano.
- Il bottone **+ Carrello** usa le stesse classi AJAX di WooCommerce
  (`ajax_add_to_cart`), quindi funziona con l'aggiunta al carrello senza
  ricaricare la pagina, esattamente come nel resto del sito.
- Font (Space Grotesk + Sora) e colori sono quelli del mockup, scritti come
  CSS scoped (prefisso `.hg-pc-`) così non entrano in conflitto con lo stile
  del tema o di Elementor.
- Il cuoricino "preferiti" è puramente visivo (si accende al click mais non
  salva nulla): se in futuro installi un plugin di wishlist, si può
  collegare in un paio di righe — dimmelo e lo aggiorno.

## 5. Personalizzare i colori

Tutti i colori sono in cima al blocco `<style>` dentro
`home-games-product-cards.php` (metodo `print_styles_once()`), con gli
stessi valori del mockup:

- Ink `#1E2A38` — testo/titoli
- Blu `#2E7FC1` (hover `#1F5E93`) — link, prezzo, bottone carrello
- Giallo `#F5DE1B` — accento (non usato qui, riservato per hero/badge)
- Verde `#2A8F5F` — indicatore "Disponibile"
- Grigio `#5B6B7A` — testo secondario
