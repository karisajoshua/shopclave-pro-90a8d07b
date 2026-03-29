import { createContext, useContext, useState, ReactNode, useCallback } from "react";

type Translations = Record<string, Record<string, string>>;

const translations: Translations = {
  // Navbar
  "nav.deliverTo": {
    EN: "Deliver to", SW: "Peleka kwa", FR: "Livrer à", ES: "Entregar a",
    AR: "التوصيل إلى", PT: "Entregar em", DE: "Liefern nach", ZH: "送达",
    SO: "U geeyn", HI: "डिलीवर करें",
  },
  "nav.search": {
    EN: "Search Barakaz", SW: "Tafuta Barakaz", FR: "Rechercher Barakaz", ES: "Buscar en Barakaz",
    AR: "ابحث في بركاز", PT: "Pesquisar Barakaz", DE: "Barakaz durchsuchen", ZH: "搜索Barakaz",
    SO: "Raadi Barakaz", HI: "Barakaz खोजें",
  },
  "nav.hello": {
    EN: "Hello, Sign in", SW: "Habari, Ingia", FR: "Bonjour, Connexion", ES: "Hola, Inicia sesión",
    AR: "مرحبا، سجل الدخول", PT: "Olá, Entrar", DE: "Hallo, Anmelden", ZH: "你好，登录",
    SO: "Salaan, Gal", HI: "नमस्ते, साइन इन",
  },
  "nav.helloWelcome": {
    EN: "Hello, welcome", SW: "Habari, karibu", FR: "Bonjour, bienvenue", ES: "Hola, bienvenido",
    AR: "مرحبا، أهلا بك", PT: "Olá, bem-vindo", DE: "Hallo, willkommen", ZH: "你好，欢迎",
    SO: "Salaan, soo dhawoow", HI: "नमस्ते, स्वागत",
  },
  "nav.accountLists": {
    EN: "Account & Lists", SW: "Akaunti na Orodha", FR: "Compte et Listes", ES: "Cuenta y Listas",
    AR: "الحساب والقوائم", PT: "Conta e Listas", DE: "Konto & Listen", ZH: "账户和列表",
    SO: "Koontada & Liisaska", HI: "खाता और सूचियाँ",
  },
  "nav.cart": {
    EN: "Cart", SW: "Kikapu", FR: "Panier", ES: "Carrito",
    AR: "السلة", PT: "Carrinho", DE: "Warenkorb", ZH: "购物车",
    SO: "Gaadhi", HI: "कार्ट",
  },
  "nav.all": {
    EN: "All", SW: "Zote", FR: "Tout", ES: "Todo",
    AR: "الكل", PT: "Todos", DE: "Alle", ZH: "全部",
    SO: "Dhammaan", HI: "सभी",
  },
  "nav.todaysDeals": {
    EN: "Today's Deals", SW: "Ofa za Leo", FR: "Offres du jour", ES: "Ofertas del día",
    AR: "عروض اليوم", PT: "Ofertas do dia", DE: "Angebote des Tages", ZH: "今日特惠",
    SO: "Heshiisyada Maanta", HI: "आज की डील",
  },
  "nav.sellOn": {
    EN: "Sell on Barakaz", SW: "Uza kwenye Barakaz", FR: "Vendre sur Barakaz", ES: "Vender en Barakaz",
    AR: "بيع على بركاز", PT: "Vender na Barakaz", DE: "Auf Barakaz verkaufen", ZH: "在Barakaz上销售",
    SO: "Ku Iib Barakaz", HI: "Barakaz पर बेचें",
  },
  "nav.electronics": {
    EN: "Electronics", SW: "Elektroniki", FR: "Électronique", ES: "Electrónica",
    AR: "إلكترونيات", PT: "Eletrônicos", DE: "Elektronik", ZH: "电子产品",
    SO: "Elektaroonik", HI: "इलेक्ट्रॉनिक्स",
  },
  "nav.fashion": {
    EN: "Fashion", SW: "Mitindo", FR: "Mode", ES: "Moda",
    AR: "أزياء", PT: "Moda", DE: "Mode", ZH: "时尚",
    SO: "Fashin", HI: "फैशन",
  },
  "nav.homeGarden": {
    EN: "Home & Garden", SW: "Nyumba na Bustani", FR: "Maison et Jardin", ES: "Hogar y Jardín",
    AR: "المنزل والحديقة", PT: "Casa e Jardim", DE: "Haus & Garten", ZH: "家居和花园",
    SO: "Guriga & Beerta", HI: "घर और बगीचा",
  },
  "nav.healthBeauty": {
    EN: "Health & Beauty", SW: "Afya na Uzuri", FR: "Santé et Beauté", ES: "Salud y Belleza",
    AR: "الصحة والجمال", PT: "Saúde e Beleza", DE: "Gesundheit & Schönheit", ZH: "健康和美容",
    SO: "Caafimaadka & Quruxda", HI: "स्वास्थ्य और सौंदर्य",
  },
  "nav.sports": {
    EN: "Sports", SW: "Michezo", FR: "Sports", ES: "Deportes",
    AR: "رياضة", PT: "Esportes", DE: "Sport", ZH: "运动",
    SO: "Cayaaraha", HI: "खेल",
  },

  // Footer
  "footer.backToTop": {
    EN: "Back to top", SW: "Rudi juu", FR: "Retour en haut", ES: "Volver arriba",
    AR: "العودة للأعلى", PT: "Voltar ao topo", DE: "Nach oben", ZH: "回到顶部",
    SO: "Dib ugu noqo sare", HI: "ऊपर जाएं",
  },
  "footer.newsletter": {
    EN: "New to Barakaz? Subscribe to our newsletter for exclusive deals!",
    SW: "Mpya kwenye Barakaz? Jiandikishe kupata ofa maalum!",
    FR: "Nouveau sur Barakaz ? Abonnez-vous pour des offres exclusives !",
    ES: "¿Nuevo en Barakaz? ¡Suscríbete para ofertas exclusivas!",
    AR: "جديد على بركاز؟ اشترك للحصول على عروض حصرية!",
    PT: "Novo na Barakaz? Inscreva-se para ofertas exclusivas!",
    DE: "Neu bei Barakaz? Abonnieren Sie für exklusive Angebote!",
    ZH: "Barakaz新用户？订阅获取专属优惠！",
    SO: "Cusub Barakaz? Isdiiwaangeli heshiisyo gaar ah!",
    HI: "Barakaz में नए हैं? विशेष ऑफर के लिए सब्सक्राइब करें!",
  },
  "footer.subscribe": {
    EN: "Subscribe", SW: "Jiandikishe", FR: "S'abonner", ES: "Suscribirse",
    AR: "اشترك", PT: "Inscrever-se", DE: "Abonnieren", ZH: "订阅",
    SO: "Isdiiwaangeli", HI: "सब्सक्राइब",
  },
  "footer.enterEmail": {
    EN: "Enter your email", SW: "Weka barua pepe yako", FR: "Entrez votre email", ES: "Ingresa tu correo",
    AR: "أدخل بريدك الإلكتروني", PT: "Digite seu email", DE: "E-Mail eingeben", ZH: "输入您的电子邮件",
    SO: "Gali emailkaaga", HI: "अपना ईमेल दर्ज करें",
  },
  "footer.needHelp": {
    EN: "Need Help?", SW: "Unahitaji Msaada?", FR: "Besoin d'aide ?", ES: "¿Necesitas ayuda?",
    AR: "تحتاج مساعدة؟", PT: "Precisa de ajuda?", DE: "Brauchen Sie Hilfe?", ZH: "需要帮助？",
    SO: "Caawin u baahan?", HI: "मदद चाहिए?",
  },
  "footer.chatWithUs": {
    EN: "Chat with us", SW: "Soga nasi", FR: "Discuter avec nous", ES: "Chatea con nosotros",
    AR: "تحدث معنا", PT: "Fale conosco", DE: "Chatten Sie mit uns", ZH: "与我们聊天",
    SO: "Nala sheekayso", HI: "हमसे चैट करें",
  },
  "footer.helpCenter": {
    EN: "Help Center", SW: "Kituo cha Msaada", FR: "Centre d'aide", ES: "Centro de ayuda",
    AR: "مركز المساعدة", PT: "Central de ajuda", DE: "Hilfe-Center", ZH: "帮助中心",
    SO: "Xarunta Caawinta", HI: "सहायता केंद्र",
  },
  "footer.contactUs": {
    EN: "Contact Us", SW: "Wasiliana Nasi", FR: "Contactez-nous", ES: "Contáctanos",
    AR: "اتصل بنا", PT: "Contate-nos", DE: "Kontaktieren Sie uns", ZH: "联系我们",
    SO: "Nala soo xiriir", HI: "संपर्क करें",
  },
  "footer.whatsappUs": {
    EN: "WhatsApp Us", SW: "WhatsApp Sisi", FR: "WhatsApp", ES: "WhatsApp",
    AR: "واتساب", PT: "WhatsApp", DE: "WhatsApp", ZH: "WhatsApp联系",
    SO: "WhatsApp noo soo dir", HI: "WhatsApp करें",
  },
  "footer.aboutBarakaz": {
    EN: "About Barakaz", SW: "Kuhusu Barakaz", FR: "À propos de Barakaz", ES: "Sobre Barakaz",
    AR: "عن بركاز", PT: "Sobre a Barakaz", DE: "Über Barakaz", ZH: "关于Barakaz",
    SO: "Ku saabsan Barakaz", HI: "Barakaz के बारे में",
  },
  "footer.aboutUs": {
    EN: "About Us", SW: "Kuhusu Sisi", FR: "À propos de nous", ES: "Sobre nosotros",
    AR: "من نحن", PT: "Sobre nós", DE: "Über uns", ZH: "关于我们",
    SO: "Annaga", HI: "हमारे बारे में",
  },
  "footer.terms": {
    EN: "Terms & Conditions", SW: "Sheria na Masharti", FR: "Conditions générales", ES: "Términos y condiciones",
    AR: "الشروط والأحكام", PT: "Termos e Condições", DE: "AGB", ZH: "条款和条件",
    SO: "Shuruudaha", HI: "नियम और शर्तें",
  },
  "footer.privacy": {
    EN: "Privacy Policy", SW: "Sera ya Faragha", FR: "Politique de confidentialité", ES: "Política de privacidad",
    AR: "سياسة الخصوصية", PT: "Política de privacidade", DE: "Datenschutz", ZH: "隐私政策",
    SO: "Siyaasadda Asturnaanta", HI: "गोपनीयता नीति",
  },
  "footer.cookies": {
    EN: "Cookie Policy", SW: "Sera ya Kuki", FR: "Politique des cookies", ES: "Política de cookies",
    AR: "سياسة الكوكيز", PT: "Política de cookies", DE: "Cookie-Richtlinie", ZH: "Cookie政策",
    SO: "Siyaasadda Cookies", HI: "कुकी नीति",
  },
  "footer.makeMoney": {
    EN: "Make Money with Barakaz", SW: "Pata Pesa na Barakaz", FR: "Gagnez de l'argent avec Barakaz", ES: "Gana dinero con Barakaz",
    AR: "اكسب المال مع بركاز", PT: "Ganhe dinheiro com Barakaz", DE: "Geld verdienen mit Barakaz", ZH: "在Barakaz赚钱",
    SO: "Ku samayso lacag Barakaz", HI: "Barakaz से पैसे कमाएं",
  },
  "footer.sellOnBarakaz": {
    EN: "Sell on Barakaz", SW: "Uza kwenye Barakaz", FR: "Vendre sur Barakaz", ES: "Vender en Barakaz",
    AR: "بيع على بركاز", PT: "Vender na Barakaz", DE: "Auf Barakaz verkaufen", ZH: "在Barakaz销售",
    SO: "Ku Iib Barakaz", HI: "Barakaz पर बेचें",
  },
  "footer.vendorHub": {
    EN: "Vendor Hub", SW: "Kituo cha Wauzaji", FR: "Hub Vendeur", ES: "Centro de Vendedores",
    AR: "مركز البائعين", PT: "Hub do Vendedor", DE: "Verkäufer-Hub", ZH: "卖家中心",
    SO: "Xarunta Iibiyaha", HI: "विक्रेता हब",
  },
  "footer.becomePartner": {
    EN: "Become a Partner", SW: "Kuwa Mshirika", FR: "Devenir partenaire", ES: "Conviértete en socio",
    AR: "كن شريكاً", PT: "Torne-se parceiro", DE: "Partner werden", ZH: "成为合作伙伴",
    SO: "Noqo Lamaane", HI: "पार्टनर बनें",
  },
  "footer.services": {
    EN: "Barakaz Services", SW: "Huduma za Barakaz", FR: "Services Barakaz", ES: "Servicios Barakaz",
    AR: "خدمات بركاز", PT: "Serviços Barakaz", DE: "Barakaz-Dienste", ZH: "Barakaz服务",
    SO: "Adeegyada Barakaz", HI: "Barakaz सेवाएं",
  },
  "footer.delivery": {
    EN: "Delivery Services", SW: "Huduma za Usafirishaji", FR: "Services de livraison", ES: "Servicios de entrega",
    AR: "خدمات التوصيل", PT: "Serviços de entrega", DE: "Lieferservice", ZH: "配送服务",
    SO: "Adeegyada Geynta", HI: "डिलीवरी सेवाएं",
  },
  "footer.returnPolicy": {
    EN: "Return Policy", SW: "Sera ya Kurudisha", FR: "Politique de retour", ES: "Política de devolución",
    AR: "سياسة الإرجاع", PT: "Política de devolução", DE: "Rückgaberecht", ZH: "退货政策",
    SO: "Siyaasadda Celinta", HI: "वापसी नीति",
  },
  "footer.myAccount": {
    EN: "My Account", SW: "Akaunti Yangu", FR: "Mon compte", ES: "Mi cuenta",
    AR: "حسابي", PT: "Minha conta", DE: "Mein Konto", ZH: "我的账户",
    SO: "Koontadayda", HI: "मेरा खाता",
  },
  "footer.myCart": {
    EN: "My Cart", SW: "Kikapu Changu", FR: "Mon panier", ES: "Mi carrito",
    AR: "سلتي", PT: "Meu carrinho", DE: "Mein Warenkorb", ZH: "我的购物车",
    SO: "Gaadihayga", HI: "मेरी कार्ट",
  },
  "footer.getApp": {
    EN: "Get the Barakaz App", SW: "Pata Programu ya Barakaz", FR: "Télécharger l'appli Barakaz", ES: "Descarga la app Barakaz",
    AR: "حمّل تطبيق بركاز", PT: "Baixe o app Barakaz", DE: "Hol dir die Barakaz App", ZH: "下载Barakaz应用",
    SO: "Soo deji Barnaamijka Barakaz", HI: "Barakaz ऐप डाउनलोड करें",
  },

  // Index / general
  "home.featured": {
    EN: "Featured Products", SW: "Bidhaa Maalum", FR: "Produits en vedette", ES: "Productos destacados",
    AR: "منتجات مميزة", PT: "Produtos em destaque", DE: "Ausgewählte Produkte", ZH: "精选产品",
    SO: "Alaabada La Xulayo", HI: "विशेष उत्पाद",
  },
  "home.viewAll": {
    EN: "View All", SW: "Tazama Zote", FR: "Voir tout", ES: "Ver todo",
    AR: "عرض الكل", PT: "Ver tudo", DE: "Alle anzeigen", ZH: "查看全部",
    SO: "Arag Dhammaan", HI: "सभी देखें",
  },
  "home.startSelling": {
    EN: "Start Selling on Barakaz", SW: "Anza Kuuza kwenye Barakaz", FR: "Commencez à vendre sur Barakaz", ES: "Empieza a vender en Barakaz",
    AR: "ابدأ البيع على بركاز", PT: "Comece a vender na Barakaz", DE: "Starten Sie den Verkauf auf Barakaz", ZH: "开始在Barakaz上销售",
    SO: "Ku bilow iibinta Barakaz", HI: "Barakaz पर बेचना शुरू करें",
  },
  "home.sellDesc": {
    EN: "Join thousands of vendors and reach millions of customers. Easy setup, powerful tools, and dedicated support.",
    SW: "Jiunge na maelfu ya wauzaji na ufikie mamilioni ya wateja. Usanidi rahisi, zana madhubuti, na msaada wa kujitolea.",
    FR: "Rejoignez des milliers de vendeurs et touchez des millions de clients. Configuration facile, outils puissants et support dédié.",
    ES: "Únete a miles de vendedores y llega a millones de clientes. Configuración fácil, herramientas potentes y soporte dedicado.",
    AR: "انضم إلى آلاف البائعين وتواصل مع ملايين العملاء. إعداد سهل وأدوات قوية ودعم مخصص.",
    PT: "Junte-se a milhares de vendedores e alcance milhões de clientes. Configuração fácil, ferramentas poderosas e suporte dedicado.",
    DE: "Schließen Sie sich Tausenden von Verkäufern an und erreichen Sie Millionen von Kunden.",
    ZH: "加入数千名卖家，触达数百万客户。轻松设置，强大工具，专属支持。",
    SO: "Ku biir kumaanaan iibiyeyaal ah oo gaadh malaayiin macaamiil ah.",
    HI: "हजारों विक्रेताओं से जुड़ें और लाखों ग्राहकों तक पहुंचें।",
  },
  "home.becomeSeller": {
    EN: "Become a Seller", SW: "Kuwa Muuzaji", FR: "Devenir vendeur", ES: "Conviértete en vendedor",
    AR: "كن بائعاً", PT: "Torne-se um vendedor", DE: "Verkäufer werden", ZH: "成为卖家",
    SO: "Noqo Iibiye", HI: "विक्रेता बनें",
  },

  // Search
  "search.placeholder": {
    EN: "Search products...", SW: "Tafuta bidhaa...", FR: "Rechercher des produits...", ES: "Buscar productos...",
    AR: "البحث عن منتجات...", PT: "Pesquisar produtos...", DE: "Produkte suchen...", ZH: "搜索产品...",
    SO: "Raadi alaabada...", HI: "उत्पाद खोजें...",
  },
  "search.resultsFor": {
    EN: "Results for", SW: "Matokeo ya", FR: "Résultats pour", ES: "Resultados para",
    AR: "نتائج", PT: "Resultados para", DE: "Ergebnisse für", ZH: "搜索结果",
    SO: "Natiijooyinka", HI: "के लिए परिणाम",
  },
  "search.allProducts": {
    EN: "All Products", SW: "Bidhaa Zote", FR: "Tous les produits", ES: "Todos los productos",
    AR: "جميع المنتجات", PT: "Todos os produtos", DE: "Alle Produkte", ZH: "所有产品",
    SO: "Dhammaan Alaabada", HI: "सभी उत्पाद",
  },
  "search.noProducts": {
    EN: "No products found", SW: "Hakuna bidhaa zilizopatikana", FR: "Aucun produit trouvé", ES: "No se encontraron productos",
    AR: "لا توجد منتجات", PT: "Nenhum produto encontrado", DE: "Keine Produkte gefunden", ZH: "未找到产品",
    SO: "Alaab lama helin", HI: "कोई उत्पाद नहीं मिला",
  },
  "search.tryDifferent": {
    EN: "Try a different search term", SW: "Jaribu neno tofauti la utafutaji", FR: "Essayez un autre terme", ES: "Prueba con otro término",
    AR: "جرب كلمة بحث مختلفة", PT: "Tente outro termo de pesquisa", DE: "Versuchen Sie einen anderen Suchbegriff", ZH: "尝试其他搜索词",
    SO: "Isku day eray kale", HI: "कोई अलग शब्द आज़माएं",
  },

  // Cart
  "cart.empty": {
    EN: "Your cart is empty", SW: "Kikapu chako ni tupu", FR: "Votre panier est vide", ES: "Tu carrito está vacío",
    AR: "سلتك فارغة", PT: "Seu carrinho está vazio", DE: "Ihr Warenkorb ist leer", ZH: "您的购物车是空的",
    SO: "Gaadihigu waa madhan yahay", HI: "आपकी कार्ट खाली है",
  },
  "cart.discover": {
    EN: "Discover amazing products from our sellers", SW: "Gundua bidhaa za kushangaza kutoka kwa wauzaji wetu", FR: "Découvrez des produits incroyables", ES: "Descubre productos increíbles",
    AR: "اكتشف منتجات رائعة من بائعينا", PT: "Descubra produtos incríveis", DE: "Entdecken Sie tolle Produkte", ZH: "发现卖家的精彩产品",
    SO: "Ogaaw alaabo cajiib ah", HI: "हमारे विक्रेताओं के शानदार उत्पाद खोजें",
  },
  "cart.continueShopping": {
    EN: "Continue Shopping", SW: "Endelea Kununua", FR: "Continuer les achats", ES: "Seguir comprando",
    AR: "متابعة التسوق", PT: "Continuar comprando", DE: "Weiter einkaufen", ZH: "继续购物",
    SO: "Sii wad iibsashada", HI: "खरीदारी जारी रखें",
  },
  "cart.shoppingCart": {
    EN: "Shopping Cart", SW: "Kikapu cha Ununuzi", FR: "Panier d'achat", ES: "Carrito de compras",
    AR: "سلة التسوق", PT: "Carrinho de compras", DE: "Warenkorb", ZH: "购物车",
    SO: "Gaadhi Iibsi", HI: "शॉपिंग कार्ट",
  },
  "cart.items": {
    EN: "items", SW: "bidhaa", FR: "articles", ES: "artículos",
    AR: "عناصر", PT: "itens", DE: "Artikel", ZH: "件商品",
    SO: "alaabo", HI: "आइटम",
  },
  "cart.soldBy": {
    EN: "Sold by", SW: "Inauzwa na", FR: "Vendu par", ES: "Vendido por",
    AR: "يباع بواسطة", PT: "Vendido por", DE: "Verkauft von", ZH: "卖家",
    SO: "Waxaa iibinaya", HI: "द्वारा बेचा गया",
  },
  "cart.orderSummary": {
    EN: "Order Summary", SW: "Muhtasari wa Agizo", FR: "Résumé de la commande", ES: "Resumen del pedido",
    AR: "ملخص الطلب", PT: "Resumo do pedido", DE: "Bestellübersicht", ZH: "订单摘要",
    SO: "Kooban Dalabka", HI: "ऑर्डर सारांश",
  },
  "cart.subtotal": {
    EN: "Subtotal", SW: "Jumla ndogo", FR: "Sous-total", ES: "Subtotal",
    AR: "المجموع الفرعي", PT: "Subtotal", DE: "Zwischensumme", ZH: "小计",
    SO: "Wadarta hoose", HI: "उप-योग",
  },
  "cart.delivery": {
    EN: "Delivery", SW: "Usafirishaji", FR: "Livraison", ES: "Envío",
    AR: "التوصيل", PT: "Entrega", DE: "Lieferung", ZH: "配送",
    SO: "Geynta", HI: "डिलीवरी",
  },
  "cart.free": {
    EN: "Free", SW: "Bure", FR: "Gratuit", ES: "Gratis",
    AR: "مجاني", PT: "Grátis", DE: "Kostenlos", ZH: "免费",
    SO: "Bilaash", HI: "मुफ़्त",
  },
  "cart.total": {
    EN: "Total", SW: "Jumla", FR: "Total", ES: "Total",
    AR: "الإجمالي", PT: "Total", DE: "Gesamt", ZH: "总计",
    SO: "Wadarta", HI: "कुल",
  },
  "cart.checkout": {
    EN: "Proceed to Checkout", SW: "Endelea Kulipa", FR: "Passer à la caisse", ES: "Proceder al pago",
    AR: "المتابعة للدفع", PT: "Prosseguir para pagamento", DE: "Zur Kasse", ZH: "去结算",
    SO: "U gudub Lacag-bixinta", HI: "चेकआउट करें",
  },
  "cart.clearCart": {
    EN: "Clear Cart", SW: "Futa Kikapu", FR: "Vider le panier", ES: "Vaciar carrito",
    AR: "تفريغ السلة", PT: "Limpar carrinho", DE: "Warenkorb leeren", ZH: "清空购物车",
    SO: "Nadiifi Gaadiga", HI: "कार्ट साफ़ करें",
  },

  // Product detail
  "product.addToCart": {
    EN: "Add to Cart", SW: "Ongeza Kwenye Kikapu", FR: "Ajouter au panier", ES: "Añadir al carrito",
    AR: "أضف إلى السلة", PT: "Adicionar ao carrinho", DE: "In den Warenkorb", ZH: "加入购物车",
    SO: "Ku dar Gaadiga", HI: "कार्ट में जोड़ें",
  },
  "product.inStock": {
    EN: "In Stock", SW: "Inapatikana", FR: "En stock", ES: "En stock",
    AR: "متوفر", PT: "Em estoque", DE: "Auf Lager", ZH: "有库存",
    SO: "Waa jirta", HI: "स्टॉक में",
  },
  "product.outOfStock": {
    EN: "Out of Stock", SW: "Haipatikani", FR: "En rupture de stock", ES: "Agotado",
    AR: "نفذ من المخزون", PT: "Fora de estoque", DE: "Nicht auf Lager", ZH: "缺货",
    SO: "Ma jirto", HI: "स्टॉक में नहीं",
  },
  "product.description": {
    EN: "Description", SW: "Maelezo", FR: "Description", ES: "Descripción",
    AR: "الوصف", PT: "Descrição", DE: "Beschreibung", ZH: "描述",
    SO: "Sharaxaad", HI: "विवरण",
  },
  "product.reviews": {
    EN: "reviews", SW: "tathmini", FR: "avis", ES: "reseñas",
    AR: "تقييمات", PT: "avaliações", DE: "Bewertungen", ZH: "评论",
    SO: "dib-u-eegid", HI: "समीक्षाएं",
  },
  "product.notFound": {
    EN: "Product not found", SW: "Bidhaa haijapatikana", FR: "Produit introuvable", ES: "Producto no encontrado",
    AR: "المنتج غير موجود", PT: "Produto não encontrado", DE: "Produkt nicht gefunden", ZH: "未找到产品",
    SO: "Alaabta lama helin", HI: "उत्पाद नहीं मिला",
  },
  "product.available": {
    EN: "available", SW: "inapatikana", FR: "disponible", ES: "disponible",
    AR: "متاح", PT: "disponível", DE: "verfügbar", ZH: "可用",
    SO: "la heli karo", HI: "उपलब्ध",
  },
};

interface TranslationContextType {
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: string) => string;
}

const TranslationContext = createContext<TranslationContextType>({
  language: "EN",
  setLanguage: () => {},
  t: (key: string) => key,
});

export const TranslationProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLang] = useState(() => localStorage.getItem("barakaz_lang") || "EN");

  const setLanguage = useCallback((lang: string) => {
    setLang(lang);
    localStorage.setItem("barakaz_lang", lang);
  }, []);

  const t = useCallback((key: string) => {
    return translations[key]?.[language] || translations[key]?.["EN"] || key;
  }, [language]);

  return (
    <TranslationContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </TranslationContext.Provider>
  );
};

export const useTranslation = () => useContext(TranslationContext);
