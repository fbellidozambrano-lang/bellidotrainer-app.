// Traducción automática al español de las descripciones en inglés de USDA, término por término,
// con un glosario revisado. Sirve para buscar y leer: el nombre original de la fuente siempre se
// guarda y se muestra en la ficha. Lo que no está en el glosario queda tal cual (marcas, especies).
// También agrega sinónimos venezolanos y de uso común (cambur, lechosa, caraotas, auyama…).

const FRASES = [
  [/\begg white omelets?\b/gi, 'tortilla de claras'], [/\begg whites?\b/gi, 'clara de huevo'], [/\begg yolks?\b/gi, 'yema de huevo'],
  [/\bslightly ripe\b/gi, 'ligeramente maduro'], [/\bns as to\b/gi, 'sin especificar'], [/\bnfs\b/gi, 'sin especificar'], [/\bnot further specified\b/gi, 'sin especificar'],
  [/\bseparable lean and fat\b/gi, 'magro y grasa'], [/\bseparable lean only\b/gi, 'solo parte magra'], [/\bseparable fat\b/gi, 'grasa separable'],
  [/\bmeat only\b/gi, 'solo carne'], [/\bmeat and skin\b/gi, 'carne y piel'], [/\bskin not eaten\b/gi, 'sin comer la piel'], [/\bskin eaten\b/gi, 'comiendo la piel'],
  [/\bno added fat\b/gi, 'sin grasa añadida'], [/\bfat added\b/gi, 'con grasa añadida'], [/\bwith added\b/gi, 'con'], [/\bno salt added\b/gi, 'sin sal añadida'],
  [/\bwithout salt\b/gi, 'sin sal'], [/\bwith salt\b/gi, 'con sal'], [/\bdrained solids\b/gi, 'escurrido'], [/\bsolids and liquids\b/gi, 'con su líquido'],
  [/\bready-to-eat\b/gi, 'listo para comer'], [/\bready-to-serve\b/gi, 'listo para servir'], [/\bready-to-heat\b/gi, 'listo para calentar'], [/\bready-to-drink\b/gi, 'listo para beber'],
  [/\bready-to-feed\b/gi, 'listo para tomar'], [/\bready-to-bake\b/gi, 'listo para hornear'], [/\bprepared-from-recipe\b/gi, 'preparado con receta'],
  [/\bdark-green leafy\b/gi, 'de hoja verde oscura'], [/\bmature seeds\b/gi, 'granos secos'], [/\bimmature seeds\b/gi, 'granos tiernos'],
  [/\ball commercial varieties\b/gi, 'todas las variedades comerciales'], [/\ball grades\b/gi, 'todos los grados'], [/\ball types\b/gi, 'todos los tipos'],
  [/\bfrom raw\b/gi, 'desde crudo'], [/\bfrom pre-cooked\b/gi, 'desde precocido'], [/\bfrom frozen\b/gi, 'desde congelado'], [/\bfrom concentrate\b/gi, 'de concentrado'],
  [/\bdry heat\b/gi, 'calor seco'], [/\bmoist heat\b/gi, 'calor húmedo'], [/\bpan-fried\b/gi, 'frito en sartén'], [/\bpan-broiled\b/gi, 'a la plancha'], [/\bstir-fried\b/gi, 'salteado'],
  [/\bdeep[- ]fried\b/gi, 'frito en abundante aceite'], [/\bbone-in\b/gi, 'con hueso'], [/\blip-on\b/gi, 'con labio'], [/\bfat-free\b/gi, 'sin grasa'], [/\bsugar-free\b/gi, 'sin azúcar'],
  [/\blow-fat\b/gi, 'bajo en grasa'], [/\blowfat\b/gi, 'bajo en grasa'], [/\bnonfat\b/gi, 'descremado'], [/\breduced fat\b/gi, 'reducido en grasa'], [/\breduced sodium\b/gi, 'reducido en sodio'],
  [/\blow sodium\b/gi, 'bajo en sodio'], [/\bwhole-wheat\b/gi, 'de trigo integral'], [/\bwhole wheat\b/gi, 'de trigo integral'], [/\bwhole grain\b/gi, 'integral'], [/\bwhole-grain\b/gi, 'integral'],
  [/\bhigh fiber\b/gi, 'alto en fibra'], [/\bgluten-free\b/gi, 'sin gluten'], [/\bnon-dairy\b/gi, 'no lácteo'], [/\bcold cuts\b/gi, 'fiambres'], [/\bice cream\b/gi, 'helado'],
  [/\bpeanut butter\b/gi, 'mantequilla de maní'], [/\balmond butter\b/gi, 'mantequilla de almendras'], [/\bsweet potato(es)?\b/gi, 'batata'], [/\bsour cream\b/gi, 'crema agria'],
  [/\bcottage cheese\b/gi, 'requesón (cottage)'], [/\bcream cheese\b/gi, 'queso crema'], [/\bhot dog\b/gi, 'perro caliente'], [/\bfrench fries\b/gi, 'papas fritas'],
  [/\bpotato chips\b/gi, 'papitas fritas'], [/\btortilla chips\b/gi, 'nachos (tortilla chips)'], [/\bbrown rice\b/gi, 'arroz integral'], [/\bwhite rice\b/gi, 'arroz blanco'],
  [/\bsoy sauce\b/gi, 'salsa de soya'], [/\begg white(s)?\b/gi, 'clara de huevo'], [/\begg yolk(s)?\b/gi, 'yema de huevo'], [/\bolive oil\b/gi, 'aceite de oliva'],
  [/\bground beef\b/gi, 'carne molida de res'], [/\bspring onions?\b/gi, 'cebollín'], [/\bgreen onions?\b/gi, 'cebollín'], [/\bbell peppers?\b/gi, 'pimentón'],
  [/\bsweet peppers?\b/gi, 'pimentón'], [/\bhot chili peppers?\b/gi, 'ají picante'], [/\bpassion[- ]fruit\b/gi, 'parchita (maracuyá)'], [/\bkiwi ?fruit\b/gi, 'kiwi'],
  [/\bbrussels sprouts\b/gi, 'coles de Bruselas'], [/\bsnap beans\b/gi, 'vainitas'], [/\bgreen beans\b/gi, 'vainitas'], [/\bstring beans\b/gi, 'vainitas'], [/\bblack beans\b/gi, 'caraotas negras'],
  [/\bkidney beans\b/gi, 'caraotas rojas'], [/\bpinto beans\b/gi, 'caraotas pintas'], [/\bnavy beans\b/gi, 'caraotas blancas'], [/\bgarbanzo beans\b/gi, 'garbanzos'], [/\bbengal gram\b/gi, 'garbanzo'],
  [/\bcorn flour\b/gi, 'harina de maíz'], [/\bcorn meal\b/gi, 'harina de maíz'], [/\bwheat flour\b/gi, 'harina de trigo'], [/\brolled oats\b/gi, 'avena en hojuelas'], [/\bold fashioned\b/gi, 'tradicional'],
  [/\bsteel cut\b/gi, 'cortada'], [/\bbaby food\b/gi, 'comida para bebé'], [/\binfant formula\b/gi, 'fórmula infantil'], [/\bfast foods?\b/gi, 'comida rápida'], [/\bsoft drink\b/gi, 'refresco'],
  [/\bfruit juice\b/gi, 'jugo de fruta'], [/\bsports drink\b/gi, 'bebida deportiva'], [/\benergy drink\b/gi, 'bebida energética'], [/\bprotein powder\b/gi, 'proteína en polvo'],
  [/\bwhey protein\b/gi, 'proteína de suero (whey)'], [/\bgreek yogurt\b/gi, 'yogur griego'], [/\bcanned in water\b/gi, 'enlatado en agua'], [/\bcanned in oil\b/gi, 'enlatado en aceite'],
  [/\bpacked in water\b/gi, 'en agua'], [/\bpacked in oil\b/gi, 'en aceite'], [/\bheavy syrup\b/gi, 'almíbar espeso'], [/\blight syrup\b/gi, 'almíbar ligero'], [/\bjuice pack\b/gi, 'en su jugo'],
  [/\bwater pack\b/gi, 'en agua'], [/\bwinter squash\b/gi, 'auyama'], [/\bsummer squash\b/gi, 'calabacín'], [/\bbutternut squash\b/gi, 'auyama butternut'],
];

const PALABRAS = {
  and: 'y', with: 'con', without: 'sin', or: 'o', from: 'de', of: 'de', in: 'en', on: 'en', to: 'a', as: 'como', for: 'para', all: 'todos', no: 'sin', not: 'no', only: 'solo', other: 'otros',
  including: 'incluye', includes: 'incluye', excluding: 'excluye', than: 'que', less: 'menos', more: 'más', plus: 'más', type: 'tipo', types: 'tipos', style: 'estilo', made: 'hecho', any: 'cualquier', the: '', a: '',
  // estados y preparaciones
  raw: 'crudo', cooked: 'cocido', uncooked: 'sin cocer', boiled: 'hervido', roasted: 'asado', roast: 'asado', grilled: 'a la parrilla', broiled: 'gratinado', baked: 'horneado', fried: 'frito',
  braised: 'estofado', stewed: 'guisado', steamed: 'al vapor', simmered: 'a fuego lento', poached: 'pochado', scrambled: 'revuelto', sauteed: 'salteado', microwaved: 'al microondas',
  toasted: 'tostado', smoked: 'ahumado', cured: 'curado', canned: 'enlatado', frozen: 'congelado', fresh: 'fresco', dried: 'seco', dry: 'seco', dehydrated: 'deshidratado', drained: 'escurrido',
  unprepared: 'sin preparar', prepared: 'preparado', heated: 'calentado', unheated: 'sin calentar', refrigerated: 'refrigerado', reconstituted: 'reconstituido', diluted: 'diluido', undiluted: 'sin diluir',
  peeled: 'pelado', unpeeled: 'sin pelar', chopped: 'picado', sliced: 'rebanado', shredded: 'rallado', grated: 'rallado', mashed: 'puré', ground: 'molido', whole: 'entero', half: 'mitad',
  rinsed: 'enjuagado', soaked: 'remojado', sprouted: 'germinado', pickled: 'encurtido', salted: 'salado', unsalted: 'sin sal', sweetened: 'endulzado', unsweetened: 'sin endulzar', plain: 'natural',
  enriched: 'enriquecido', unenriched: 'sin enriquecer', fortified: 'fortificado', instant: 'instantáneo', regular: 'regular', light: 'ligero', lite: 'ligero', reduced: 'reducido', low: 'bajo', high: 'alto',
  free: 'sin', added: 'añadido', natural: 'natural', organic: 'orgánico', homemade: 'casero', commercial: 'comercial', commercially: 'comercialmente', restaurant: 'restaurante', imported: 'importado',
  breaded: 'empanizado', coated: 'rebozado', battered: 'rebozado', stuffed: 'relleno', filled: 'relleno', glazed: 'glaseado', frosted: 'glaseado', creamed: 'a la crema', seasoned: 'sazonado',
  lean: 'magro', fat: 'grasa', skin: 'piel', skinless: 'sin piel', boneless: 'sin hueso', bone: 'hueso', trimmed: 'recortado', mixed: 'mixto', mix: 'mezcla', blend: 'mezcla', solids: 'sólidos',
  liquid: 'líquido', liquids: 'líquidos', powder: 'polvo', powdered: 'en polvo', concentrate: 'concentrado', condensed: 'condensado', evaporated: 'evaporada', flavored: 'saborizado', flavor: 'sabor',
  ripe: 'maduro', overripe: 'muy maduro', underripe: 'verde', mature: 'maduro', immature: 'tierno', young: 'joven', small: 'pequeño', medium: 'mediano', large: 'grande', thin: 'fino', thick: 'grueso',
  hard: 'duro', soft: 'blando', firm: 'firme', silken: 'sedoso', sweet: 'dulce', sour: 'agrio', hot: 'caliente', cold: 'frío', iced: 'helado', spicy: 'picante', mild: 'suave', crispy: 'crujiente', crunchy: 'crujiente',
  // carnes y aves
  meat: 'carne', meats: 'carnes', beef: 'res', pork: 'cerdo', chicken: 'pollo', turkey: 'pavo', lamb: 'cordero', veal: 'ternera', mutton: 'carnero', goat: 'chivo', rabbit: 'conejo', duck: 'pato',
  goose: 'ganso', quail: 'codorniz', venison: 'venado', bison: 'bisonte', poultry: 'aves', game: 'caza', broilers: 'broilers', broiler: 'broiler', fryers: 'freidores', roasting: 'para asar', stewing: 'para guisar',
  breast: 'pechuga', thigh: 'muslo', thighs: 'muslos', drumstick: 'muslito (pierna)', drumsticks: 'muslitos', wing: 'ala', wings: 'alas', leg: 'pierna', back: 'espalda', neck: 'cuello', giblets: 'menudencias',
  liver: 'hígado', heart: 'corazón', kidney: 'riñón', kidneys: 'riñones', tongue: 'lengua', tripe: 'mondongo', brain: 'sesos', feet: 'patas', loin: 'lomo', tenderloin: 'lomito', sirloin: 'solomo',
  chuck: 'paleta', round: 'pulpa (round)', brisket: 'pecho', flank: 'falda', rib: 'costilla', ribs: 'costillas', ribeye: 'ribeye', shoulder: 'paleta', shank: 'lagarto', steak: 'bistec', steaks: 'bistecs',
  chop: 'chuleta', chops: 'chuletas', ham: 'jamón', bacon: 'tocineta', sausage: 'salchicha', sausages: 'salchichas', frankfurter: 'salchicha', bologna: 'mortadela', salami: 'salami', pepperoni: 'pepperoni',
  chorizo: 'chorizo', patty: 'hamburguesa', patties: 'hamburguesas', meatballs: 'albóndigas', meatball: 'albóndiga', nuggets: 'nuggets', tenders: 'tiras', strips: 'tiras', belly: 'barriga', spareribs: 'costillas',
  // pescados y mariscos
  fish: 'pescado', tuna: 'atún', salmon: 'salmón', cod: 'bacalao', tilapia: 'tilapia', sardines: 'sardinas', sardine: 'sardina', mackerel: 'caballa', trout: 'trucha', catfish: 'bagre', halibut: 'halibut',
  haddock: 'eglefino', pollock: 'abadejo', snapper: 'pargo', grouper: 'mero', anchovies: 'anchoas', anchovy: 'anchoa', herring: 'arenque', shrimp: 'camarón', crab: 'cangrejo', lobster: 'langosta',
  clams: 'almejas', clam: 'almeja', oysters: 'ostras', oyster: 'ostra', scallops: 'vieiras', squid: 'calamar', octopus: 'pulpo', mussels: 'mejillones', seafood: 'mariscos', shellfish: 'mariscos', fillet: 'filete',
  // huevos y lácteos
  egg: 'huevo', eggs: 'huevos', yolk: 'yema', white: 'blanco', milk: 'leche', cheese: 'queso', yogurt: 'yogur', cream: 'crema', butter: 'mantequilla', whey: 'suero de leche', buttermilk: 'suero de mantequilla',
  skim: 'descremada', milkfat: 'grasa láctea', greek: 'griego', cheddar: 'cheddar', mozzarella: 'mozzarella', parmesan: 'parmesano', swiss: 'suizo', ricotta: 'ricota', provolone: 'provolone',
  gouda: 'gouda', feta: 'feta', fresco: 'fresco', queso: 'queso', blanco: 'blanco', custard: 'natilla', pudding: 'pudín', puddings: 'pudines', dulce: 'dulce', leche: 'leche',
  // cereales, panes y harinas
  rice: 'arroz', oats: 'avena', oat: 'avena', oatmeal: 'avena cocida', wheat: 'trigo', corn: 'maíz', barley: 'cebada', quinoa: 'quinoa', millet: 'mijo', rye: 'centeno', sorghum: 'sorgo', buckwheat: 'alforfón',
  bran: 'salvado', germ: 'germen', flour: 'harina', bread: 'pan', breads: 'panes', bun: 'pan de hamburguesa', roll: 'panecillo', rolls: 'panecillos', bagel: 'bagel', toast: 'tostada', crackers: 'galletas saladas',
  cracker: 'galleta salada', saltines: 'galletas de soda', cookies: 'galletas dulces', cookie: 'galleta dulce', cake: 'torta', cakes: 'tortas', muffin: 'muffin', pie: 'pie', pastry: 'pastelito', dough: 'masa',
  pasta: 'pasta', noodles: 'fideos', spaghetti: 'espagueti', macaroni: 'macarrones', tortilla: 'tortilla', tortillas: 'tortillas', cereal: 'cereal', cereals: 'cereales', granola: 'granola', grits: 'sémola de maíz',
  cornmeal: 'harina de maíz', masa: 'masa de maíz', arepa: 'arepa', semolina: 'sémola', couscous: 'cuscús', popcorn: 'cotufas', pretzels: 'pretzels', chips: 'papitas', grain: 'grano', grains: 'granos',
  'long-grain': 'grano largo', 'medium-grain': 'grano medio', 'short-grain': 'grano corto', parboiled: 'sancochado', glutinous: 'glutinoso', brown: 'integral',
  // legumbres, frutos secos y semillas
  beans: 'caraotas (frijoles)', bean: 'caraota (frijol)', lentils: 'lentejas', lentil: 'lenteja', chickpeas: 'garbanzos', peas: 'arvejas', pea: 'arveja', soybeans: 'soya', soybean: 'soya', soy: 'soya',
  tofu: 'tofu', hummus: 'hummus', peanuts: 'maní', peanut: 'maní', almonds: 'almendras', almond: 'almendra', walnuts: 'nueces', cashews: 'merey (anacardo)', cashew: 'merey', pistachio: 'pistacho',
  pistachios: 'pistachos', hazelnuts: 'avellanas', pecans: 'nueces pecanas', macadamia: 'macadamia', nuts: 'frutos secos', nut: 'fruto seco', seeds: 'semillas', seed: 'semilla', sesame: 'ajonjolí',
  sunflower: 'girasol', chia: 'chía', flaxseed: 'linaza', pumpkin: 'auyama', coconut: 'coco', cowpeas: 'frijol bayo', blackeyes: 'frijol ojo negro', lima: 'lima', fava: 'haba', mung: 'mungo',
  // verduras
  vegetables: 'vegetales', vegetable: 'vegetal', lettuce: 'lechuga', tomato: 'tomate', tomatoes: 'tomates', onion: 'cebolla', onions: 'cebollas', garlic: 'ajo', carrots: 'zanahorias', carrot: 'zanahoria',
  broccoli: 'brócoli', cauliflower: 'coliflor', cabbage: 'repollo', spinach: 'espinaca', kale: 'col rizada (kale)', celery: 'apio España', cucumber: 'pepino', zucchini: 'calabacín', eggplant: 'berenjena',
  peppers: 'pimentones', pepper: 'pimentón', squash: 'calabaza', potato: 'papa', potatoes: 'papas', beets: 'remolacha', beet: 'remolacha', radishes: 'rábanos', turnip: 'nabo', turnips: 'nabos',
  mushrooms: 'champiñones', mushroom: 'champiñón', asparagus: 'espárragos', artichokes: 'alcachofas', okra: 'quimbombó', leeks: 'ajoporro', chard: 'acelga', watercress: 'berro', cress: 'berro',
  greens: 'hojas verdes', leafy: 'de hoja', leaves: 'hojas', cassava: 'yuca', yam: 'ñame', taro: 'ocumo', plantains: 'plátanos', plantain: 'plátano', chayote: 'chayota', hearts: 'corazones', palm: 'palmito',
  cilantro: 'cilantro', parsley: 'perejil', basil: 'albahaca', ginger: 'jengibre', kernels: 'granos', cob: 'mazorca', sprouts: 'brotes', salad: 'ensalada', olives: 'aceitunas', olive: 'aceituna',
  // frutas
  fruit: 'fruta', fruits: 'frutas', bananas: 'cambur (banana)', banana: 'cambur (banana)', apples: 'manzanas', apple: 'manzana', oranges: 'naranjas', orange: 'naranja', papayas: 'lechosa (papaya)',
  papaya: 'lechosa (papaya)', mangos: 'mango', mango: 'mango', pineapple: 'piña', watermelon: 'patilla (sandía)', melons: 'melón', melon: 'melón', cantaloupe: 'melón', grapes: 'uvas', grape: 'uva',
  strawberries: 'fresas', strawberry: 'fresa', blueberries: 'arándanos', raspberries: 'frambuesas', blackberries: 'moras', cherries: 'cerezas', pears: 'peras', pear: 'pera', peaches: 'duraznos',
  peach: 'durazno', plums: 'ciruelas', prunes: 'ciruelas pasas', raisins: 'pasas', lemon: 'limón', lime: 'lima', limes: 'limas', lemons: 'limones', grapefruit: 'toronja', guava: 'guayaba', guavas: 'guayabas',
  avocados: 'aguacate', avocado: 'aguacate', kiwi: 'kiwi', tangerines: 'mandarinas', mandarin: 'mandarina', figs: 'higos', dates: 'dátiles', pomegranate: 'granada', soursop: 'guanábana', apricots: 'albaricoques',
  cranberries: 'arándanos rojos', applesauce: 'compota de manzana', juice: 'jugo', juices: 'jugos', nectar: 'néctar', peel: 'concha', pulp: 'pulpa', berries: 'bayas',
  // grasas, dulces y otros
  oil: 'aceite', oils: 'aceites', margarine: 'margarina', shortening: 'manteca', lard: 'manteca de cerdo', mayonnaise: 'mayonesa', dressing: 'aderezo', sauce: 'salsa', gravy: 'salsa (gravy)',
  ketchup: 'salsa de tomate', mustard: 'mostaza', vinegar: 'vinagre', salt: 'sal', sugar: 'azúcar', sugars: 'azúcares', honey: 'miel', syrup: 'jarabe', jam: 'mermelada', jelly: 'jalea',
  chocolate: 'chocolate', cocoa: 'cacao', candy: 'golosina', candies: 'golosinas', dessert: 'postre', desserts: 'postres', sweets: 'dulces', snacks: 'pasapalos', snack: 'pasapalo', spices: 'especias',
  cinnamon: 'canela', vanilla: 'vainilla', caramel: 'caramelo', topping: 'cobertura', icing: 'glaseado', gelatin: 'gelatina', yeast: 'levadura', baking: 'para hornear', starch: 'almidón',
  // bebidas
  beverages: 'bebidas', beverage: 'bebida', drink: 'bebida', drinks: 'bebidas', water: 'agua', coffee: 'café', tea: 'té', beer: 'cerveza', wine: 'vino', soda: 'refresco', cola: 'refresco de cola',
  lemonade: 'limonada', smoothie: 'batido', shake: 'batido', brewed: 'colado', decaffeinated: 'descafeinado', alcoholic: 'alcohólica', carbonated: 'gaseosa', sports: 'deportiva', energy: 'energía',
  // platos y comida rápida
  soup: 'sopa', soups: 'sopas', stew: 'guiso', sandwich: 'sándwich', pizza: 'pizza', burrito: 'burrito', taco: 'taco', hamburger: 'hamburguesa', cheeseburger: 'hamburguesa con queso', omelet: 'tortilla de huevo',
  casserole: 'pasticho', lasagna: 'lasaña', empanada: 'empanada', tamale: 'hallaca (tamal)', fries: 'papas fritas', dip: 'salsa para untar', breakfast: 'desayuno', dinner: 'cena', lunch: 'almuerzo',
  protein: 'proteína', nutritional: 'nutricional', supplement: 'suplemento', formula: 'fórmula', infant: 'infantil', toddler: 'niño pequeño', babyfood: 'comida para bebé', baby: 'bebé',
  vitamin: 'vitamina', calcium: 'calcio', iron: 'hierro', sodium: 'sodio', fiber: 'fibra', calorie: 'caloría', calories: 'calorías', product: 'producto', products: 'productos', food: 'alimento', foods: 'alimentos',
  black: 'negro', red: 'rojo', green: 'verde', yellow: 'amarillo', dark: 'oscuro', golden: 'dorado', pink: 'rosado', purple: 'morado', blue: 'azul',
  // más términos frecuentes en FDC
  fast: 'rápida', eaten: 'comido', new: 'nuevo', zealand: 'Zelanda', bar: 'barra', bars: 'barras', crust: 'corteza', recipe: 'receta', ice: 'hielo', home: 'casero', strained: 'colado',
  bottled: 'embotellado', italian: 'italiano', original: 'original', solution: 'solución', spread: 'untable', extra: 'extra', short: 'corto', diet: 'dieta', heavy: 'espesa', summer: 'verano',
  chili: 'chili', table: 'mesa', dog: 'perro', school: 'escolar', fluid: 'líquido', biscuit: 'bizcocho', biscuits: 'bizcochos', cherry: 'cereza', meatless: 'sin carne', english: 'inglés', acid: 'ácido',
  pancakes: 'panquecas', pancake: 'panqueca', double: 'doble', substitute: 'sustituto', loaf: 'pan de molde', rotisserie: 'rostizado', cooking: 'para cocinar', tender: 'tierno', slice: 'rebanada',
  classic: 'clásico', cranberry: 'arándano rojo', creamy: 'cremoso', winter: 'invierno', sweetener: 'edulcorante', noodle: 'fideo', whipped: 'batida', burger: 'hamburguesa', soymilk: 'bebida de soya',
  pasteurized: 'pasteurizado', stick: 'barra', sticks: 'barras', blueberry: 'arándano', barbecue: 'barbacoa', flesh: 'pulpa', mexican: 'mexicano', quick: 'rápido', cocktail: 'cóctel', broth: 'caldo',
  skirt: 'falda', filet: 'filete', outside: 'exterior', inside: 'interior', vegetarian: 'vegetariano', deer: 'venado', leaf: 'hoja', seaweed: 'alga', spanish: 'español', imitation: 'imitación',
  chinese: 'chino', american: 'americano', mollusks: 'moluscos', crustaceans: 'crustáceos', 'by-products': 'subproductos', 'tomato-based': 'a base de tomate', 'dark-green': 'verde oscuro',
  separable: 'separable', native: 'nativo', alaska: 'Alaska', australian: 'australiano', pack: 'empaque', heat: 'calor', filling: 'relleno', coating: 'cobertura', meal: 'harina', flavors: 'sabores',
  industrial: 'industrial', hydrogenated: 'hidrogenado', multigrain: 'multigrano', gluten: 'gluten', stage: 'etapa', partially: 'parcialmente', removed: 'retirado', moisture: 'humedad', puerto: 'Puerto',
  rican: 'Rico', junior: 'junior', program: 'programa', distribution: 'distribución', ingredient: 'ingrediente', nutrition: 'nutrición', breading: 'empanizado', snap: 'tierno', chip: 'chip',
  ready: 'listo', serve: 'servir', use: 'uso', single: 'individual', microwave: 'microondas', purchased: 'comprado', frosting: 'glaseado', flakes: 'hojuelas', root: 'raíz', kernel: 'grano',
  bakery: 'panadería', processing: 'procesamiento', 'pre-cooked': 'precocido', 'home-prepared': 'preparado en casa', seasoning: 'condimento', stuffing: 'relleno', entree: 'plato principal',
  choice: 'choice', select: 'select', prime: 'prime', grades: 'grados', variety: 'variedad', varieties: 'variedades', species: 'especies', wild: 'silvestre', farmed: 'de cultivo', domesticated: 'doméstico',
  composite: 'compuesto', retail: 'de venta al detal', center: 'centro', cut: 'corte', cuts: 'cortes', top: 'superior', bottom: 'inferior', eye: 'ojo', tip: 'punta', end: 'extremo', blade: 'paleta (blade)', arm: 'brazo',
};

// sinónimos de uso común: si la descripción original coincide, se agregan para que se encuentre en español
const SINONIMOS = [
  [/^bananas?(, ripe and slightly ripe)?, raw/i, ['cambur', 'banana', 'guineo']], [/^papayas?, raw/i, ['lechosa', 'papaya']], [/^watermelon, raw/i, ['patilla', 'sandía']],
  [/^plantains?, .*(yellow|ripe)/i, ['plátano maduro']], [/^plantains?, .*(green|underripe)/i, ['plátano verde']], [/^cassava/i, ['yuca']],
  [/^squash, winter/i, ['auyama', 'calabaza']], [/^passion-?fruit/i, ['parchita', 'maracuyá']], [/^beans, black, mature seeds/i, ['caraotas negras', 'frijoles negros']],
  [/^chickpeas/i, ['garbanzos']], [/^lentils/i, ['lentejas']], [/^avocados?, /i, ['aguacate']], [/^peanut butter/i, ['mantequilla de maní']], [/^peanuts?, /i, ['maní']],
  [/tuna.*canned in water/i, ['atún en agua']], [/^egg,? white, raw|eggs, .*egg white/i, ['clara de huevo', 'claras']], [/^egg, whole, (raw, fresh|raw$|cooked|boiled|fried|scrambled|poached)|^eggs, grade a, large, egg whole/i, ['huevo entero', 'huevo']],
  [/^chicken, (breast|broilers? or fryers?, breast).*(raw|meat only)/i, ['pechuga de pollo']], [/^chicken, .*thigh/i, ['muslo de pollo']], [/^beef, ground/i, ['carne molida']],
  [/^pork, .*loin/i, ['lomo de cerdo']], [/^fish, salmon/i, ['salmón']], [/queso blanco|cheese, white/i, ['queso blanco']], [/yogurt, greek/i, ['yogur griego']], [/whey protein powder|protein powder whey|whey protein isolate/i, ['proteína whey', 'whey']],
  [/^oats/i, ['avena', 'avena en hojuelas']], [/^rice, white/i, ['arroz blanco']], [/^rice, brown/i, ['arroz integral']], [/^quinoa/i, ['quinoa']], [/^sweet ?potato/i, ['batata', 'camote']],
  [/^potatoes?, /i, ['papa']], [/bread, whole-wheat/i, ['pan integral']], [/crackers, saltines/i, ['galletas de soda']], [/^snacks, rice cakes|^rice cake/i, ['galletas de arroz inflado']],
  [/^mangos?, raw/i, ['mango']], [/^pineapple, raw/i, ['piña']], [/^strawberries, raw/i, ['fresas']], [/^apples?, raw/i, ['manzana']], [/^oranges?, raw/i, ['naranja']], [/^grapes?, /i, ['uvas']],
  [/^melons?, cantaloupe/i, ['melón']], [/^pears?, raw/i, ['pera']], [/^kiwi/i, ['kiwi']], [/^oil, olive|olive oil/i, ['aceite de oliva']], [/^butter, (salted|without salt)/i, ['mantequilla']],
  [/^mayonnaise/i, ['mayonesa']], [/cheese, parmesan/i, ['queso parmesano']], [/cheese, (cheddar|gouda|swiss|monterey)/i, ['queso amarillo']], [/^nuts, almonds|^almonds/i, ['almendras']],
  [/^nuts, walnuts|^walnuts/i, ['nueces']], [/^fish, (cod|tilapia|haddock|pollock|whiting|flounder|sole)/i, ['pescado blanco']], [/^corn flour|^cornmeal, (whole|degermed|white|yellow)|masa harina, (white|yellow|dry)|^corn flour, masa/i, ['harina de maíz']],
  [/^arepa|arepa/i, ['arepa']], [/^tortillas?, .*flour/i, ['tortilla de harina']], [/^tortillas?, .*corn/i, ['tortilla de maíz']], [/^pasta, /i, ['pasta']], [/^spaghetti, (dry|cooked|whole)|^pasta, (dry|cooked)/i, ['espagueti', 'pasta']],
  [/^broccoli/i, ['brócoli']], [/^spinach/i, ['espinaca']], [/^tomatoes?, (red|grape|cherry|roma|raw)/i, ['tomate']], [/^onions?, /i, ['cebolla']], [/^peppers?, sweet/i, ['pimentón']],
  [/^cucumber/i, ['pepino']], [/^lettuce/i, ['lechuga']], [/^carrots?, /i, ['zanahoria']], [/^cabbage/i, ['repollo']], [/^zucchini|squash, summer, zucchini/i, ['calabacín']],
  [/^beverages, coffee|^coffee, brewed/i, ['café']], [/^milk, (whole|reduced fat|lowfat|nonfat)/i, ['leche']], [/^sugars?, granulated/i, ['azúcar']], [/^honey/i, ['miel']],
];

const minus = (s) => String(s || '').toLowerCase();
import { sinAcento, normalizarBusqueda } from './texto.js';
export { sinAcento, normalizarBusqueda };

function traducirSegmento(seg) {
  // las frases traducidas quedan protegidas (\u0001n\u0001) para no volver a traducir sus palabras ("a la plancha")
  const hechas = []; let t = ` ${seg.trim()} `;
  for (const [re, es] of FRASES) t = t.replace(re, () => { hechas.push(es); return ` \u0001${hechas.length - 1}\u0001 `; });
  return t.split(/(\s+|[\/()"%])/).map((w) => {
    if (!w || /^\s+$/.test(w) || /^[\/()"%]$/.test(w)) return w;
    const m = w.match(/^\u0001(\d+)\u0001$/); if (m) return hechas[Number(m[1])];
    const k = minus(w);
    return Object.prototype.hasOwnProperty.call(PALABRAS, k) ? PALABRAS[k] : w;
  }).join('').replace(/\s+/g, ' ').trim();
}

// "Chicken, breast, boneless, skinless, raw" → "Pollo, pechuga, sin hueso, sin piel, crudo"
const ACEITES = { olive: 'de oliva', coconut: 'de coco', canola: 'de canola', soybean: 'de soya', sunflower: 'de girasol', corn: 'de maíz', avocado: 'de aguacate', peanut: 'de maní', sesame: 'de ajonjolí', safflower: 'de cártamo', palm: 'de palma', vegetable: 'vegetal' };
export function traducirDescripcion(desc) {
  const orig = String(desc || '').split(/\s*,\s*/);
  const segs = orig.map((s, i) => (i === 1 && /^oil$/i.test(orig[0]) && ACEITES[s.toLowerCase()] ? ACEITES[s.toLowerCase()]
    : i === 1 && /^eggs?$/i.test(orig[0]) && /^(white|yolk)s?$/i.test(s) ? (/^white/i.test(s) ? 'clara' : 'yema') : traducirSegmento(s))).filter(Boolean);
  const t = segs.join(', ');
  return t ? t[0].toUpperCase() + t.slice(1) : t;
}
// "Fish, tuna, light, canned…" → "atún"; "Nuts, almonds…" → "almendras": la clase va primero en inglés
const CLASES = /^(fish|nuts|seeds|crustaceans|mollusks|beverages|cereals ready-to-eat|snacks)$/i;
export function sinonimosDe(desc) {
  const out = new Set();
  SINONIMOS.forEach(([re, ss]) => { if (re.test(desc)) ss.forEach((x) => out.add(x)); });
  const seg = String(desc || '').split(/\s*,\s*/);
  if (seg.length > 1 && CLASES.test(seg[0]) && !palabrasSinTraducir(seg[1]).length) { const t = traducirDescripcion(seg[1]).toLowerCase(); if (t.length > 2) out.add(t); }
  if (/^spices, pepper, black/i.test(desc)) out.add('pimienta negra');
  return [...out];
}
// cuántas palabras quedaron sin traducir (para saber si conviene revisar el nombre)
// (se mide sobre la traducción: lo que quedó en inglés)
export function palabrasSinTraducir(desc) {
  const es = traducirDescripcion(desc).toLowerCase();
  return String(desc || '').toLowerCase().match(/[a-z][a-z'\-]*/g)?.filter((w) => w.length > 2 && !Object.prototype.hasOwnProperty.call(PALABRAS, w) && new RegExp(`(^|[^a-z])${w.replace(/[-']/g, '.')}([^a-z]|$)`).test(es)) || [];
}
