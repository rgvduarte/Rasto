"""Gera src/data/pois.json: os pontos do mapa, com coordenadas tiradas dos dados abertos (nunca à mão).

Cada entrada da lista CURATED diz onde ir buscar a geometria:
  ('places', nome)     Overture places (Meta/Microsoft/Foursquare e OSM)
  ('buildings', nome)  edifício do OpenStreetMap (via Overture buildings)
  ('infra', nome)      infraestrutura do OpenStreetMap (miradouros, aqueduto, barragem...)
Se a fonte não tiver o nome exato, o script falha: assim não entra no mapa nenhum ponto sem posição verificável.

Dados do TripAdvisor (posição no ranking, classificação, n.º de opiniões, URL) vêm de scripts/data/tripadvisor.json,
recolhidos por pesquisa em 13 out 2026. A ligação nome-TA -> id está em TA_MATCH.
"""
import json, os, sys, math, re
import pyarrow.parquet as pq
from shapely import wkb
from shapely.geometry import shape, Point
from shapely.ops import nearest_points

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
OVT = os.path.join(ROOT, '.geo-cache', 'overture')
CAOP = os.path.join(ROOT, 'node_modules', '@cartography', 'pt', 'dist')

# id, família, tipo, nome a mostrar, (fonte, nome na fonte), resumo
# família: ver | provar | ficar
# tipo (ícone): castelo, muralha, igreja, ermida, torre, palacio, aqueduto, museu, cante, cultura, miradouro,
#               rio, barragem, azenha, experiencia, restaurante, petiscos, pastelaria, pizzaria, queijo, vinho,
#               loja, hotel, casa, campismo
CURATED = [
    # --- Serpa, dentro e junto às muralhas
    ('castelo-serpa', 'ver', 'castelo', 'Castelo de Serpa', ('places', 'Castelo de Serpa'),
     'Castelo medieval, reconstruído no reinado de D. Dinis. Em 1707, quando as tropas espanholas do duque de Osuna saíram de Serpa, uma explosão destruiu uma das torres. Lá dentro funciona o Museu Municipal de Arqueologia.'),
    ('museu-arqueologia', 'ver', 'museu', 'Museu Municipal de Arqueologia', ('buildings', 'Museu Arqueológico de Serpa'),
     'Museu dentro do castelo, com espólio da Pré-História à época romana.'),
    ('muralhas-serpa', 'ver', 'muralha', 'Muralhas de Serpa', ('buildings', 'Muralhas de Serpa'),
     'Cerca medieval de dupla muralha com torreões, reerguida no reinado de D. Dinis. Conserva as Portas de Beja e de Moura. Monumento Nacional.'),
    ('aqueduto-serpa', 'ver', 'aqueduto', 'Aqueduto de Serpa', ('infra', 'Aqueduto de Serpa'),
     'Aqueduto do final do século XVII, construído sobre a muralha para levar água ao Palácio dos Condes de Ficalho. Acaba numa grande nora.'),
    ('torre-relogio-serpa', 'ver', 'torre', 'Torre do Relógio', ('buildings', 'Torre do Relógio', 37.944),
     'Torre da muralha do burgo medieval, adaptada a torre de relógio em 1440, junto à entrada do castelo.'),
    ('igreja-santa-maria', 'ver', 'igreja', 'Igreja de Santa Maria', ('places', 'Igreja de Santa Maria'),
     'Igreja matriz de Serpa, erguida entre o final do século XIII e o início do XV, no largo das oliveiras e dos ciprestes. Monumento Nacional.'),
    ('santuario-carmo', 'ver', 'igreja', 'Santuário de Nossa Senhora do Carmo', ('buildings', 'Santuário de Nossa Senhora do Carmo'),
     'Igreja neoclássica do final do século XVIII, dentro das muralhas, a quem chamam o Santuário.'),
    ('palacio-ficalho', 'ver', 'palacio', 'Palácio dos Condes de Ficalho', ('places', 'Palácio Ficalho'),
     'Palácio encostado à muralha, iniciado no final do século XVI e remodelado no XVII. Recebia a água do aqueduto. Monumento Nacional desde 2007.'),
    ('igreja-salvador', 'ver', 'igreja', 'Igreja do Salvador', ('buildings', 'Igreja Paroquial do Salvador'),
     'Igreja no Largo do Salvador, com painéis de azulejo. Abre sobretudo nas celebrações.'),
    ('misericordia-serpa', 'ver', 'igreja', 'Igreja da Misericórdia', ('buildings', 'Igreja da Santa Casa da Misericórdia de Serpa'),
     'Igreja da Santa Casa da Misericórdia, de 1505, com portal gótico e talha dourada.'),
    ('convento-sao-paulo', 'ver', 'igreja', 'Convento e Igreja de São Paulo', ('buildings', 'Convento e Igreja de São Paulo'),
     'Convento de frades paulistas da Serra de Ossa, começado no final do século XVII, com interior barroco.'),
    ('convento-santo-antonio', 'ver', 'igreja', 'Convento de Santo António', ('buildings', 'Convento de Santo António', 37.946),
     'Antigo convento franciscano mandado erguer em 1463 pelo Infante D. Fernando e reconstruído em 1502, com portal gótico e claustro. Monumento Nacional.'),
    ('igreja-n-sra-saude', 'ver', 'igreja', 'Igreja de Nossa Senhora da Saúde', ('buildings', 'Igreja de Nossa Senhora da Saúde'),
     'Igreja do final do século XVI, com o interior quase todo revestido de azulejo de padrão.'),
    ('capela-sao-roque', 'ver', 'ermida', 'Capela de São Roque', ('buildings', 'Capela de São Roque'),
     'Ermida manuelina do início do século XVI, na Rua João de Deus.'),
    ('capela-remedios', 'ver', 'ermida', 'Capela de Nossa Senhora dos Remédios', ('buildings', 'Capela de Nossa Senhora dos Remédios'),
     'Capela no largo do mesmo nome, a norte do centro histórico.'),
    ('capela-calvario', 'ver', 'ermida', 'Capela do Calvário', ('buildings', 'Capela de Calvário'),
     'Pequena capela junto à Rua do Calvário.'),
    ('ermida-sao-pedro', 'ver', 'ermida', 'Ermida de São Pedro', ('buildings', 'Ermida de São Pedro', 37.941),
     'Ermida manuelina do início do século XVI, numa eira com árvores na Rua de São Pedro.'),
    ('ermida-sao-sebastiao', 'ver', 'ermida', 'Ermida de São Sebastião', ('buildings', 'Ermida de São Sebastião', 37.947),
     'Ermida manuelina do início do século XVI, à saída norte da cidade.'),
    ('ermida-sao-bras', 'ver', 'ermida', 'Ermida de São Brás', ('buildings', 'Ermida de São Brás'),
     'Ermida isolada a sul da cidade.'),
    ('ermida-guadalupe', 'ver', 'ermida', 'Ermida de Nossa Senhora de Guadalupe', ('buildings', 'Ermida de Nossa Senhora de Guadalupe'),
     'Santuário do início do século XVI no Alto de São Gens. O concelho foi consagrado a Nossa Senhora de Guadalupe em 1946.'),
    ('atalaia-da-torre', 'ver', 'torre', 'Atalaia da Torre', ('infra', 'Atalaia da Torre'),
     'Torre de vigia isolada a norte de Serpa, sobre a estrada de Brinches.'),
    # --- museus e cultura
    ('museu-relogio', 'ver', 'museu', 'Museu do Relógio', ('places', 'Museu do Relógio (Convento do Mosteirinho)'),
     'Museu de relojoaria aberto em 1995 no antigo Convento do Mosteirinho, com oficina de reparação.'),
    ('museu-etnografico', 'ver', 'museu', 'Museu Etnográfico de Serpa', ('places', 'Museu Etnográfico de Serpa'),
     'Ofícios artesanais e trabalho agrícola, incluindo o fabrico do queijo. No Largo do Corro.'),
    ('casa-do-cante', 'ver', 'cante', 'Casa do Cante', ('places', 'Casa do Cante'),
     'Centro dedicado ao cante alentejano, Património Cultural Imaterial da Humanidade desde 2014. Rua dos Cavalos.'),
    ('musiberia', 'ver', 'cultura', 'Musibéria', ('places', 'Musibéria'),
     'Centro de música e dança, com espetáculos e residências artísticas.'),
    ('cine-teatro-serpa', 'ver', 'cultura', 'Cine-Teatro Municipal de Serpa', ('places', 'Cine-Teatro Municipal de Serpa'),
     'Sala de espetáculos e cinema do município.'),
    ('noites-na-nora', 'ver', 'cultura', 'Noites na Nora', ('places', 'Noites Na Nora'),
     'Espaço da programação de verão Noites na Nora, da companhia de teatro baal17, sediada em Serpa.'),
    ('museu-vnsb', 'ver', 'museu', 'Museu de Vila Nova de São Bento', ('landuse', 'Praceta Dona Maria do Carmo Horta Barroso'),
     'Museu na Praceta D. Maria do Carmo Horta Barroso. Posição pela morada.'),
    # --- Guadiana, água e natureza
    ('pulo-do-lobo', 'ver', 'rio', 'Pulo do Lobo', ('infra', 'Miradouro do Pulo do Lobo'),
     'O Guadiana aperta-se entre margens de xisto e cai numa garganta. Fica no Parque Natural do Vale do Guadiana.'),
    ('miradouro-sao-gens', 'ver', 'miradouro', 'Miradouro de São Gens', ('infra', 'Miradouro', 37.9296),
     'Miradouro junto à ermida de Guadalupe, o ponto alto à volta da cidade.'),
    ('barragem-enxoe', 'ver', 'barragem', 'Barragem do Enxoé', ('infra', 'Barragem do Enxoé'),
     'Albufeira na ribeira do Enxoé, entre Serpa e Vale de Vargo.'),
    ('ponte-enxoe', 'ver', 'aqueduto', 'Ponte sobre a ribeira do Enxoé', ('infra', 'Ponte sobre a ribeira do Enxoé'),
     'Ponte junto à EN 255, entre Serpa e Pias, já referida em documentos de 1758.'),
    ('barragem-romana', 'ver', 'barragem', 'Barragem romana do Muro dos Mouros', ('landuse', 'Barragem Romana do Muro dos Mouros'),
     'Vestígios de uma barragem de época romana, conhecida como Muro dos Mouros.'),
    ('azenhas-guadiana', 'ver', 'azenha', 'Azenhas do Guadiana', ('buildings', 'Moinhos do Porto de Vale de Beirão', 37.9906),
     'Moinhos de água de pedra no leito do Guadiana. Há dezenas ao longo da margem do concelho.'),
    ('burrico-orada', 'ver', 'experiencia', "Burrico d'Orada", ('places', "Burrico d'Orada"),
     'Alojamento rural com experiências, como provas de vinho de talha e passeios no Alqueva.'),
    # --- o Ramal de Moura (antiga linha de comboio Beja–Moura)
    ('estacao-pias', 'ver', 'estacao', 'Antiga estação de Pias', ('places', 'Estação Ferroviária de Pias'),
     'Estação do Ramal de Moura, a linha de comboio que ligava Beja a Moura, a sul da vila de Pias.'),
    ('estacao-serpa-brinches', 'ver', 'estacao', 'Antiga estação de Serpa-Brinches', ('buildings', 'Antiga Estação de Serpa-Brinches'),
     'A estação de Serpa no Ramal de Moura, a meio caminho entre a cidade e Brinches.'),
    ('paragem-ponte-guadiana', 'ver', 'estacao', 'Paragem de Ponte do Guadiana', ('places', 'Paragem de Ponte do Guadiana'),
     'Antiga paragem do Ramal de Moura junto à ponte sobre o Guadiana.'),
    ('paragem-pipa', 'ver', 'estacao', 'Paragem de Pipa', ('places', 'Paragem de Pipa'),
     'Antiga paragem do Ramal de Moura entre Pias e Moura.'),
    # --- aldeias
    ('igreja-a-do-pinto', 'ver', 'igreja', 'Igreja de A-do-Pinto', ('buildings', 'Igreja de Aldeia do Pinto'),
     'Igreja da aldeia de A-do-Pinto, a nascente de Serpa.'),
    ('igreja-brinches', 'ver', 'igreja', 'Igreja Matriz de Brinches', ('buildings', 'Igreja Matriz de Brinches'),
     'Igreja matriz da aldeia de Brinches, a norte de Serpa.'),
    ('torre-relogio-pias', 'ver', 'torre', 'Torre do Relógio de Pias', ('buildings', 'Torre do Relógio', 38.023),
     'Torre do relógio no Largo Nuno Álvares, em Pias.'),
    ('ermida-santa-luzia-pias', 'ver', 'ermida', 'Ermida de Santa Luzia', ('buildings', 'Ermida de Santa Lúzia'),
     'Ermida do início do século XVI, a 2 km de Pias na estrada para Moura, com capitéis manuelinos. Imóvel de Interesse Público.'),
    ('igreja-sao-francisco-vnsb', 'ver', 'igreja', 'Igreja de São Francisco', ('buildings', 'Igreja de São Francisco', 37.9266),
     'Igreja no centro de Vila Nova de São Bento.'),
    ('igreja-sao-bento-vnsb', 'ver', 'igreja', 'Igreja de São Bento', ('buildings', 'Igreja de São Bento', 37.9287),
     'Igreja de Vila Nova de São Bento, dedicada ao padroeiro da aldeia.'),
    ('igreja-sao-sebastiao-vvargo', 'ver', 'igreja', 'Igreja de São Sebastião', ('buildings', 'Igreja de São Sebastião', 37.984),
     'Igreja de Vale de Vargo.'),
    ('igreja-sao-jorge-ficalho', 'ver', 'igreja', 'Igreja de São Jorge', ('buildings', 'Igreja de São Jorge'),
     'Igreja de Vila Verde de Ficalho, a 3 km da fronteira. As festas são em agosto.'),
    ('ermida-pazes-ficalho', 'ver', 'ermida', 'Ermida de Nossa Senhora das Pazes', ('buildings', 'Ermida Nossa Senhora das Pazes'),
     'Ermida no sítio de Nossa Senhora das Pazes, a nascente de Vila Verde de Ficalho, já perto de Espanha.'),
    ('igreja-santa-iria', 'ver', 'igreja', 'Igreja de Santa Iria', ('buildings', 'Igreja Paroquial de Santa Iria'),
     'Igreja da aldeia de Santa Iria, junto à estrada da Mina de São Domingos.'),
    ('capela-vales-mortos', 'ver', 'ermida', 'Capela de Vales Mortos', ('buildings', 'Capela de Vales Mortos'),
     'Capela da aldeia de Vales Mortos, no sul do concelho.'),

    # --- mesa: Serpa
    ('molho-bico', 'provar', 'restaurante', 'Molhó Bico', ('places', 'Molhó Bico'), 'Cozinha alentejana numa antiga adega da Rua Quente.'),
    ('o-alentejano', 'provar', 'restaurante', 'O Alentejano', ('places', 'Restaurante Alentejano'), 'Cozinha alentejana na Praça da República, com borrego e porco.'),
    ('o-engrola', 'provar', 'petiscos', 'O Engrola', ('places', 'O Engrola'), 'Comida caseira; a ementa muda com o que há no dia, como a açorda de bacalhau.'),
    ('cervejaria-lebrinha', 'provar', 'restaurante', 'Cervejaria Lebrinha', ('places', 'Cervejaria Lebrinha'), 'Cervejaria na Rua do Calvário: cerveja à pressão, migas e ensopado de borrego.'),
    ('a-piscina', 'provar', 'restaurante', 'Marisqueira A Piscina', ('places', 'Restaurante A Piscina - Serpa'), 'Marisco e grelhados, junto ao parque de campismo municipal.'),
    ('casa-paixao', 'provar', 'pastelaria', 'Casa Paixão', ('places', 'Casa Paixão'), 'Fábrica de queijadas de Serpa desde 1977, com café e pequeno-almoço.'),
    ('pizzaria-serpense', 'provar', 'pizzaria', 'Pizzaria Serpense', ('places', 'Pizzaria Serpense'), 'Pizzaria com take-away e entregas.'),
    ('pedra-de-sal', 'provar', 'restaurante', 'Pedra de Sal', ('places', 'Pedra de Sal'), 'Na Estrada da Circunvalação. Migas e carnes grelhadas.'),
    ('taberna-velhinha', 'provar', 'petiscos', 'Taberna Velhinha', ('divisions', 'Largo dos Santos Próculo e Hilarião'), 'Taberna com esplanada no Largo dos Santos Próculo e Hilarião. Posição pela morada.'),
    ('a-mondadeira', 'provar', 'restaurante', 'A Mondadeira', ('places', 'A Mondadeira - Restaurante'), 'Grelhados, como porco preto.'),
    ('o-paciencias', 'provar', 'restaurante', 'O Paciências', ('places', 'O Paciências'), 'Café com esplanada na Praça da República, com pratos alentejanos.'),
    ('cafe-sevilha', 'provar', 'petiscos', 'Café Sevilha', ('places', 'Café Sevilha'), 'Cerveja à pressão, pastelaria caseira e febras, na Rua de Sevilha.'),
    ('arrozinho-de-feijao', 'provar', 'restaurante', 'Arrozinho de Feijão', ('places', 'Arrozinho de Feijão'), 'Cozinha portuguesa no Loteamento da Cruz Nova.'),
    ('tasca-da-praca', 'provar', 'petiscos', 'Tasca da Praça', ('divisions', 'Praça da República', 37.9435), 'Petiscos na Praça da República, como torresmos e bacalhau à tasca. Posição pela morada.'),
    ('san-marino', 'provar', 'pizzaria', 'San Marino Pizzaria', ('places', 'San Marino Pizzaria'), 'Pizzaria na Rua Francisco Relógio.'),
    ('chanca-serpa-hotel', 'provar', 'restaurante', 'Chança · Serpa Hotel', ('buildings', 'Serpa Hotel'), 'Restaurante do Serpa Hotel, com cozinha alentejana e vinhos da região.'),
    ('dona-brites', 'provar', 'restaurante', 'Clube de Tiro Dona Brites', ('places', 'Restaurante Dona Brites'), 'Restaurante do campo de tiro, junto à EN 255: bacalhau e petiscos de queijo e chouriço.'),
    # --- mesa: aldeias
    ('o-adro-pias', 'provar', 'restaurante', 'O Adro', ('places', 'Restaurante O Adro'), 'No Largo de Santo António, em Pias: peixe, marisco e porco preto.'),
    ('pedreira-pias', 'provar', 'restaurante', 'Pedreira', ('places', 'Pedreira - Restaurante & Cervejaria'), 'Restaurante e cervejaria em Pias.'),
    ('o-trindade-pias', 'provar', 'restaurante', 'O Trindade', ('places', 'Restaurante O Trindade (Pias)'), 'Açorda de marisco e porco preto, em Pias.'),
    ('o-lagar-pias', 'provar', 'restaurante', 'O Lagar', ('places', 'Restaurante Bar O Lagar'), 'Cozinha regional na Estrada de Brinches, em Pias.'),
    ('pica-chouricos-pias', 'provar', 'petiscos', 'Taberna Pica Chouriços', ('places', 'Taberna Pica Chouriços'), 'Taberna em Pias.'),
    ('tapas-come-vnsb', 'provar', 'petiscos', 'TAPAS.COMe', ('places', 'TAPAS.COMe'), 'Tapas e petiscos em Vila Nova de São Bento.'),
    ('a-bica-vnsb', 'provar', 'restaurante', 'A Bica', ('places', 'Restaurante A Bica'), 'Restaurante em Vila Nova de São Bento.'),
    ('d-aldeia-vnsb', 'provar', 'restaurante', "D'Aldeia", ('places', "Restaurante D'Aldeia"), 'Restaurante em Vila Nova de São Bento.'),
    ('boa-vista-ficalho', 'provar', 'restaurante', 'Boa Vista', ('places', 'Boa Vista'), 'Na Estrada Internacional, junto à fronteira: marisco e arroz de marisco.'),
    ('cafe-alves-ficalho', 'provar', 'restaurante', 'Café Alves', ('places', 'Cafe alves ficalho'), 'Grelhados e cozinha portuguesa e brasileira, em Vila Verde de Ficalho.'),
    ('o-patrimonio-ficalho', 'provar', 'restaurante', 'O Património', ('places', 'O Patrimonio'), 'Bacalhau frito e costeletas de borrego, em Vila Verde de Ficalho.'),
    ('dimas-ficalho', 'provar', 'restaurante', 'Dimas', ('places', 'Restaurante Dimas'), 'Pequenos-almoços e cozinha alentejana, em Vila Verde de Ficalho.'),
    ('agostinho-vale-do-poco', 'provar', 'restaurante', 'Café Restaurante Agostinho', ('places', 'Restaurante Agostinho'), 'Em Vale do Poço, na estrada de Serpa para Mértola: pratos alentejanos, peixe e grelhados.'),
    # --- produtores
    ('queijaria-guilherme', 'provar', 'queijo', 'Queijaria Guilherme', ('buildings', 'Queijaria Guilherme'),
     'Queijaria no sul do concelho. O Queijo Serpa DOP faz-se com leite cru de ovelha e flor de cardo.'),
    ('monte-das-louzeiras', 'provar', 'vinho', 'Monte das Louzeiras', ('places', 'Monte das Louzeiras'),
     'Azeite e vinho em Vale de Vargo, com provas (também de vinho de ânfora) e lugares para autocaravanas no olival.'),
    ('monge-e-filhas', 'provar', 'vinho', 'Vinhos de Serpa · Monge e Filhas', ('places', 'Monge e Filhas-Vinhos de Serpa, Lda'), 'Produtor de vinho em Serpa.'),
    ('familia-margaca', 'provar', 'vinho', 'Família Margaça', ('places', 'FamÍLia MargaÇA'),
     'Adega familiar de Pias, dos anos 1970, com visita à adega e ao museu e prova de vinhos, incluindo vinho de talha.'),
    ('adega-do-montado', 'provar', 'vinho', 'Adega do Montado', ('places', 'Adega do Montado'), 'Adega em Brinches.'),
    ('bagas-de-ouro', 'provar', 'loja', 'Monte das Bagas de Ouro', ('places', 'Monte das Bagas de Ouro by Adega do Montado'), 'Loja da Adega do Montado em Serpa.'),
    ('d-luis-regionais', 'provar', 'loja', 'D. Luís · Produtos Regionais', ('places', 'D. LUÍS- Produtos Regionais'), 'Loja de produtos regionais junto à Praça da República.'),
    ('luzia-pos-de-mina', 'provar', 'pastelaria', 'Luzia · Doçaria', ('places', 'Luzia Pós de Mina -  Doçaria'), 'Doçaria em Pias.'),

    # --- ficar
    ('pousada-sao-gens', 'ficar', 'hotel', 'Pousada de Serpa · São Gens', ('places', 'Pousada de Sao Gens'), 'Pousada no alto de São Gens, ao lado da ermida de Guadalupe.'),
    ('serpa-hotel', 'ficar', 'hotel', 'Serpa Hotel', ('buildings', 'Serpa Hotel'), 'Hotel a poente do centro, com o restaurante Chança.'),
    ('hotel-beatriz', 'ficar', 'hotel', 'Hotel Beatriz', ('places', 'Hotel Beatriz'), 'Hotel no centro de Serpa.'),
    ('hotel-pulo-do-lobo', 'ficar', 'hotel', 'Hotel Pulo do Lobo', ('places', 'Hotel Pulo do Lobo'), 'Hotel a sul do centro de Serpa.'),
    ('casa-de-serpa', 'ficar', 'casa', 'Casa de Serpa', ('places', 'Casa de Serpa - Turismo Rural'), 'Turismo rural no centro histórico.'),
    ('casa-da-muralha', 'ficar', 'casa', 'Casa da Muralha', ('places', 'Casa da Muralha'), 'Casa encostada à muralha, no centro histórico.'),
    ('casa-do-canico', 'ficar', 'casa', 'Casa do Caniço', ('places', 'Casa do Caniço'), 'Alojamento no centro histórico.'),
    ('casa-da-palmeira', 'ficar', 'casa', 'Casa da Palmeira', ('places', 'Casa da Palmeira'), 'Alojamento no centro histórico.'),
    ('horta-das-laranjas', 'ficar', 'casa', 'Horta das Laranjas', ('places', 'Horta das Laranjas Alojamento Local'), 'Alojamento local em Serpa.'),
    ('flor-d-amendoeira', 'ficar', 'casa', "Flor d'Amendoeira", ('places', "Flor d' Amendoeira - Alojamento local"), 'Alojamento local em Serpa.'),
    ('herdade-da-retorta', 'ficar', 'casa', 'Herdade da Retorta', ('places', 'Herdade Da Retorta'), 'Herdade com alojamento a norte de Serpa.'),
    ('monte-da-morena', 'ficar', 'casa', 'Monte da Morena', ('places', 'Monte da Morena Agro Turismo Lda'), 'Agroturismo a poente de Serpa.'),
    ('melrinitas', 'ficar', 'casa', 'Melrinitas', ('places', 'Melrinitas Turismo Rural'), 'Turismo rural entre Serpa e o Guadiana.'),
    ('quinta-marugo', 'ficar', 'casa', 'Quinta Marugo', ('places', 'Quinta Marugo Retreats'), 'Alojamento rural a sul de Serpa.'),
    ('betica-pias', 'ficar', 'hotel', 'Bética Hotel Rural', ('places', 'Bética Hotel Rural'), 'Hotel rural em Pias.'),
    ('pias-guesthouse', 'ficar', 'casa', 'Pias Guesthouse', ('places', 'Pias Guesthouse'), 'Alojamento em Pias.'),
    ('moinhos-velhos-brinches', 'ficar', 'casa', 'Moinhos Velhos', ('places', 'Moinhos Velhos - Alojamento Local'), 'Alojamento local em Brinches.'),
    ('monte-dos-alpendres', 'ficar', 'casa', 'Monte dos Alpendres', ('places', 'Monte dos Alpendres I Farmhouse '), 'Casa de campo a poente de Pias.'),
    ('ninho-da-poupa', 'ficar', 'casa', 'Ninho da Poupa', ('places', 'Ninho Da Poupa'), 'Alojamento rural perto de A-do-Pinto.'),
    ('cantar-do-grilo', 'ficar', 'casa', 'Cantar do Grilo', ('places', 'Cantar do Grilo'), 'Alojamento rural no sul do concelho.'),
    ('vale-de-milhanos', 'ficar', 'casa', 'Habitat · Vale de Milhanos', ('places', 'Habitat - Vale de Milhanos'), 'Alojamento rural em Vales Mortos.'),
    ('vila-belita', 'ficar', 'casa', 'Vila Belita', ('places', 'Vila Belita'), 'Alojamento em Vila Verde de Ficalho.'),
    ('campismo-serpa', 'ficar', 'campismo', 'Parque de Campismo de Serpa', ('places', 'Parque de Campismo de Serpa'), 'Parque de campismo municipal, junto às piscinas.'),
]

# id do ponto -> nome exato no tripadvisor.json
TA_MATCH = {
    'castelo-serpa': 'Castelo de Serpa', 'museu-relogio': 'Museu do Relogio', 'aqueduto-serpa': 'Aqueduto de Serpa',
    'muralhas-serpa': 'Muralhas de Serpa', 'monte-das-louzeiras': 'Monte Das Louzeiras',
    'ermida-guadalupe': 'Ermida de Nossa Senhora de Guadalupe', 'torre-relogio-serpa': 'Torre do Relógio',
    'igreja-salvador': 'Igreja de Nossa Senhora de Guadalupe (Igreja de São Salvador)',
    'convento-sao-paulo': 'Igreja e Convento de São Paulo / Mosteiro de Nossa Senhora da Consolação',
    'museu-etnografico': 'Museu Etnográfico de Serpa', 'igreja-santa-maria': 'Igreja de Santa Maria',
    'igreja-santa-iria': 'Igreja Paroquial de Santa Iria', 'museu-arqueologia': 'Museu Municipal de Arqueologia',
    'ermida-sao-sebastiao': 'Ermida de São Sebastião', 'igreja-sao-bento-vnsb': 'Igreja de São Bento',
    'santuario-carmo': 'Santuário de Nossa Senhora do Carmo', 'convento-santo-antonio': 'Igreja de São Francisco',
    'capela-sao-roque': 'Capela de São Roque', 'ermida-sao-bras': 'Ermida de São Brás', 'ermida-santa-luzia-pias': 'Ermida de Santa Luzia',
    'igreja-n-sra-saude': 'Igreja de Nossa Senhora da Saúde', 'ermida-sao-pedro': 'Ermida de São Pedro',
    'misericordia-serpa': 'Misericórdia de Serpa', 'ponte-enxoe': 'Ponte sobre a ribeira do Enxoé',
    'museu-vnsb': 'Museu de Vila Nova de S. Bento', 'barragem-romana': 'Barragem romana do Muro dos Mouros',
    'capela-remedios': 'Capela de Nossa Senhora dos Remédios', 'capela-calvario': 'Capela de Calvário',
    'burrico-orada': 'Burrico D`Orada - Lodging & Experiences', 'palacio-ficalho': 'Palácio dos Condes de Ficalho',
    'igreja-sao-jorge-ficalho': 'Igreja de São Jorge', 'ermida-pazes-ficalho': 'Ermida de Nossa Senhora das Pazes',
    'familia-margaca': 'Família Margaça', 'torre-relogio-pias': 'Torre do Relógio de Pias', 'pulo-do-lobo': 'Pulo do Lobo',
    'molho-bico': 'Restaurante Molho Bico', 'o-alentejano': 'O Alentejano', 'o-engrola': 'O Engrola',
    'cervejaria-lebrinha': 'Cervejaria Lebrinha', 'a-piscina': 'Restaurante Marisqueira A Piscina', 'casa-paixao': 'Casa Paixao',
    'pizzaria-serpense': 'Pizzaria Serpense', 'pedra-de-sal': 'Pedra De Sal Restaurante - Serpa - Portugal',
    'taberna-velhinha': 'Taberna Velhinha', 'a-mondadeira': 'A Mondadeira - Restaurante', 'o-paciencias': 'Café O Paciências',
    'cafe-sevilha': 'Café Sevilha', 'arrozinho-de-feijao': 'Arrozinho de Feijão', 'tapas-come-vnsb': 'TAPAS.COMe',
    'tasca-da-praca': 'Tasca Da Praça', 'dona-brites': 'Clube De Tiro Dona Brites', 'san-marino': 'San Marino Pizzaria',
    'agostinho-vale-do-poco': 'Café Restaurante Agostinho', 'o-adro-pias': 'Restaurante O Adro',
    'pedreira-pias': 'Pedreira Restaurante & Cervejaria', 'o-trindade-pias': 'Restaurante o Trindade', 'o-lagar-pias': 'O Lagar',
    'cafe-alves-ficalho': 'Cafe Alves', 'boa-vista-ficalho': 'Restaurante Boa Vista', 'o-patrimonio-ficalho': 'O Patrimonio',
    'dimas-ficalho': 'Restaurante Dimas', 'd-aldeia-vnsb': "Restaurante D'Aldeia",
}


def load(name, cols):
    return pq.read_table(os.path.join(OVT, f'{name}.parquet'), columns=cols).to_pylist()


SRC = {
    'places': load('places', ['id', 'names', 'geometry', 'websites', 'phones', 'basic_category', 'confidence']),
    'buildings': load('buildings', ['id', 'names', 'geometry']),
    'infra': load('infra', ['id', 'names', 'geometry']),
    'landuse': load('landuse', ['id', 'names', 'geometry']),
    'divisions': load('divisions', ['id', 'names', 'geometry']),
}


def locate(src, name, near_lat=None):
    rows = [r for r in SRC[src] if ((r.get('names') or {}).get('primary') or '') == name]
    if near_lat is not None:
        rows = [r for r in rows if abs(wkb.loads(r['geometry']).centroid.y - near_lat) < 0.004]
    if not rows:
        raise SystemExit(f'sem correspondência: {src} / {name}')
    if src == 'places':
        rows.sort(key=lambda r: -(r.get('confidence') or 0))
    r = rows[0]
    g = wkb.loads(r['geometry'])
    if g.geom_type == 'Point':
        p = g
    elif g.geom_type in ('LineString', 'MultiLineString'):
        p = g.interpolate(0.5, normalized=True)
    else:
        p = g.representative_point()
    return r, p


mun = json.load(open(os.path.join(CAOP, 'municipalities.json')))['features']
serpa = shape([f for f in mun if f['properties']['name'] == 'Serpa'][0]['geometry']).buffer(0)
par = [f for f in json.load(open(os.path.join(CAOP, 'parishes.json')))['features']
       if serpa.contains(shape(f['geometry']).representative_point())]
SHORT = {
    'União das freguesias de Serpa (Salvador e Santa Maria)': 'Serpa (Salvador e Santa Maria)',
    'União das freguesias de Vila Nova de São Bento e Vale de Vargo': 'Vila Nova de São Bento e Vale de Vargo',
}
FREG = [(SHORT.get(f['properties']['name'], f['properties']['name']), shape(f['geometry']).buffer(0)) for f in par]

# povoação mais próxima (para dizer "em Pias", "perto de A-do-Pinto")
terr = json.load(open(os.path.join(ROOT, 'public', 'data', 'territory.json')))
SETTLE = [p for p in terr['places'] if p['inSerpa'] and p['rank'] <= 4]

ta = json.load(open(os.path.join(HERE, 'tripadvisor.json')))


def hav(a, b):
    R = 6371.0
    la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 2 * R * math.asin(math.sqrt(h))


# posições tiradas da morada (largo/praceta do OpenStreetMap), não do próprio edifício
APPROX = {'taberna-velhinha', 'tasca-da-praca', 'museu-vnsb'}

ta_index = {}
for lst in ('attractions', 'restaurants'):
    for item in ta.get(lst, []):
        ta_index[item['name']] = item

out = []
for cid, fam, sub, display, (src, *match), summary in CURATED:
    near = match[1] if len(match) > 1 else None
    row, p = locate(src, match[0], near)
    lat, lon = round(p.y, 6), round(p.x, 6)
    if not serpa.buffer(0.002).contains(Point(lon, lat)):
        print('fora do concelho:', cid, file=sys.stderr)
    freg = next((n for n, g in FREG if g.buffer(0.001).contains(Point(lon, lat))), None)
    near_place = min(SETTLE, key=lambda s: hav((lat, lon), (s['lat'], s['lon'])))
    d_place = hav((lat, lon), (near_place['lat'], near_place['lon']))
    item = {
        'id': cid, 'fam': fam, 'sub': sub, 'name': display, 'lat': lat, 'lon': lon,
        'summary': summary, 'freguesia': freg,
        'place': near_place['name'], 'placeKm': round(d_place, 1),
        'source': {'dataset': 'overture-places' if src == 'places' else 'osm', 'id': row['id']},
    }
    if src == 'places':
        web = (row.get('websites') or [None])[0]
        if web and not any(s in web for s in ('booking.com', 'maps.app', 'livroreclamacoes', 'cm-serpa.pt/artigos', '37.com')):
            item['web'] = web
    tname = TA_MATCH.get(cid)
    if tname:
        if tname not in ta_index:
            raise SystemExit(f'TripAdvisor sem item: {tname}')
        t = ta_index[tname]
        rk = re.findall(r'(\d+)', t.get('rank') or '')
        geo = (t.get('ta_geo') or '').split('(')[-1].rstrip(')') or None
        item['ta'] = {k: v for k, v in {
            'name': tname,
            'url': t.get('ta_url'),
            'rank': int(rk[0]) if len(rk) >= 2 and (t.get('rank') or '').lstrip().startswith(('#', 'N')) else None,
            'of': int(rk[1]) if len(rk) >= 2 and (t.get('rank') or '').lstrip().startswith(('#', 'N')) else None,
            'list': 'restaurantes' if fam == 'provar' and sub not in ('vinho', 'queijo', 'loja') else 'o que fazer',
            'geo': geo,
            'rating': t.get('rating'),
            'reviews': t.get('review_count'),
            'closed': True if 'CLOSED' in (t.get('notes') or '') else None,
        }.items() if v is not None}
        if cid in APPROX:
            item['approx'] = True
    elif cid in APPROX:
        item['approx'] = True
    out.append(item)

with open(os.path.join(ROOT, 'src', 'data', 'pois.json'), 'w') as fh:
    json.dump(out, fh, ensure_ascii=False, indent=1)
print(len(out), 'pontos;', sum(1 for o in out if 'ta' in o), 'com dados do TripAdvisor')
