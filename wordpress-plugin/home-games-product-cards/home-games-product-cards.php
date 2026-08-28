<?php
/**
 * Plugin Name: Home & Games - Product Cards
 * Description: Sezione prodotti in stile "pop culture store" (card arrotondate, disponibilità, prezzo, bottone + Carrello, ordine via WhatsApp) tramite shortcode, per usarla in Elementor senza bisogno di Elementor Pro. Richiede WooCommerce.
 * Version: 1.0.0
 * Author: Home & Games 2.0
 * Text Domain: hg-product-cards
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class HG_Product_Cards {

	const VERSION = '1.0.0';

	public function __construct() {
		add_shortcode( 'hg_products', array( $this, 'render_shortcode' ) );
		add_action( 'wp_enqueue_scripts', array( $this, 'register_assets' ) );
	}

	public function register_assets() {
		wp_register_style(
			'hg-product-cards-fonts',
			'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=Sora:wght@400;500;600;700&display=swap',
			array(),
			null
		);
	}

	/**
	 * [hg_products]
	 *
	 * Attributi:
	 *   title           Titolo sezione (default "Novità")
	 *   subtitle        Sottotitolo sezione
	 *   limit           Numero prodotti (default 8)
	 *   category        Slug categoria prodotto, o elenco separato da virgola (default: tutte)
	 *   orderby         date | price | popularity | rating | title (default "date")
	 *   order           ASC | DESC (default "DESC")
	 *   layout          scroll | grid (default "scroll")
	 *   columns         Colonne per layout grid (default 4)
	 *   view_all_url    URL del bottone "Vedi tutte" (vuoto = nascosto)
	 *   whatsapp        Numero WhatsApp in formato internazionale senza + (es. 393397400306)
	 *   show_whatsapp   yes | no (default "yes")
	 *   show_wishlist   yes | no - mostra il cuoricino (solo visivo) (default "yes")
	 */
	public function render_shortcode( $atts ) {
		if ( ! class_exists( 'WooCommerce' ) ) {
			if ( current_user_can( 'manage_options' ) ) {
				return '<p style="padding:16px;background:#fee;border:1px solid #f99;border-radius:8px;">Home &amp; Games Product Cards: WooCommerce non risulta attivo.</p>';
			}
			return '';
		}

		$atts = shortcode_atts(
			array(
				'title'         => 'Novità',
				'subtitle'      => 'Gli ultimi arrivi in negozio.',
				'limit'         => 8,
				'category'      => '',
				'orderby'       => 'date',
				'order'         => 'DESC',
				'layout'        => 'scroll',
				'columns'       => 4,
				'view_all_url'  => '',
				'whatsapp'      => '393397400306',
				'show_whatsapp' => 'yes',
				'show_wishlist' => 'yes',
			),
			$atts,
			'hg_products'
		);

		$query_args = array(
			'post_type'      => 'product',
			'post_status'    => 'publish',
			'posts_per_page' => absint( $atts['limit'] ),
			'orderby'        => sanitize_key( $atts['orderby'] ),
			'order'          => ( strtoupper( $atts['order'] ) === 'ASC' ) ? 'ASC' : 'DESC',
		);

		if ( ! empty( $atts['category'] ) ) {
			$query_args['tax_query'] = array(
				array(
					'taxonomy' => 'product_cat',
					'field'    => 'slug',
					'terms'    => array_map( 'trim', explode( ',', $atts['category'] ) ),
				),
			);
		}

		$products_query = new WP_Query( $query_args );

		if ( ! $products_query->have_posts() ) {
			return '';
		}

		wp_enqueue_style( 'hg-product-cards-fonts' );
		wp_enqueue_script( 'wc-add-to-cart' );
		wp_enqueue_script( 'wc-cart-fragments' );

		$layout        = ( $atts['layout'] === 'grid' ) ? 'grid' : 'scroll';
		$columns       = max( 2, absint( $atts['columns'] ) );
		$show_wa       = ( $atts['show_whatsapp'] === 'yes' );
		$show_wishlist = ( $atts['show_wishlist'] === 'yes' );
		$whatsapp_num  = preg_replace( '/[^0-9]/', '', $atts['whatsapp'] );

		ob_start();
		$this->print_styles_once();
		?>
		<div class="hg-pc-section">
			<?php if ( $atts['title'] || $atts['subtitle'] || $atts['view_all_url'] ) : ?>
				<div class="hg-pc-header">
					<div>
						<?php if ( $atts['title'] ) : ?>
							<h2 class="hg-pc-title"><?php echo esc_html( $atts['title'] ); ?></h2>
						<?php endif; ?>
						<?php if ( $atts['subtitle'] ) : ?>
							<p class="hg-pc-subtitle"><?php echo esc_html( $atts['subtitle'] ); ?></p>
						<?php endif; ?>
					</div>
					<?php if ( $atts['view_all_url'] ) : ?>
						<a class="hg-pc-viewall" href="<?php echo esc_url( $atts['view_all_url'] ); ?>">Vedi tutte &rarr;</a>
					<?php endif; ?>
				</div>
			<?php endif; ?>

			<div class="hg-pc-row hg-pc-row--<?php echo esc_attr( $layout ); ?>"
				<?php if ( $layout === 'grid' ) : ?>
					style="grid-template-columns:repeat(<?php echo esc_attr( $columns ); ?>,1fr);"
				<?php endif; ?>
			>
				<?php
				while ( $products_query->have_posts() ) :
					$products_query->the_post();
					$product = wc_get_product( get_the_ID() );
					if ( ! $product ) {
						continue;
					}

					$permalink   = get_permalink();
					$name        = $product->get_name();
					$in_stock    = $product->is_in_stock();
					$image_id    = $product->get_image_id();
					$image_url   = $image_id ? wp_get_attachment_image_url( $image_id, 'large' ) : wc_placeholder_img_src( 'large' );
					$wa_message  = "Ciao, mi piacerebbe comprare:\n\n*" . $name . "*\n*URL:* " . $permalink . "\n\nGrazie!";
					$wa_url      = 'https://wa.me/' . $whatsapp_num . '?text=' . rawurlencode( $wa_message );
					?>
					<div class="hg-pc-card">
						<div class="hg-pc-imgwrap">
							<a href="<?php echo esc_url( $permalink ); ?>" style="display:block;width:100%;height:100%;background-image:url('<?php echo esc_url( $image_url ); ?>');background-size:cover;background-position:center;background-color:#F2F6FA;"></a>
							<?php if ( $show_wishlist ) : ?>
								<button type="button" class="hg-pc-wish" aria-label="Aggiungi ai preferiti" onclick="this.classList.toggle('is-active')">
									<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 21s-8-4.9-8-11a5 5 0 019-3 5 5 0 019 3c0 6.1-8 11-8 11z" stroke="#1E2A38" stroke-width="1.8"/></svg>
								</button>
							<?php endif; ?>
						</div>
						<div class="hg-pc-body">
							<a href="<?php echo esc_url( $permalink ); ?>" class="hg-pc-name"><?php echo esc_html( $name ); ?></a>
							<span class="hg-pc-stock hg-pc-stock--<?php echo $in_stock ? 'in' : 'out'; ?>">
								<span class="hg-pc-dot"></span><?php echo $in_stock ? 'Disponibile' : 'Esaurito'; ?>
							</span>
							<div class="hg-pc-buyrow">
								<span class="hg-pc-price"><?php echo wp_kses_post( $product->get_price_html() ); ?></span>
								<?php if ( $in_stock ) : ?>
									<a href="<?php echo esc_url( $product->add_to_cart_url() ); ?>"
										data-quantity="1"
										data-product_id="<?php echo esc_attr( $product->get_id() ); ?>"
										data-product_sku="<?php echo esc_attr( $product->get_sku() ); ?>"
										class="hg-pc-addcart ajax_add_to_cart add_to_cart_button"
										rel="nofollow">+ Carrello</a>
								<?php endif; ?>
							</div>
							<?php if ( $show_wa ) : ?>
								<a href="<?php echo esc_url( $wa_url ); ?>" target="_blank" rel="noopener" class="hg-pc-wa">Ordina su WhatsApp</a>
							<?php endif; ?>
						</div>
					</div>
					<?php
				endwhile;
				wp_reset_postdata();
				?>
			</div>
		</div>
		<?php
		return ob_get_clean();
	}

	private function print_styles_once() {
		static $printed = false;
		if ( $printed ) {
			return;
		}
		$printed = true;
		?>
		<style>
		.hg-pc-section{font-family:'Sora',sans-serif;color:#1E2A38;}
		.hg-pc-header{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:12px;}
		.hg-pc-title{font-family:'Space Grotesk',sans-serif;font-size:28px;font-weight:700;margin:0 0 8px;}
		.hg-pc-subtitle{color:#5B6B7A;font-size:15px;margin:0;}
		.hg-pc-viewall{font-weight:700;font-size:14.5px;color:#2E7FC1;text-decoration:none;}
		.hg-pc-viewall:hover{color:#1F5E93;}
		.hg-pc-row--scroll{display:flex;gap:20px;overflow-x:auto;padding-bottom:12px;scroll-snap-type:x proximity;}
		.hg-pc-row--scroll .hg-pc-card{flex-shrink:0;width:250px;scroll-snap-align:start;}
		.hg-pc-row--grid{display:grid;gap:20px;}
		.hg-pc-card{border:1px solid #E4ECF3;border-radius:16px;overflow:hidden;display:flex;flex-direction:column;background:#fff;}
		.hg-pc-imgwrap{position:relative;width:100%;aspect-ratio:1/1;}
		.hg-pc-wish{position:absolute;top:10px;right:10px;width:32px;height:32px;border-radius:100px;background:#FFFFFF;border:none;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,.12);padding:0;}
		.hg-pc-wish.is-active svg path{fill:#c96442;stroke:#c96442;}
		.hg-pc-body{padding:16px;display:flex;flex-direction:column;gap:10px;flex:1;}
		.hg-pc-name{font-size:14.5px;font-weight:600;color:#1E2A38;line-height:1.3;text-decoration:none;}
		.hg-pc-name:hover{color:#2E7FC1;}
		.hg-pc-stock{font-size:12px;font-weight:600;display:flex;align-items:center;gap:5px;}
		.hg-pc-stock--in{color:#2A8F5F;}
		.hg-pc-stock--out{color:#9AA7B4;}
		.hg-pc-dot{width:6px;height:6px;border-radius:100px;background:currentColor;display:block;}
		.hg-pc-buyrow{display:flex;align-items:center;justify-content:space-between;margin-top:auto;gap:10px;}
		.hg-pc-price{font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:16px;color:#2E7FC1;white-space:nowrap;}
		.hg-pc-price ins{text-decoration:none;}
		.hg-pc-price del{opacity:.5;font-size:13px;margin-right:4px;}
		.hg-pc-addcart{background:#2E7FC1;color:#fff !important;font-size:12.5px;font-weight:700;padding:8px 12px;border-radius:100px;white-space:nowrap;flex-shrink:0;text-decoration:none;border:none;cursor:pointer;transition:background .15s;}
		.hg-pc-addcart:hover{background:#1F5E93;}
		.hg-pc-addcart.loading{opacity:.6;}
		.hg-pc-addcart.added::after{content:" ✓";}
		.hg-pc-wa{font-size:12px;color:#5B6B7A;text-decoration:none;}
		.hg-pc-wa:hover{color:#2E7FC1;}
		.hg-pc-row--scroll::-webkit-scrollbar{height:8px;}
		.hg-pc-row--scroll::-webkit-scrollbar-thumb{background:#DCE6EE;border-radius:8px;}
		@media (max-width:640px){.hg-pc-row--grid{grid-template-columns:repeat(2,1fr) !important;}}
		</style>
		<?php
	}
}

new HG_Product_Cards();
